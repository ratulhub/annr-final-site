// Admin authentication & session boundary.
// Uses Supabase Auth + server-side PostgreSQL RLS (`user_roles` + `has_permission()`) when
// Supabase is configured, and strict SHA-256 verification when invoked offline in tests.
import { ROLES, type Role } from "./permissions";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// Only a SHA-256 of "email:password" ships in the bundle, never a plaintext password.
const EXPECTED = "460e6ab9ee0bc8b560fff79423e933fb6a5873f77da9be0489273c0f4a3454cd"; // sha256("<demo email>:<demo password>")
export const DEMO_EMAIL = "arahimratul2004@gmail.com";
export const DEMO_ROLE: Role = "super_admin";

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;
export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const REAUTH_MS = 5 * 60 * 1000;

const SESSION_KEY = "shihiko-admin-session";
const LOCK_KEY = "shihiko-admin-lock";

export type Session = { email: string; role: Role; startedAt: number; lastSeen: number; reauthAt: number; id: string };
export type LockState = { fails: number; until: number };

const ROLE_PRIORITY: Record<Role, number> = {
  super_admin: 8,
  admin: 7,
  content_manager: 6,
  product_manager: 5,
  order_manager: 4,
  marketing_manager: 3,
  analytics_viewer: 2,
  support_agent: 1,
};

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function highestRole(roles: unknown[]): Role | null {
  let best: Role | null = null;
  for (const r of roles) {
    if (isValidRole(r)) {
      if (!best || ROLE_PRIORITY[r] > ROLE_PRIORITY[best]) best = r;
    }
  }
  return best;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Pure lockout logic (unit-tested).
export function registerFailure(s: LockState, now: number): LockState {
  const fails = s.until && now >= s.until ? 1 : s.fails + 1;
  return { fails, until: fails >= MAX_ATTEMPTS ? now + LOCK_MS : 0 };
}
export const isLocked = (s: LockState, now: number) => s.until > now;

export function sessionValid(s: any, now: number): boolean {
  if (!s || typeof s !== "object") return false;
  const startedAt = typeof s.startedAt === "number" ? s.startedAt : s.timestamp;
  const lastSeen = typeof s.lastSeen === "number" ? s.lastSeen : s.timestamp;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt) || startedAt < 0) return false;
  if (typeof lastSeen !== "number" || !Number.isFinite(lastSeen) || lastSeen < 0) return false;
  if (startedAt > now + 60_000 || lastSeen > now + 60_000) return false;
  const email = String(s.email || s.user?.email || "").trim();
  if (!email) return false;
  const rawRole = s.role ?? s.user?.role;
  if (!isValidRole(rawRole)) return false;
  return now - lastSeen < IDLE_MS && now - startedAt < ABSOLUTE_MS;
}

const read = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(sessionStorage.getItem(k) || localStorage.getItem(k) || "null") ?? d;
  } catch {
    return d;
  }
};

export function getLock(): LockState {
  return read<LockState>(LOCK_KEY, { fails: 0, until: 0 });
}

function saveSession(s: Session) {
  const serialized = JSON.stringify(s);
  sessionStorage.setItem(SESSION_KEY, serialized);
  localStorage.setItem(SESSION_KEY, serialized);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const s = read<any>(SESSION_KEY, null);
  if (!s) return null;
  const now = Date.now();
  if (!sessionValid(s, now)) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const email = String(s.email || s.user?.email || "").toLowerCase().trim();
  if (!email) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const rawRole = s.role ?? s.user?.role;
  if (!isValidRole(rawRole)) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return {
    email,
    role: rawRole,
    startedAt: typeof s.startedAt === "number" ? s.startedAt : (typeof s.timestamp === "number" ? s.timestamp : now),
    lastSeen: now,
    reauthAt: typeof s.reauthAt === "number" ? s.reauthAt : now,
    id: s.id || s.user?.id || ("admin-" + crypto.randomUUID()),
  };
}

export function touch() {
  const s = getSession();
  if (!s) return;
  saveSession({ ...s, lastSeen: Date.now() });
}

export type LoginResult = { ok: true } | { ok: false; error: string };
// One generic message so the form never reveals whether an account exists.
const GENERIC = "Wrong email or password";

export async function login(email: string, password: string, expectedHash = EXPECTED): Promise<LoginResult> {
  const now = Date.now();
  const lock = getLock();
  if (isLocked(lock, now)) {
    return { ok: false, error: `Too many attempts. Try again in ${Math.ceil((lock.until - now) / 60000)} min.` };
  }

  let e = email.trim().toLowerCase().slice(0, 254);
  if (!e || !password) {
    localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
    logAuthEvent("login_failed");
    return { ok: false, error: GENERIC };
  }

  // Only exact owner username resolves to the root owner email; no wildcards.
  if (e === "arahim") {
    e = DEMO_EMAIL;
  }

  // Optional local staff metadata lookup (exact email match only)
  let localAdminUser: { id?: string; name?: string; email?: string; role?: Role; passwordHash?: string } | null = null;
  try {
    const raw = localStorage.getItem("shihiko-admin-v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.admins)) {
        const found = parsed.admins.find(
          (a: any) => a && typeof a.email === "string" && a.email.toLowerCase().trim() === e,
        );
        if (found) localAdminUser = found;
      }
    }
  } catch {}

  const isExactOwner = e === DEMO_EMAIL;
  const usingCustomTestHash = expectedHash !== EXPECTED;

  // 1. Live database authentication with Supabase (unless unit test explicitly passed a custom hash)
  let supabaseOffline = false;
  if (!usingCustomTestHash && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password: password.slice(0, 200),
      });

      if (!error && data?.user) {
        let role: Role | null = isExactOwner ? "super_admin" : null;

        try {
          const { data: roleRows, error: roleErr } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .limit(10);

          if (!roleErr && Array.isArray(roleRows) && roleRows.length > 0) {
            const dbRole = highestRole(roleRows.map((r: any) => r?.role));
            if (dbRole) role = isExactOwner && ROLE_PRIORITY[dbRole] < ROLE_PRIORITY.super_admin ? "super_admin" : dbRole;
          } else if (roleErr && localAdminUser?.role && isValidRole(localAdminUser.role)) {
            role = localAdminUser.role;
          }

          if (isExactOwner && (!roleRows || !roleRows.some((r: any) => r?.role === "super_admin"))) {
            try {
              await supabase.from("user_roles").upsert(
                { user_id: data.user.id, role: "super_admin", granted_at: new Date().toISOString() },
                { onConflict: "user_id,role" },
              );
            } catch {}
          }
        } catch {
          if (!isExactOwner && localAdminUser?.role && isValidRole(localAdminUser.role)) {
            role = localAdminUser.role;
          }
        }

        // Deny admin session to authenticated regular VIP customers who hold no staff role
        if (!role) {
          try { await supabase.auth.signOut(); } catch {}
          localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
          logAuthEvent("login_denied_non_staff");
          return { ok: false, error: GENERIC };
        }

        localStorage.removeItem(LOCK_KEY);
        const s: Session = {
          email: e,
          role,
          startedAt: now,
          lastSeen: now,
          reauthAt: now,
          id: data.user.id,
        };
        saveSession(s);
        logAuthEvent("login_success");
        return { ok: true };
      }

      // Valid Supabase server explicitly rejected the credentials
      if (error && !/fetch|network|timeout/i.test(error.message || "")) {
        localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
        logAuthEvent("login_failed");
        return { ok: false, error: GENERIC };
      }
      supabaseOffline = true;
    } catch {
      supabaseOffline = true;
    }
  } else {
    supabaseOffline = true;
  }

  // 2. Cryptographic SHA-256 verification fallback (only when Supabase is offline/unconfigured or test hash provided)
  if (supabaseOffline || usingCustomTestHash) {
    const candidateHash = await sha256(`${e}:${password.slice(0, 200)}`);
    const matchesExpected = candidateHash === expectedHash && (isExactOwner || usingCustomTestHash);
    const matchesStaffHash = Boolean(localAdminUser?.passwordHash && candidateHash === localAdminUser.passwordHash);

    if (matchesExpected || matchesStaffHash) {
      const role: Role | null =
        localAdminUser?.role && isValidRole(localAdminUser.role)
          ? localAdminUser.role
          : isExactOwner || usingCustomTestHash
            ? "super_admin"
            : null;
      if (role) {
        localStorage.removeItem(LOCK_KEY);
        const s: Session = {
          email: e,
          role,
          startedAt: now,
          lastSeen: now,
          reauthAt: now,
          id: localAdminUser?.id || crypto.randomUUID(),
        };
        saveSession(s);
        logAuthEvent("login_success");
        return { ok: true };
      }
    }
  }

  localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
  logAuthEvent("login_failed");
  return { ok: false, error: GENERIC };
}

// Confirms the password again before sensitive actions (publish all, reset, import, role changes).
export async function reauthenticate(password: string, expectedHash = EXPECTED): Promise<boolean> {
  const s = getSession();
  if (!s || !password) return false;
  const usingCustomTestHash = expectedHash !== EXPECTED;

  if (!usingCustomTestHash && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: s.email,
        password: password.slice(0, 200),
      });
      if (!error && data?.user) {
        saveSession({ ...s, reauthAt: Date.now() });
        logAuthEvent("reauth_success");
        return true;
      }
      if (error && !/fetch|network|timeout/i.test(error.message || "")) {
        logAuthEvent("reauth_failed");
        return false;
      }
    } catch {
      // Network unreachable — fall through to SHA-256 check below
    }
  }

  const ok = (await sha256(`${s.email}:${password.slice(0, 200)}`)) === expectedHash;
  if (ok) saveSession({ ...s, reauthAt: Date.now() });
  logAuthEvent(ok ? "reauth_success" : "reauth_failed");
  return ok;
}

export const recentlyReauthed = () => {
  const s = getSession();
  return !!s && Date.now() - s.reauthAt < REAUTH_MS;
};

export async function confirmReauth(action = "continue"): Promise<boolean> {
  if (recentlyReauthed()) return true;
  if (typeof window === "undefined") return false;
  const pw = window.prompt(`Confirm your admin password to ${action}:`);
  if (!pw) return false;
  const ok = await reauthenticate(pw);
  if (!ok) window.alert("Wrong password. Action cancelled.");
  return ok;
}

export function logout() {
  if (isSupabaseConfigured()) {
    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}
  }
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  logAuthEvent("logout");
}

// Local auth history for the Security Center (demo only, NOT a tamper-proof audit trail).
const AUTH_LOG = "shihiko-auth-events";
export type AuthEvent = { at: string; event: string };
export function logAuthEvent(event: string) {
  try {
    const l: AuthEvent[] = JSON.parse(localStorage.getItem(AUTH_LOG) || "[]");
    l.push({ at: new Date().toISOString(), event });
    localStorage.setItem(AUTH_LOG, JSON.stringify(l.slice(-200)));
  } catch {
    /* ignore */
  }
}
export function authEvents(): AuthEvent[] {
  try {
    return JSON.parse(localStorage.getItem(AUTH_LOG) || "[]");
  } catch {
    return [];
  }
}
