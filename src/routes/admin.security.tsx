import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Card } from "../admin/ui";
import { getSession } from "../admin/store";
import { authEvents, IDLE_MS, ABSOLUTE_MS, MAX_ATTEMPTS, LOCK_MS, reauthenticate } from "../admin/security/auth";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "../admin/security/permissions";
import { backendStatus, leakedSecretInBrowserEnv } from "../lib/backend-status";

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

const HEADERS = ["x-content-type-options", "referrer-policy", "permissions-policy", "strict-transport-security", "content-security-policy", "content-security-policy-report-only"];

// Results of the dependency scan run during the security hardening (Oct 27 2026). Re-run to refresh.
const DEP_SCAN = { at: "2026-10-27", findings: [
  ["zod 3.25.76", "high", "Memory exhaustion on oversized collections — upgrade to zod 4.6.6 needs form code review"],
  ["js-yaml (via @tanstack/react-start)", "high", "CPU exhaustion — build-time only, fix waits on TanStack release"],
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
        <code> database/sql</code> once Lovable Cloud / your database is connected. Full report: <code>docs/security-report.md</code>.
      </p>

      <Card title="Security overview">
        <Table>
          <Row name="Admin sign-in" s="demo" why="Test login in this browser only. Password is not stored in plain text, 5 wrong tries lock for 15 min, but anything in the browser can be bypassed. Needs real accounts (Lovable Cloud Auth)." />
          <Row name="Database connection" s={backend === "not_connected" ? "disconnected" : "unchecked"} why={backend === "not_connected" ? "No database connected. All admin data is in this browser only." : "Keys are set but the connection and policies have not been verified."} />
          <Row name="Secret keys in browser code" s={leaked.length ? "fail" : "pass"} why={leaked.length ? `Remove now: ${leaked.join(", ")}` : "No secret/service keys found in the browser settings of this build."} />
          <Row name="Database rules (RLS)" s="disconnected" why="SQL is written (database/sql/01..07) but not run. Run it, then run database/tests/rls_verification.sql to verify." />
        </Table>
      </Card>

      <Card title="Authentication & MFA">
        <Table>
          <Row name="Your session" s="demo" why={session ? `${session.email} · role ${session.role} · started ${new Date(session.startedAt).toLocaleString()}` : "—"} />
          <Row name="Session expiry" s="demo" why={`Signs out after ${IDLE_MS / 60000} min idle or ${ABSOLUTE_MS / 3600000} h total.`} />
          <Row name="Brute-force lockout" s="demo" why={`${MAX_ATTEMPTS} failed tries → locked ${LOCK_MS / 60000} min (this browser only; a real limit must be on the server).`} />
          <Row name="Multi-factor (MFA)" s="disconnected" why="Not available without real accounts. Turn on authenticator-app MFA for every admin after connecting Auth." />
          <Row name="Password reset" s="disconnected" why="Needs real accounts with email verification." />
        </Table>
        <div className="adm-row" style={{ marginTop: 12 }}>
          <input type="password" placeholder="Confirm your password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ maxWidth: 240 }} aria-label="Confirm password" />
          <button className="adm-btn sm" onClick={async () => { setReauth((await reauthenticate(pw)) ? "Confirmed for 5 minutes" : "Wrong password"); setPw(""); }}>Re-confirm identity</button>
          <span className="adm-hint">{reauth}</span>
        </div>
      </Card>

      <Card title="Roles & permissions (read-only reference)">
        <p className="adm-hint">Same list the database enforces (public.role_permissions). Only a super admin can grant roles, and nobody can change their own.</p>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Permission</th>{ROLES.map((r) => <th key={r} style={{ fontSize: 9 }}>{r.replace("_", " ")}</th>)}</tr></thead>
          <tbody>{PERMISSIONS.map((p) => <tr key={p}><td>{p}</td>{ROLES.map((r) => <td key={r} style={{ textAlign: "center" }}>{ROLE_PERMISSIONS[r].includes(p) ? "●" : ""}</td>)}</tr>)}</tbody></table></div>
      </Card>

      <Card title="Recent sign-in activity (this browser)">
        {events.length ? <table><tbody>{events.map((e, i) => <tr key={i}><td>{new Date(e.at).toLocaleString()}</td><td>{e.event}</td></tr>)}</tbody></table> : <p className="adm-hint">No events yet.</p>}
        <p className="adm-hint" style={{ marginTop: 8 }}><Badge s="demo" /> Stored in this browser, can be erased. Not a tamper-proof audit trail — production uses the security.audit_log table, writable only by the server.</p>
      </Card>

      <Card title="Storage, headers & deployment">
        <Table>
          <Row name="Upload checks (admin)" s="demo" why="Only JPG/PNG/WebP/GIF/AVIF, real file type checked from bytes, max 400 KB / 6000 px, SVG blocked. Repeat on the server when storage is connected." />
          <Row name="Storage bucket rules" s="disconnected" why="Written in database/sql/07_storage.sql, not yet run." />
          {HEADERS.slice(0, 4).map((k) => <Row key={k} name={k} s={h(k)} why={hdr?.[k] ?? "Not sent on this environment. Check again on the published site."} />)}
          <Row name="Content-Security-Policy" s={hdr === null ? "unchecked" : hdr["content-security-policy"] ? "pass" : hdr["content-security-policy-report-only"] ? "unchecked" : "fail"} why={hdr?.["content-security-policy"] ? "Enforced" : hdr?.["content-security-policy-report-only"] ? "Report-only mode: watching, not blocking yet." : "Not sent here. Prepared in public/_headers; verify on the published site."} />
          <Row name="Open-redirect fix" s={redirect} why="Clean page links can no longer send visitors to another website." />
        </Table>
      </Card>

      <Card title="Dependencies & vulnerabilities">
        <p className="adm-hint">Scan of {DEP_SCAN.at}. <Badge s="fail" /> means a known issue is still present.</p>
        <table><tbody>{DEP_SCAN.findings.map(([p, sev, note]) => <tr key={p}><td>{p}</td><td><Badge s="fail" /> {sev}</td><td>{note}</td></tr>)}</tbody></table>
      </Card>

      <Card title="Errors, incidents & future integrations">
        <Table>
          <Row name="Error monitoring" s="disconnected" why="Store errors are counted in this browser only (Analytics → Errors). Connect an error-monitoring service for real alerts." />
          <Row name="Server rate limiting" s="disconnected" why="Login, forms, checkout and uploads need server-side limits once the backend exists." />
          <Row name="Payments" s="disconnected" why="Checkout runs on Shopify. No card data ever touches this site." />
        </Table>
      </Card>
    </>
  );
}
