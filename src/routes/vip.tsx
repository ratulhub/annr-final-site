import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { registerVipMember, requestVipWithdrawal, type VipMember } from "../lib/loyalty";
import { BD_DISTRICTS_BY_DIVISION, BD_DIVISIONS, isValidBdPhone } from "../lib/bangladesh-geo";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getSession as getAdminSession } from "../admin/security/auth";

type AuthMode = "login" | "signup";
const PENDING_SIGNUP_KEY = "annr-vip-pending-signup";
const VIP_SESSION_KEY = "annr_vip_member_session";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "AnnR VIP" },
      { name: "description", content: "AnnR VIP membership, referral rewards, and wallet." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VipPage,
});

type SignupForm = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  division: string;
  district: string;
  fullAddress: string;
  referredBy: string;
};

const emptySignup: SignupForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  division: "Dhaka",
  district: "Dhaka",
  fullAddress: "",
  referredBy: "",
};

function VipPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [member, setMember] = useState<VipMember | null>(null);
  const [signup, setSignup] = useState<SignupForm>(emptySignup);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [withdrawPoints, setWithdrawPoints] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  const referralLink = useMemo(() => {
    if (!member || typeof window === "undefined") return "";
    return `${window.location.origin}/account/register/index.html?ref=${encodeURIComponent(member.referral_code)}`;
  }, [member]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let isAdm = Boolean(getAdminSession());
      if (!isAdm) {
        const vip = localStorage.getItem(VIP_SESSION_KEY);
        if (vip) {
          const v = JSON.parse(vip);
          const em = (v?.member?.email || "").toLowerCase().trim();
          if (em === "arahimratul2004@gmail.com") isAdm = true;
        }
      }
      if (isAdm) {
        window.location.replace("/admin");
        return;
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const m = params.get("mode");
    if (ref && /^[A-Za-z0-9_-]{3,24}$/.test(ref)) {
      try {
        localStorage.setItem("annr_active_ref_code", ref.toUpperCase());
        localStorage.setItem("annr_cart_coupon", ref.toUpperCase());
      } catch {}
    }
    const targetPath =
      ref || m === "signup" || m === "register"
        ? `/account/register/index.html${window.location.search}`
        : `/account/login/index.html${window.location.search}`;
    window.location.replace(targetPath);
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await finishVipProfile(data.session.user.email || "");
          return;
        }
      }
      const raw =
        localStorage.getItem(VIP_SESSION_KEY) || localStorage.getItem("annr-vip-wallet-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.member) setMember(parsed.member);
        else if (parsed?.email) setMember(parsed);
      }
    } catch {
      setError("Your VIP session could not be restored. Please sign in again.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    if (requestedMode === "signup" || requestedMode === "login") setMode(requestedMode);
    const ref = params.get("ref")?.trim().toUpperCase();
    if (ref) setSignup((current) => ({ ...current, referredBy: ref }));

    void restoreSession();
  }, [restoreSession]);

  async function finishVipProfile(email: string, profile?: SignupForm) {
    const pending = profile || JSON.parse(sessionStorage.getItem(PENDING_SIGNUP_KEY) || "null");
    if (!pending) {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");
      const { data, error: loadError } = await supabase
        .from("vip_members")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (loadError) throw loadError;
      if (data) setMember(data as VipMember);
      return;
    }
    const result = await registerVipMember({
      fullName: pending.fullName,
      email: pending.email || email,
      phone: pending.phone,
      division: pending.division,
      district: pending.district,
      fullAddress: pending.fullAddress,
      referredBy: pending.referredBy || undefined,
    });
    if (!result.ok || !result.member)
      throw new Error(result.error || "Could not create your VIP profile");
    setMember(result.member);
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
    setMessage("Welcome to AnnR VIP. Your referral wallet is ready.");
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!isSupabaseConfigured()) throw new Error("VIP login is temporarily unavailable.");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (authError || !data.session)
        throw authError || new Error("Login did not create a session");
      await finishVipProfile(data.user.email || loginEmail.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (
      !signup.fullName.trim() ||
      !signup.email.includes("@") ||
      signup.password.length < 8 ||
      !isValidBdPhone(signup.phone) ||
      !signup.fullAddress.trim()
    ) {
      setError(
        "Enter a name, valid email, password (8+ characters), Bangladeshi phone, and address.",
      );
      setBusy(false);
      return;
    }
    try {
      if (!isSupabaseConfigured()) throw new Error("VIP signup is temporarily unavailable.");
      sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(signup));
      const { data, error: authError } = await supabase.auth.signUp({
        email: signup.email.trim(),
        password: signup.password,
      });
      if (authError) throw authError;
      if (data.session) {
        await finishVipProfile(signup.email, signup);
      } else {
        setMessage(
          "Check your email to confirm your account, then use the direct returning-member access link below.",
        );
      }
    } catch (reason) {
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      setError(reason instanceof Error ? reason.message : "Unable to create your account");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (isSupabaseConfigured()) await supabase.auth.signOut();
    localStorage.removeItem(VIP_SESSION_KEY);
    setMember(null);
    setMode("signup");
    setMessage("You have been signed out.");
  }

  async function copyReferralLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleWithdraw(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const points = Number(withdrawPoints);
    if (!Number.isInteger(points) || points <= 0 || !withdrawAccount.trim()) {
      setError("Enter a whole number of points and a payout account.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestVipWithdrawal({
        pointsAmount: points,
        payoutMethod: "bkash",
        accountNumber: withdrawAccount.trim(),
      });
      if (!result.ok) throw new Error(result.error || "Withdrawal request failed");
      setMessage(`Withdrawal request submitted for ৳${result.moneyAmountBdt?.toLocaleString()}.`);
      setWithdrawPoints("");
      setWithdrawAccount("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Withdrawal request failed");
    } finally {
      setBusy(false);
    }
  }

  if (member) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                AnnR VIP
              </p>
              <h1 className="text-3xl font-bold">Welcome, {member.full_name}</h1>
            </div>
            <div className="flex gap-2">
              <Link to="/" className="rounded border px-3 py-2 text-sm">
                Store
              </Link>
              <button onClick={handleLogout} className="rounded border px-3 py-2 text-sm">
                Sign out
              </button>
            </div>
          </div>
          {message && (
            <p
              role="status"
              className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-sm"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm"
            >
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Tier", member.tier],
              ["Available points", member.available_points.toLocaleString()],
              ["Pending points", member.pending_points.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <section className="mt-6 rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">Your referral coupon</p>
            <p className="mt-1 font-mono text-2xl font-bold">{member.referral_code}</p>
            <p className="mt-2 break-all text-sm text-muted-foreground">{referralLink}</p>
            <button
              onClick={copyReferralLink}
              className="mt-4 rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {copied ? "Copied" : "Copy signup link"}
            </button>
          </section>
          <section className="mt-6 rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Request payout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Available after the configured minimum and delivery confirmation.
            </p>
            <form onSubmit={handleWithdraw} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                aria-label="Points to withdraw"
                inputMode="numeric"
                placeholder="Points"
                value={withdrawPoints}
                onChange={(e) => setWithdrawPoints(e.target.value)}
                className="rounded border bg-background px-3 py-2"
              />
              <input
                aria-label="bKash account"
                placeholder="bKash account"
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                className="rounded border bg-background px-3 py-2"
              />
              <button
                disabled={busy}
                className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Submitting..." : "Request payout"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <Link to="/" className="text-sm text-muted-foreground">
            ← Back to AnnR store
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            AnnR VIP
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {mode === "login" ? "Sign in to your wallet" : "Join AnnR VIP"}
          </h1>
        </div>
        {message && (
          <p
            role="status"
            className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-sm"
          >
            {message}
            {message.includes("direct returning-member") && (
              <>
                {" "}
                <a className="underline" href="/vip?mode=login">
                  Open returning-member access
                </a>
              </>
            )}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm"
          >
            {error}
          </p>
        )}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="grid gap-4 rounded-lg border p-5">
            <input
              required
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="rounded border bg-background px-3 py-2"
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="rounded border bg-background px-3 py-2"
            />
            <button
              disabled={busy}
              className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="grid gap-4 rounded-lg border p-5">
            <input
              required
              placeholder="Full name"
              value={signup.fullName}
              onChange={(e) => setSignup({ ...signup, fullName: e.target.value })}
              className="rounded border bg-background px-3 py-2"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={signup.email}
              onChange={(e) => setSignup({ ...signup, email: e.target.value })}
              className="rounded border bg-background px-3 py-2"
            />
            <input
              required
              minLength={8}
              type="password"
              placeholder="Password (8+ characters)"
              value={signup.password}
              onChange={(e) => setSignup({ ...signup, password: e.target.value })}
              className="rounded border bg-background px-3 py-2"
            />
            <input
              required
              placeholder="Phone (017XXXXXXXX)"
              value={signup.phone}
              onChange={(e) => setSignup({ ...signup, phone: e.target.value })}
              className="rounded border bg-background px-3 py-2"
            />
            <select
              value={signup.division}
              onChange={(e) =>
                setSignup({
                  ...signup,
                  division: e.target.value,
                  district:
                    BD_DISTRICTS_BY_DIVISION[
                      e.target.value as keyof typeof BD_DISTRICTS_BY_DIVISION
                    ][0] || "",
                })
              }
              className="rounded border bg-background px-3 py-2"
            >
              {BD_DIVISIONS.map((division) => (
                <option key={division}>{division}</option>
              ))}
            </select>
            <select
              value={signup.district}
              onChange={(e) => setSignup({ ...signup, district: e.target.value })}
              className="rounded border bg-background px-3 py-2"
            >
              {(
                BD_DISTRICTS_BY_DIVISION[
                  signup.division as keyof typeof BD_DISTRICTS_BY_DIVISION
                ] || []
              ).map((district) => (
                <option key={district}>{district}</option>
              ))}
            </select>
            <textarea
              required
              placeholder="Full address"
              value={signup.fullAddress}
              onChange={(e) => setSignup({ ...signup, fullAddress: e.target.value })}
              className="min-h-24 rounded border bg-background px-3 py-2"
            />
            <input
              placeholder="Referral code (auto-filled from link)"
              value={signup.referredBy}
              onChange={(e) => setSignup({ ...signup, referredBy: e.target.value.toUpperCase() })}
              className="rounded border bg-background px-3 py-2 font-mono"
            />
            <button
              disabled={busy}
              className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Creating account..." : "Create VIP account"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
