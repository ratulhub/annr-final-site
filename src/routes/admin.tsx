import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import adminCss from "../admin/admin.css?url";
import { isLoggedIn, login, logout, getSession } from "../admin/store";
import { logAuthEvent, touch } from "../admin/security/auth";
import { can, permissionForPath } from "../admin/security/permissions";
import { useAdmin } from "../admin/store";
import { NAV_GROUPS } from "../admin/config/navigation";
import { publish } from "../admin/store";
import { useDirty } from "./admin.publish";

const FONTS = ["Druk-Wide", "NB-Architekt", "FKGroteskSemiMono"].map((f) => ({ rel: "stylesheet", href: `/cdn/shop/t/75/assets/${f}.css` }));

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "AnnR Admin" },
      { name: "description", content: "AnnR store admin panel." },
      { property: "og:title", content: "AnnR Admin" },
      { property: "og:description", content: "AnnR store admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      ...FONTS,
      { rel: "stylesheet", href: adminCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState("");
  const path = useLocation({ select: (l) => l.pathname });
  useEffect(() => { setAuthed(isLoggedIn()); setCollapsed(localStorage.getItem("shihiko-admin-collapsed") === "1"); setReady(true); }, []);
  useEffect(() => setMobile(false), [path]);
  // Idle / absolute session expiry: re-check every 30s and on activity.
  useEffect(() => {
    if (!authed) return;
    const tick = () => { if (!isLoggedIn()) setAuthed(false); };
    const act = () => touch();
    const id = setInterval(tick, 30000);
    window.addEventListener("pointerdown", act); window.addEventListener("keydown", act);
    return () => { clearInterval(id); window.removeEventListener("pointerdown", act); window.removeEventListener("keydown", act); };
  }, [authed]);
  if (!ready) return <div className="adm" />;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const toggle = () => { localStorage.setItem("shihiko-admin-collapsed", collapsed ? "0" : "1"); setCollapsed(!collapsed); };
  const crumbs = findCrumbs(path);
  const query = q.trim().toLowerCase();
  return (
    <div className={`adm${collapsed ? " collapsed" : ""}${mobile ? " mobile-open" : ""}`}>
      <aside className="adm-side">
        <div className="adm-logo">AnnR<small>Admin Panel</small></div>
        <input className="adm-navsearch" placeholder="Search menu…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search menu" />
        <nav className="adm-nav">
          {NAV_GROUPS.map((g) => {
            const items = g.items.filter((i) => !query || i.label.toLowerCase().includes(query) || g.group.toLowerCase().includes(query));
            if (!items.length) return null;
            return (
              <div key={g.group} className="adm-group">
                <div className="adm-group-title">{g.group}</div>
                {items.map((i) => i.report ? <Link key={i.label} to="/admin/analytics/$report" params={{ report: i.report }} activeProps={{ className: "active" }}>{i.label}</Link> : i.module
                  ? <Link key={i.label} to="/admin/m/$module" params={{ module: i.module }} activeProps={{ className: "active" }}>{i.label}{i.soon && <em>{i.soon}</em>}</Link>
                  : <Link key={i.to} to={i.to!} activeOptions={{ exact: i.to === "/admin" }} activeProps={{ className: "active" }}>{i.label}</Link>)}
              </div>
            );
          })}
          <div className="adm-group">
            <a href="/home.html" target="_blank" rel="noreferrer">View Store ↗</a>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); setAuthed(false); }}>Log out</a>
            <a href="https://ratul.site" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.7, fontSize: 10 }}>created by Ratul ↗</a>
          </div>
        </nav>
      </aside>
      <div className="adm-body">
        <header className="adm-header">
          <button className="adm-icon desk" onClick={toggle} aria-label="Collapse sidebar">☰</button>
          <button className="adm-icon mob" onClick={() => setMobile(!mobile)} aria-label="Open menu">☰</button>
          <div className="adm-crumbs"><Link to="/admin">Admin</Link>{crumbs.map((c) => <span key={c}> / {c}</span>)}</div>
          <div className="adm-header-right">
            <span className="adm-tag">Demo · this browser only</span>
            <PublishButton />
            <Notifications />
            <AccountMenu onLogout={() => { logout(); setAuthed(false); }} />
          </div>
        </header>
        <main className="adm-main">{(() => { const need = permissionForPath(path); return need && !can(getSession()?.role, need) ? <Denied perm={need} /> : <Outlet />; })()}</main>
      </div>
      {mobile && <div className="adm-scrim" onClick={() => setMobile(false)} />}
    </div>
  );
}

function findCrumbs(path: string): string[] {
  for (const g of NAV_GROUPS) for (const i of g.items) {
    const to = i.report ? `/admin/analytics/${i.report}` : i.module ? `/admin/m/${i.module}` : i.to!;
    if (to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(to)) {
      const extra = path.startsWith("/admin/products/") ? ["Edit product"] : [];
      return to === "/admin" ? [] : [g.group, i.label, ...extra];
    }
  }
  return [];
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm">
      <div className="adm-login">
        <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await login(email, password); setBusy(false); setPassword(""); if (r.ok) onDone(); else setErr(r.error); }}>
          <div className="adm-logo" style={{ padding: 0, color: "#000" }}>AnnR<small>Admin Login</small></div>
          <label className="adm-field"><span>Email</span><input type="email" autoComplete="username" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="adm-field"><span>Password</span><input type="password" autoComplete="current-password" maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {err && <div className="adm-err" role="alert">{err}</div>}
          <button className="adm-btn" type="submit" disabled={busy}>Log in</button>
          <p style={{ fontSize: 10, marginTop: 12, opacity: .6 }}>Test login (demo, this browser only). Not for real customer data. · created by <a href="https://ratul.site" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>Ratul</a></p>
        </form>
      </div>
    </div>
  );
}

function Denied({ perm }: { perm: string }) {
  return <div className="adm-card"><h2>Permission denied</h2><p>Your role does not include “{perm}”. Ask a super admin for access.</p><Link to="/admin" className="link">Back to dashboard</Link></div>;
}

function PublishButton() {
  const dirty = useDirty();
  const mayPublish = can(getSession()?.role, "site.publish");
  return <span className="adm-row" style={{ gap: 6 }}>
    <Link to="/admin/publish" className="link">{dirty ? "Unpublished changes" : "All published"}</Link>
    <button className="adm-btn sm" disabled={!dirty || !mayPublish} onClick={() => { if (!mayPublish) return; publish(); logAuthEvent("site_publish"); }}>Publish</button>
  </span>;
}

function Dropdown({ label, aria, children, plain }: { label: ReactNode; aria: string; children: ReactNode; plain?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = useLocation({ select: (l) => l.pathname });
  useEffect(() => setOpen(false), [path]);
  return <span style={{ position: "relative" }}>
    <button className={plain ? "adm-btn ghost sm" : "adm-icon"} aria-label={aria} aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>
    {open && <><div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
      <div className="adm-card" style={{ position: "absolute", right: 0, top: "110%", zIndex: 41, width: 280, margin: 0, padding: 12 }}>{children}</div></>}
  </span>;
}

function Notifications() {
  const s = useAdmin();
  const dirty = useDirty();
  const low = s.products.filter((p) => p.variants.some((v) => v.stock <= 2)).length;
  const items: { text: string; to: string }[] = [];
  if (dirty) items.push({ text: "You have unpublished changes", to: "/admin/publish" });
  if (s.site.technical.maintenance) items.push({ text: "Maintenance mode is ON — the store is hidden", to: "/admin/settings" });
  if (low) items.push({ text: `${low} product(s) low on stock`, to: "/admin/products" });
  items.push({ text: "Analytics: not connected (demo data)", to: "/admin/analytics/settings" });
  return <Dropdown aria="Notifications" label={<>{items.length}</>}>
    <b style={{ display: "block", marginBottom: 8 }}>Notifications</b>
    {items.map((i) => <a key={i.text} href={i.to} className="link" style={{ display: "block", padding: "6px 0" }}>{i.text}</a>)}
    <a href="/admin/activity" className="link" style={{ display: "block", paddingTop: 8 }}>Recent activity →</a>
  </Dropdown>;
}

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  return <Dropdown plain aria="Account menu" label={<>Account ▾</>}>
    <div className="adm-hint" style={{ marginBottom: 8 }}>{getSession()?.email} · {getSession()?.role} (test login)</div>
    <Link to="/admin/users" className="link" style={{ display: "block", padding: "6px 0" }}>Users & permissions</Link>
    <Link to="/admin/settings" className="link" style={{ display: "block", padding: "6px 0" }}>Settings</Link>
    <a href="/home.html" target="_blank" rel="noreferrer" className="link" style={{ display: "block", padding: "6px 0" }}>View store ↗</a>
    <button className="adm-btn ghost sm" style={{ marginTop: 8 }} onClick={onLogout}>Log out</button>
  </Dropdown>;
}
