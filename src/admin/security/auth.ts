// DEMO admin sign-in (no backend yet). This is NOT production security: anything in the browser can be
// bypassed. It exists so the panel can be tested. Production must use Lovable Cloud / Supabase Auth with MFA,
// and the database (RLS + has_permission) must enforce every rule. See docs/security-remediation-plan.md.
import type { Role } from "./permissions";

// Only a SHA-256 of "email:password" ships in the bundle, never the plaintext password.
const EXPECTED = "460e6ab9ee0bc8b560fff79423e933fb6a5873f77da9be0489273c0f4a3454cd"; // sha256("<demo email>:<demo password>")
export const DEMO_EMAIL = "ratul123@gmail.com";
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

export function sessionValid(s: Session | null, now: number): boolean {
  return !!s && now - s.lastSeen < IDLE_MS && now - s.startedAt < ABSOLUTE_MS;
}

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(sessionStorage.getItem(k) || localStorage.getItem(k) || "null") ?? d; } catch { return d; } };

export function getLock(): LockState { return read<LockState>(LOCK_KEY, { fails: 0, until: 0 }); }

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const s = read<Session | null>(SESSION_KEY, null);
  if (!sessionValid(s, Date.now())) { sessionStorage.removeItem(SESSION_KEY); return null; }
  return s;
}
export function touch() {
  const s = getSession(); if (!s) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
}

export type LoginResult = { ok: true } | { ok: false; error: string };
// One generic message so the form never reveals whether an account exists.
const GENERIC = "Wrong email or password";

export async function login(email: string, password: string, expectedHash = EXPECTED): Promise<LoginResult> {
  const now = Date.now();
  const lock = getLock();
  if (isLocked(lock, now)) return { ok: false, error: `Too many attempts. Try again in ${Math.ceil((lock.until - now) / 60000)} min.` };
  const e = email.trim().toLowerCase().slice(0, 254);
  const ok = (await sha256(`${e}:${password.slice(0, 200)}`)) === expectedHash;
  if (!ok) {
    localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
    logAuthEvent("login_failed");
    return { ok: false, error: GENERIC };
  }
  localStorage.removeItem(LOCK_KEY);
  const s: Session = { email: e, role: DEMO_ROLE, startedAt: now, lastSeen: now, reauthAt: now, id: crypto.randomUUID() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  logAuthEvent("login_success");
  return { ok: true };
}

// Confirms the password again before sensitive actions (publish all, reset, import, role changes).
export async function reauthenticate(password: string, expectedHash = EXPECTED): Promise<boolean> {
  const s = getSession(); if (!s) return false;
  const ok = (await sha256(`${s.email}:${password}`)) === expectedHash;
  if (ok) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, reauthAt: Date.now() }));
  logAuthEvent(ok ? "reauth_success" : "reauth_failed");
  return ok;
}
export const recentlyReauthed = () => { const s = getSession(); return !!s && Date.now() - s.reauthAt < REAUTH_MS; };

export async function confirmReauth(action = "continue"): Promise<boolean> {
  if (recentlyReauthed()) return true;
  if (typeof window === "undefined") return false;
  const pw = window.prompt(`Confirm your admin password to ${action}:`);
  if (!pw) return false;
  const ok = await reauthenticate(pw);
  if (!ok) window.alert("Wrong password. Action cancelled.");
  return ok;
}

export function logout() { sessionStorage.removeItem(SESSION_KEY); logAuthEvent("logout"); }

// Local auth history for the Security Center (demo only, NOT a tamper-proof audit trail).
const AUTH_LOG = "shihiko-auth-events";
export type AuthEvent = { at: string; event: string };
export function logAuthEvent(event: string) {
  try { const l: AuthEvent[] = JSON.parse(localStorage.getItem(AUTH_LOG) || "[]"); l.push({ at: new Date().toISOString(), event }); localStorage.setItem(AUTH_LOG, JSON.stringify(l.slice(-200))); } catch { /* ignore */ }
}
export function authEvents(): AuthEvent[] { try { return JSON.parse(localStorage.getItem(AUTH_LOG) || "[]"); } catch { return []; } }

