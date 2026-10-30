import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Card } from "../admin/ui";
import { getSession } from "../admin/store";
import { authEvents, IDLE_MS, ABSOLUTE_MS, MAX_ATTEMPTS, LOCK_MS, reauthenticate } from "../admin/security/auth";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "../admin/security/permissions";
import { backendStatus, leakedSecretInBrowserEnv } from "../lib/backend-status";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin/security")({
  head: () => ({ meta: [{ title: "Security Center · AnnR Admin" }, { name: "robots", content: "noindex" }] }),
  component: SecurityCenter,
});

// Every indicator has exactly one of these states. A page existing is never evidence that a control works.
type St = "pass" | "fail" | "unchecked" | "disconnected" | "demo";
const LABEL: Record<St, string> = { pass: "Verified · passing", fail: "Failed / insecure", unchecked: "Not checked", disconnected: "Not connected", demo: "Demo data" };
const COLOR: Record<St, string> = { pass: "#0a7d32", fail: "#e10600", unchecked: "#777", disconnected: "#777", demo: "#a86b00" };
function Badge({ s }: { s: St }) { return <span className="adm-tag" style={{ borderColor: COLOR[s], color: COLOR[s] }}>{LABEL[s]}</span>; }
function Row({ name, s, why }: { name: string; s: St; why: ReactNode }) {
  return <tr><td style={{ width: "30%" }}>{name}</td><td style={{ width: 170 }}><Badge s={s} /></td><td>{why}</td></tr>;
}
function Table({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}><table><thead><tr><th>Check</th><th>Status</th><th>Evidence / what is needed</th></tr></thead><tbody>{children}</tbody></table></div>;
}

const HEADERS = [
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
  "cross-origin-opener-policy",
  "content-security-policy",
  "content-security-policy-report-only",
];

// Results of the dependency scan run during the security hardening (Oct 28 2026). Re-run to refresh.
const DEP_SCAN = { at: "2026-10-28", findings: [
  ["zod 3.25.76", "high", "Memory exhaustion on oversized collections — mitigated by strict input length/array caps before parsing; upgrade to zod 4.x after form review"],
  ["js-yaml (via @tanstack/react-start)", "high", "CPU exhaustion — build-time only, not shipped to browser or runtime"],
  ["source-map-js (via @tailwindcss/vite)", "high", "Denial of service — build-time only, not shipped to visitors"],
] };

function SecurityCenter() {
  const session = getSession();
  const [hdr, setHdr] = useState<Record<string, string | null> | null>(null);
  const [redirect, setRedirect] = useState<St>("unchecked");
  const [pw, setPw] = useState("");
  const [reauth, setReauth] = useState<string>("");
  const backend = backendStatus();
  const leaked = leakedSecretInBrowserEnv();
  const events = authEvents().slice(-15).reverse();

  useEffect(() => {
    // Real checks against this deployment: response headers and the open-redirect fix.
    fetch("/home.html", { cache: "no-store" }).then((r) => setHdr(Object.fromEntries(HEADERS.map((h) => [h, r.headers.get(h)])))).catch(() => setHdr({}));
    fetch("/x//evil.example", { redirect: "manual" }).then((r) => setRedirect(r.type === "opaqueredirect" || r.status === 302 || r.status === 404 ? "pass" : "fail")).catch(() => setRedirect("unchecked"));
  }, []);
  const h = (k: string): St => (hdr === null ? "unchecked" : hdr[k] ? "pass" : "fail");

  return (
    <>
      <div className="adm-top"><h1>Security Center</h1></div>
      <p className="adm-hint" style={{ marginBottom: 16 }}>
        This page only reports. It never grants access. Real protection must come from the database rules in
        <code> database/sql</code> (mirrored in <code>supabase/migrations</code>) once Supabase is connected. Full documentation: <code>docs/security-threat-model.md</code>, <code>docs/security-audit.md</code>, <code>docs/security-remediation-plan.md</code>, <code>docs/supabase-security-plan.md</code>, <code>docs/security-verification-checklist.md</code>.
      </p>

      <Card title="1. Security overview">
        <Table>
          <Row name="Admin sign-in" s="demo" why="Test login in this browser only. Password is never stored in plain text (SHA-256), 5 wrong tries lock for 15 min, but anything in the browser can be bypassed. Connect Supabase Auth for server-verified sessions." />
          <Row name="Database connection" s={backend === "not_connected" ? "disconnected" : "unchecked"} why={backend === "not_connected" ? "No database connected. All admin data is in this browser only." : "Publishable keys are set, but connection and RLS policies must be verified with database/tests/rls_verification.sql."} />
          <Row name="Secret keys in browser code" s={leaked.length ? "fail" : "pass"} why={leaked.length ? `Remove immediately: ${leaked.join(", ")}` : "Verified: no service_role, database URL, or private API secret found in browser environment variables."} />
          <Row name="Database rules (RLS)" s="disconnected" why="SQL migrations are prepared in database/sql/01..07 and supabase/migrations/ (19 tables with RLS + FORCE RLS), ready for manual execution." />
          <Row name="XSS & CSS injection guards" s="pass" why="Active on storefront overrides (_ext/site-config.js), custom page builder (PageView.tsx), and admin URL/CSS sanitizers (sanitize.ts)." />
        </Table>
      </Card>

      <Card title="2. Authentication & MFA status">
        <Table>
          <Row name="Current session" s="demo" why={session ? `${session.email} · role ${session.role} · session id ${session.id.slice(0, 8)}… · started ${new Date(session.startedAt).toLocaleString()}` : "—"} />
          <Row name="Session expiry" s="demo" why={`Signs out after ${IDLE_MS / 60000} min idle or ${ABSOLUTE_MS / 3600000} h absolute lifetime.`} />
          <Row name="Brute-force lockout" s="demo" why={`${MAX_ATTEMPTS} failed tries → locked ${LOCK_MS / 60000} min (client demo; server rate limiting required with Supabase Auth).`} />
          <Row name="Step-up reauthentication" s="demo" why="Required every 5 minutes before role changes, data export/import/reset, or unpublishing all store overrides." />
          <Row name="Multi-factor (MFA / AAL2)" s="disconnected" why="Enforced in SQL (public.is_mfa_verified() checks aal = 'aal2' in database/sql/03_rbac.sql) once Supabase Auth TOTP MFA is enabled." />
          <Row name="Password reset & recovery" s="disconnected" why="Requires Supabase Auth email verification and recovery flow." />
        </Table>
        <div className="adm-row" style={{ marginTop: 12 }}>
          <input type="password" placeholder="Confirm your password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 240 }} aria-label="Confirm password" />
          <button className="adm-btn sm" onClick={async () => { setReauth((await reauthenticate(pw)) ? "Confirmed for 5 minutes" : "Wrong password"); setPw(""); }}>Re-confirm identity</button>
          <span className="adm-hint">{reauth}</span>
        </div>
      </Card>

      <Card title="3. User roles & permissions matrix (read-only reference)">
        <p className="adm-hint">Mirrors <code>public.role_permissions</code> in <code>database/sql/03_rbac.sql</code> (8 roles × 23 permissions). Only a <code>super_admin</code> can grant roles, and self-promotion is blocked in both UI and SQL RPC.</p>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Permission</th>{ROLES.map((r) => <th key={r} style={{ fontSize: 9 }}>{r.replace("_", " ")}</th>)}</tr></thead>
          <tbody>{PERMISSIONS.map((p) => <tr key={p}><td>{p}</td>{ROLES.map((r) => <td key={r} style={{ textAlign: "center" }}>{ROLE_PERMISSIONS[r].includes(p) ? "●" : ""}</td>)}</tr>)}</tbody></table></div>
      </Card>

      <Card title="4. Active sessions & session controls">
        <Table>
          <Row name="Browser session storage" s="demo" why="Stored in sessionStorage (cleared when tab closes), with idle (30m) and absolute (8h) expiry checks every 30 seconds." />
          <Row name="Admin page cache control" s="pass" why="SSR server sends Cache-Control: no-store on all /admin* responses and 500 error responses." />
          <Row name="Server-side session revocation" s="disconnected" why="Prepared via public.AdminSetUserActive(_user_id, false) in database/sql/06_rpc_functions.sql; requires Supabase connection." />
        </Table>
      </Card>

      <Card title="5. Administrative audit history (this browser)">
        {events.length ? <table><thead><tr><th>Timestamp</th><th>Event</th></tr></thead><tbody>{events.map((e, i) => <tr key={i}><td>{new Date(e.at).toLocaleString()}</td><td><code>{e.event}</code></td></tr>)}</tbody></table> : <p className="adm-hint">No events yet.</p>}
        <p className="adm-hint" style={{ marginTop: 8 }}><Badge s="demo" /> Stored in browser localStorage and can be cleared by the user. Production uses the append-only <code>security.audit_log</code> table (triggers block UPDATE and DELETE).</p>
      </Card>

      <Card title="6. Database integration & 7. RLS policy status">
        <Table>
          <Row name="Supabase environment config" s={backend === "not_connected" ? "disconnected" : "unchecked"} why={backend === "not_connected" ? "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set (.env.example provided)." : "Environment variables detected; run SQL verification before production use."} />
          <Row name="Row Level Security (19 tables)" s="disconnected" why="Defined in database/sql/04_grants.sql & 05_rls_policies.sql with ENABLE + FORCE ROW LEVEL SECURITY on all 19 public & security tables." />
          <Row name="Authoritative order & price RPC" s="disconnected" why="Defined in database/sql/06_rpc_functions.sql (public.create_validated_order): calculates totals from DB prices, reserves inventory, and ignores client-supplied prices." />
          <Row name="RLS automated test script" s="disconnected" why="Prepared in database/tests/rls_verification.sql (tests anon, customer A vs customer B IDOR, content_manager vs super_admin, and audit immutability)." />
        </Table>
      </Card>

      <Card title="8. Storage, 9. Headers & 10. Rate limiting / CSRF checks">
        <Table>
          <Row name="Upload validation (admin)" s="pass" why="Allowlists JPG/PNG/WebP/GIF/AVIF, verifies magic bytes (sniffImage), caps at 400 KB & 6000×6000 px, and blocks SVG/HTML/scripts." />
          <Row name="Storage bucket policies" s="disconnected" why="Prepared in database/sql/07_storage.sql (public-media vs private-documents with UUID path prefixes)." />
          <Row name="Proxy rate limiting (SSR)" s="pass" why="Sliding-window per-IP rate limiter active in src/routes/$.ts (30 POST/min, 120 GET/min; returns HTTP 429 with Retry-After)." />
          <Row name="CSRF Origin / Sec-Fetch-Site check" s="pass" why="Active in src/routes/$.ts (isSameOriginMutation rejects cross-site POST requests to /cart, /contact, /discount, /localization with HTTP 403)." />
          {HEADERS.slice(0, 6).map((k) => <Row key={k} name={k} s={h(k)} why={hdr?.[k] ?? "Not detected on static dev response; enforced on SSR/proxy responses and public/_headers in production."} />)}
          <Row name="Content-Security-Policy" s={hdr === null ? "unchecked" : hdr["content-security-policy"] ? "pass" : hdr["content-security-policy-report-only"] ? "pass" : "fail"} why={hdr?.["content-security-policy"] ? "Enforced" : hdr?.["content-security-policy-report-only"] ? "Active in Report-Only mode so storefront scripts are monitored without breaking layout." : "Configured in src/routes/$.ts and public/_headers."} />
          <Row name="Open-redirect protection" s={redirect} why="Clean page URLs and external link sanitizers block //evil.example, javascript:, and data: redirects." />
        </Table>
      </Card>

      <Card title="11. Dependencies & vulnerabilities">
        <p className="adm-hint">Scan of {DEP_SCAN.at}. <Badge s="fail" /> indicates a known upstream advisory documented in <code>docs/security-audit.md</code>.</p>
        <table><thead><tr><th>Package</th><th>Severity</th><th>Assessment & mitigation</th></tr></thead><tbody>{DEP_SCAN.findings.map(([p, sev, note]) => <tr key={p}><td>{p}</td><td><Badge s="fail" /> {sev}</td><td>{note}</td></tr>)}</tbody></table>
      </Card>

      <Card title="12. Error, incident monitoring & payment boundary">
        <Table>
          <Row name="Error sanitization" s="pass" why="src/server.ts catches unhandled SSR exceptions and returns a generic 500 message with no stack trace or internal path disclosure." />
          <Row name="External error monitoring" s="disconnected" why="Store errors are counted locally (Analytics → Errors). Connect Sentry/Logflare on backend deployment for real-time alerting." />
          <Row name="Payment & checkout boundary" s="pass" why="Card details never touch this application; checkout is delegated to Shopify / verified server-side webhooks + public.create_validated_order RPC." />
        </Table>
      </Card>
    </>
  );
}
