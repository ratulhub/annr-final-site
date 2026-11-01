import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, type ReactNode } from "react";
import adminCss from "../admin/admin.css?url";
import { isLoggedIn, login, logout, getSession } from "../admin/store";
import { logAuthEvent, touch } from "../admin/security/auth";
import { can, permissionForPath } from "../admin/security/permissions";
import { useAdmin } from "../admin/store";
import { NAV_GROUPS, type NavGroup } from "../admin/config/navigation";
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

function GroupIcon({ iconKey }: { iconKey: NavGroup["iconKey"] }) {
  switch (iconKey) {
    case "overview":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <rect x="3" y="3" width="6" height="6" rx="1.5" />
          <rect x="11" y="3" width="6" height="6" rx="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" />
          <rect x="11" y="11" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "orders":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <path d="M6 2 3 6v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="17" y2="6" />
          <path d="M14 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "products":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <path d="M18.5 11.5 10 20l-8-8 8.5-8.5H19v8.5z" />
          <circle cx="15.5" cy="6.5" r="1.5" />
        </svg>
      );
    case "marketing":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <polygon points="10 2 12.5 7.5 18 8.3 14 12.2 15 18 10 15.2 5 18 6 12.2 2 8.3 7.5 7.5 10 2" />
        </svg>
      );
    case "store":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <rect x="2" y="3" width="16" height="11" rx="2" />
          <line x1="6" y1="18" x2="14" y2="18" />
          <line x1="10" y1="14" x2="10" y2="18" />
        </svg>
      );
    case "content":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <circle cx="7.5" cy="7.5" r="1.5" />
          <path d="m17 13-4-4-7 7" />
        </svg>
      );
    case "analytics":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <line x1="16" y1="18" x2="16" y2="8" />
          <line x1="10" y1="18" x2="10" y2="4" />
          <line x1="4" y1="18" x2="4" y2="12" />
        </svg>
      );
    case "settings":
      return (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
          <circle cx="10" cy="10" r="3" />
          <path d="M16.5 13a1 1 0 0 0 .2 1.1l1 1a1.5 1.5 0 0 1-2.1 2.1l-1-1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v1.5a1.5 1.5 0 0 1-3 0v-1.5a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-1 1a1.5 1.5 0 0 1-2.1-2.1l1-1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3.5a1.5 1.5 0 0 1 0-3H5a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-1-1a1.5 1.5 0 0 1 2.1-2.1l1 1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3.5a1.5 1.5 0 0 1 3 0V5a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l1-1a1.5 1.5 0 0 1 2.1 2.1l-1 1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h1.5a1.5 1.5 0 0 1 0 3H16.5a1 1 0 0 0-.9.6z" />
        </svg>
      );
  }
}

function GlobalSearch() {
  const s = useAdmin();
  const [open, setOpen] = useState(false);
  const [mobSearchOpen, setMobSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mobInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setMobSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = term.trim().toLowerCase();
  const matchedProducts = q ? s.products.filter(p => p.title.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedOrders = q ? s.orders.filter(o => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)).slice(0, 3) : [];
  const matchedCustomers = q ? s.customers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 3) : [];
  const matchedPages = q ? [
    { label: "Dashboard", to: "/admin" },
    { label: "Products", to: "/admin/products" },
    { label: "Orders", to: "/admin/orders" },
    { label: "Customers", to: "/admin/customers" },
    { label: "Collections", to: "/admin/collections" },
    { label: "Discounts & Coupons", to: "/admin/discounts" },
    { label: "Campaigns & Events", to: "/admin/events" },
    { label: "VIP Loyalty & Ball Drop", to: "/admin/loyalty" },
    { label: "Theme & Design", to: "/admin/theme" },
    { label: "Page Sections", to: "/admin/sections" },
    { label: "Website Pages", to: "/admin/website" },
    { label: "Media Library", to: "/admin/media" },
    { label: "Forms & Inquiries", to: "/admin/forms" },
    { label: "SEO & Discoverability", to: "/admin/seo" },
    { label: "Store Settings", to: "/admin/settings" },
    { label: "Security Center", to: "/admin/security" },
  ].filter(p => p.label.toLowerCase().includes(q)).slice(0, 5) : [];

  const hasResults = matchedProducts.length > 0 || matchedOrders.length > 0 || matchedCustomers.length > 0 || matchedPages.length > 0;

  const renderDropdown = () => (
    <div
      className="adm-card adm-search-results-panel"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        right: 0,
        zIndex: 110,
        padding: 8,
        maxHeight: 380,
        overflowY: "auto",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
        margin: 0,
      }}
    >
      {!hasResults ? (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--p-text-subdued)", fontSize: 13 }}>
          No results found for “{term}”
        </div>
      ) : (
        <>
          {matchedPages.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--p-text-subdued)", padding: "4px 8px", textTransform: "uppercase" }}>Pages & Tools</div>
              {matchedPages.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  onClick={() => { setOpen(false); setMobSearchOpen(false); setTerm(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 6, textDecoration: "none", color: "var(--p-text)", fontSize: 13 }}
                >
                  <span style={{ color: "var(--p-interactive)" }}>→</span>
                  <b>{p.label}</b>
                </Link>
              ))}
            </div>
          )}
          {matchedProducts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--p-text-subdued)", padding: "4px 8px", textTransform: "uppercase" }}>Products</div>
              {matchedProducts.map((p) => (
                <Link
                  key={p.handle}
                  to="/admin/products/$handle"
                  params={{ handle: p.handle }}
                  onClick={() => { setOpen(false); setMobSearchOpen(false); setTerm(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 6, textDecoration: "none", color: "var(--p-text)", fontSize: 13 }}
                >
                  {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />}
                  <span style={{ flex: 1 }}>{p.title}</span>
                  <span className={`adm-tag ${p.status === "active" ? "active" : "draft"}`} style={{ fontSize: 10 }}>{p.status}</span>
                </Link>
              ))}
            </div>
          )}
          {matchedOrders.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--p-text-subdued)", padding: "4px 8px", textTransform: "uppercase" }}>Orders</div>
              {matchedOrders.map((o) => (
                <Link
                  key={o.id}
                  to="/admin/orders"
                  onClick={() => { setOpen(false); setMobSearchOpen(false); setTerm(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 6, textDecoration: "none", color: "var(--p-text)", fontSize: 13 }}
                >
                  <b>{o.id}</b>
                  <span style={{ flex: 1 }}>{o.customer}</span>
                  <span>{o.total}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Search Trigger Icon */}
      <button
        type="button"
        className="adm-icon mob adm-mob-search-btn"
        onClick={() => {
          setMobSearchOpen(true);
          setTimeout(() => mobInputRef.current?.focus(), 60);
        }}
        aria-label="Search admin panel"
        title="Search (Ctrl+K)"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="6" />
          <line x1="15" y1="15" x2="19" y2="19" />
        </svg>
      </button>

      {/* Mobile Search Full-Width Overlay */}
      {mobSearchOpen && (
        <div className="adm-mob-search-overlay">
          <div className="adm-mob-search-bar">
            <button
              type="button"
              className="adm-icon"
              onClick={() => { setMobSearchOpen(false); setTerm(""); }}
              aria-label="Close search"
            >
              ←
            </button>
            <div className="adm-mob-search-field">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#6d7175" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="6" />
                <line x1="15" y1="15" x2="19" y2="19" />
              </svg>
              <input
                ref={mobInputRef}
                type="text"
                placeholder="Search products, orders, pages…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  style={{ background: "none", border: "none", color: "#6d7175", fontSize: 13, padding: "0 6px", cursor: "pointer" }}
                  aria-label="Clear query"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {q && (
            <div style={{ position: "relative", width: "100%", padding: "0 10px" }}>
              <div style={{ position: "fixed", inset: 0, top: 52, zIndex: 105 }} onClick={() => setMobSearchOpen(false)} />
              {renderDropdown()}
            </div>
          )}
        </div>
      )}

      {/* Desktop Search Bar */}
      <div className="adm-desk-search" style={{ position: "relative", flex: "1 1 280px", maxWidth: 440, minWidth: 180 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f1f2f4",
            border: "1px solid #d2d5d8",
            borderRadius: 8,
            padding: "5px 12px",
            cursor: "text",
          }}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#6d7175" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="6" />
            <line x1="15" y1="15" x2="19" y2="19" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            name="annr_search_control_palette"
            id="annr_search_control_palette"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            placeholder="Search products, orders, pages… (Ctrl+K)"
            value={term}
            onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 13,
              color: "var(--p-text)",
              width: "100%",
              padding: 0,
              margin: 0,
            }}
          />
          {term ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTerm(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6d7175", fontSize: 12, padding: "0 2px" }}
              title="Clear search"
            >
              ✕
            </button>
          ) : (
            <kbd style={{ fontSize: 11, background: "#ffffff", border: "1px solid #d2d5d8", borderRadius: 4, padding: "1px 5px", color: "#6d7175", fontFamily: "inherit" }}>
              ⌘K
            </kbd>
          )}
        </div>

        {open && q && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
            {renderDropdown()}
          </>
        )}
      </div>
    </>
  );
}

function AdminLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(isLoggedIn());
    setCollapsed(localStorage.getItem("shihiko-admin-collapsed") === "1");
    setReady(true);
  }, []);

  useEffect(() => {
    setMobile(false);
  }, [path]);

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

  const toggle = () => {
    localStorage.setItem("shihiko-admin-collapsed", collapsed ? "0" : "1");
    setCollapsed(!collapsed);
  };
  const crumbs = findCrumbs(path);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/admin" });
    }
  };

  return (
    <div className={`adm${collapsed ? " collapsed" : ""}${mobile ? " mobile-open" : ""}`}>
      <aside className="adm-side">
        <div className="adm-side-top">
          <div className="adm-logo">
            AnnR
            <small>Admin Panel</small>
          </div>
          <button
            type="button"
            className="adm-side-close mob"
            onClick={() => setMobile(false)}
            aria-label="Close sidebar menu"
          >
            ✕
          </button>
        </div>

        {path !== "/admin" && path !== "/admin/" && (
          <div style={{ margin: "0 10px 12px" }}>
            <button
              type="button"
              className="adm-btn ghost sm"
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 10px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                background: "#262626",
                border: "1px solid #3d3d3d",
                color: "#ffffff",
                borderRadius: 6,
              }}
              onClick={() => {
                setMobile(false);
                handleBack();
              }}
              title="Go back to previous page"
            >
              ← Back
            </button>
          </div>
        )}

        <nav
          className="adm-nav"
          onClick={(e) => {
            const el = (e.target as HTMLElement).closest("a, button");
            if (el) setMobile(false);
          }}
        >
          {NAV_GROUPS.map((g) => (
            <div key={g.group} className="adm-group">
              <div className="adm-group-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GroupIcon iconKey={g.iconKey} />
                <span>{g.group}</span>
              </div>
              {g.items.map((i) => {
                const badgeElement = i.badge ? (
                  <span className="adm-tag" style={{ fontSize: 10, padding: "1px 6px" }}>
                    {i.badge}
                  </span>
                ) : null;

                if (i.report) {
                  return (
                    <Link key={i.label} to="/admin/analytics/$report" params={{ report: i.report }} activeProps={{ className: "active" }}>
                      <span>{i.label}</span>
                      {badgeElement}
                    </Link>
                  );
                }
                if (i.module) {
                  return (
                    <Link key={i.label} to="/admin/m/$module" params={{ module: i.module }} activeProps={{ className: "active" }}>
                      <span>{i.label}{i.soon && <em>{i.soon}</em>}</span>
                      {badgeElement}
                    </Link>
                  );
                }
                return (
                  <Link key={i.to} to={i.to!} activeOptions={{ exact: i.to === "/admin" }} activeProps={{ className: "active" }}>
                    <span>{i.label}</span>
                    {badgeElement}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="adm-group" style={{ borderTop: "1px solid #2d2d2d", paddingTop: 12, marginTop: 12 }}>
            <a href="/home.html" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#4ade80", fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
              <span>Online Store ↗</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); setAuthed(false); }}>
              Log out
            </a>
            <div style={{ padding: "8px 12px 0", fontSize: 11, color: "#8c9196" }}>
              <a href="https://ratul.site" target="_blank" rel="noopener noreferrer" style={{ padding: 0, margin: 0, fontSize: 11, color: "#9ca3af" }}>
                created by Ratul ↗
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <div className="adm-body">
        <header className="adm-header">
          <button className="adm-icon desk" onClick={toggle} aria-label="Collapse sidebar">☰</button>
          <button className="adm-icon mob" onClick={() => setMobile(!mobile)} aria-label="Open menu">☰</button>
          {path !== "/admin" && path !== "/admin/" && (
            <button
              type="button"
              className="adm-btn ghost sm adm-back-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
              onClick={handleBack}
              title="Go back to previous page"
            >
              ← <span className="adm-back-label">Back</span>
            </button>
          )}

          <div className="adm-crumbs">
            <span className="adm-mob-title">
              {crumbs.length ? crumbs[crumbs.length - 1]?.label : "Dashboard"}
            </span>
            <div className="adm-desk-crumbs">
              <Link to="/admin" style={{ fontWeight: 600, color: "var(--p-text)" }}>Admin</Link>
              {crumbs.map((c, idx) => (
                <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ opacity: 0.4 }}>/</span>
                  {c.to ? <Link to={c.to} style={{ textDecoration: "none" }}>{c.label}</Link> : <span style={{ fontWeight: 600, color: "var(--p-text)" }}>{c.label}</span>}
                </span>
              ))}
            </div>
          </div>

          <GlobalSearch />

          <div className="adm-header-right">
            <a
              href="/home.html"
              target="_blank"
              rel="noreferrer"
              className="adm-tag active adm-live-link"
              style={{ textDecoration: "none", cursor: "pointer", fontWeight: 600, gap: 6 }}
              title="View the live AnnR store in a new tab"
            >
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#008060" }} />
              Online Store ↗
            </a>
            <PublishButton />
            <Notifications />
            <AccountMenu onLogout={() => { logout(); setAuthed(false); }} />
          </div>
        </header>

        <main className="adm-main">
          {(() => {
            const need = permissionForPath(path);
            return need && !can(getSession()?.role, need) ? <Denied perm={need} /> : <Outlet />;
          })()}
        </main>
      </div>
      {mobile && <div className="adm-scrim" onClick={() => setMobile(false)} />}
    </div>
  );
}

type Crumb = { label: string; to?: string };

function findCrumbs(path: string): Crumb[] {
  if (path === "/admin" || path === "/admin/") return [];

  if (path.startsWith("/admin/products/")) {
    return [
      { label: "Store", to: "/admin/products" },
      { label: "Products", to: "/admin/products" },
      { label: "Edit Product" },
    ];
  }
  if (path.startsWith("/admin/website/")) {
    return [
      { label: "Website & Pages", to: "/admin/website" },
      { label: "Website Pages", to: "/admin/website" },
      { label: "Block Editor" },
    ];
  }
  if (path.startsWith("/admin/analytics/")) {
    const reportId = path.split("/").pop();
    return [
      { label: "Analytics", to: "/admin/analytics/overview" },
      { label: reportId ? reportId.toUpperCase() : "Report" },
    ];
  }

  for (const g of NAV_GROUPS) {
    for (const i of g.items) {
      const to = i.report ? `/admin/analytics/${i.report}` : i.module ? `/admin/m/${i.module}` : i.to!;
      if (to === path) {
        return [{ label: g.group }, { label: i.label, to }];
      }
    }
  }

  for (const g of NAV_GROUPS) {
    for (const i of g.items) {
      const to = i.report ? `/admin/analytics/${i.report}` : i.module ? `/admin/m/${i.module}` : i.to!;
      if (to !== "/admin" && path.startsWith(to)) {
        return [{ label: g.group }, { label: i.label, to }];
      }
    }
  }

  const slug = path.replace("/admin/", "").replace(/[-_]/g, " ");
  return [{ label: slug.charAt(0).toUpperCase() + slug.slice(1) }];
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
  return (
    <span className="adm-row adm-publish-wrap" style={{ gap: 6 }}>
      <Link to="/admin/publish" className="link adm-publish-link">
        {dirty ? "Unpublished changes" : "All published"}
      </Link>
      <button
        className={`adm-btn sm adm-publish-btn ${dirty ? "primary" : "ghost"}`}
        disabled={!dirty || !mayPublish}
        onClick={() => {
          if (!mayPublish) return;
          publish();
          logAuthEvent("site_publish");
        }}
        title={dirty ? "Unpublished changes pending - click to publish" : "Live storefront is up to date"}
      >
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dirty ? "#f59e0b" : "#10b981",
            marginRight: 4,
          }}
        />
        <span>Publish</span>
      </button>
    </span>
  );
}

function Dropdown({ label, aria, children, plain }: { label: ReactNode; aria: string; children: ReactNode; plain?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = useLocation({ select: (l) => l.pathname });
  useEffect(() => setOpen(false), [path]);
  return (
    <span style={{ position: "relative" }}>
      <button
        className={plain ? "adm-btn ghost sm" : "adm-icon"}
        aria-label={aria}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 120 }} onClick={() => setOpen(false)} />
          <div
            className="adm-card adm-dropdown-menu"
            style={{
              position: "absolute",
              right: 0,
              top: "115%",
              zIndex: 121,
              width: 280,
              maxWidth: "calc(100vw - 24px)",
              margin: 0,
              padding: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            {children}
          </div>
        </>
      )}
    </span>
  );
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
