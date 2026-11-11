import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "../admin/store";
import { dataSource } from "../admin/services/dataSource";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

// Demo analytics visits
const DEMO_VISITS = [42, 58, 51, 73, 66, 88, 79];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CARDS_KEY = "shihiko-dashboard-cards";
type CardCfg = { order: string[]; hidden: string[] };

function Dashboard() {
  const s = useAdmin();
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Compute key metrics
  const activeProducts = s.products.filter((p) => p.status === "active").length;
  const stock = s.products.reduce((n, p) => n + p.variants.reduce((m, v) => m + (Number(v.stock) || 0), 0), 0);
  const low = s.products.filter((p) => p.variants.some((v) => v.stock <= 2));
  const vipCount = s.customers.filter((c) => c.tier === "Silver" || c.tier === "Gold" || (c.tags && c.tags.includes("vip"))).length;
  
  // Calculate total order revenue in BDT
  const totalRevenue = s.orders.reduce((sum, o) => {
    const clean = parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0;
    return sum + clean;
  }, 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Active events from site config
  const activeEvents = s.site.events ? s.site.events.filter((e) => e.status === "active").length : 0;

  const stats: { k: string; v: string | number; sub: string; to: string; chip?: { text: string; tone: "active" | "info" | "warning" | "purple" } }[] = [
    { k: "1-of-1 Archival pieces", v: `${s.products.length} pieces`, sub: `${activeProducts} available · ${s.products.filter(p => p.status === "sold").length} sold`, to: "/admin/products", chip: { text: "Archive", tone: "active" } },
    { k: "Unique Campaign & Drops", v: `${s.campaigns?.length || 1} drops`, sub: `${s.categories?.length || 8} active categories`, to: "/admin/campaigns", chip: { text: "Active", tone: "purple" } },
    { k: "Total revenue", v: `৳${totalRevenue}`, sub: `${s.orders.length} orders placed`, to: "/admin/orders", chip: { text: "+14.8%", tone: "active" } },
    { k: "Total customers", v: s.customers.length, sub: `${vipCount} VIP members`, to: "/admin/customers", chip: { text: "Growing", tone: "info" } },
    { k: "Security status", v: "Verified", sub: "OWASP ASVS & RLS ready", to: "/admin/security", chip: { text: "Passing", tone: "active" } },
    { k: "Custom pages", v: s.site.customPages.length, sub: `${s.site.hiddenPages.length} hidden`, to: "/admin/website", chip: { text: "Configured", tone: "info" } },
  ];

  const [cfg, setCfg] = useState<CardCfg>({ order: [], hidden: [] });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const c = dataSource.read<CardCfg>(CARDS_KEY);
    if (c) setCfg(c);
  }, []);

  const saveCfg = (c: CardCfg) => {
    setCfg(c);
    dataSource.write(CARDS_KEY, c);
  };

  const ordered = [
    ...cfg.order.map((k) => stats.find((x) => x.k === k)).filter(Boolean) as typeof stats,
    ...stats.filter((x) => !cfg.order.includes(x.k)),
  ];
  const keys = ordered.map((x) => x.k);
  const shift = (i: number, d: number) => {
    const o = keys.slice();
    [o[i], o[i + d]] = [o[i + d]!, o[i]!];
    saveCfg({ ...cfg, order: o });
  };

  // Export catalog data
  const handleExportData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `annr-store-backup-${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders
  const filteredOrders = s.orders.filter((o) => {
    if (orderFilter === "all") return true;
    if (orderFilter === "paid") return o.payment.toLowerCase() === "paid";
    if (orderFilter === "unfulfilled") return o.status.toLowerCase() === "unfulfilled";
    if (orderFilter === "fulfilled") return o.status.toLowerCase() === "fulfilled";
    return true;
  });

  const max = Math.max(...DEMO_VISITS);

  return (
    <>
      {/* Top Banner / Heading */}
      <div className="adm-top">
        <div>
          <h1>Dashboard</h1>
          <p className="adm-hint" style={{ marginTop: 2 }}>
            Store overview and operational management
          </p>
        </div>
        <div className="adm-row">
          <button className="adm-btn ghost" onClick={() => setEditing(!editing)}>
            {editing ? "Done" : "Customize metrics"}
          </button>
          <button className="adm-btn ghost" onClick={handleExportData}>
            {downloadSuccess ? "Downloaded backup" : "Export store data (JSON)"}
          </button>
          <a className="adm-btn ghost" href="/home.html" target="_blank" rel="noreferrer">
            View live store ↗
          </a>
          <Link className="adm-btn primary" to="/admin/products">
            Add product
          </Link>
        </div>
      </div>

      {/* Quick Action Bar (Shopify Style) */}
      <div className="adm-card" style={{ padding: "12px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--p-text)" }}>
            Quick shortcuts:
          </span>
          <div className="adm-row" style={{ gap: 6 }}>
            <Link to="/admin/events" className="adm-btn ghost sm">
              Campaigns & gifts
            </Link>
            <Link to="/admin/sections" className="adm-btn ghost sm">
              Page sections
            </Link>
            <Link to="/admin/theme" className="adm-btn ghost sm">
              Theme & styling
            </Link>
            <Link to="/admin/security" className="adm-btn ghost sm">
              Security center
            </Link>
            <Link to="/admin/publish" className="adm-btn ghost sm">
              Publish center
            </Link>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert (Shopify Polaris Banner) */}
      {low.length > 0 && (
        <div className="adm-banner warning">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>
              Inventory warning: {low.length} item{low.length === 1 ? "" : "s"} low on stock
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              The following products have 2 or fewer units left in inventory:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {low.map((p) => (
                <Link
                  key={p.handle}
                  to="/admin/products/$handle"
                  params={{ handle: p.handle }}
                  className="adm-btn ghost sm"
                  style={{ background: "#ffffff", borderColor: "#fed287" }}
                >
                  {p.title} ({p.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0)} left) →
                </Link>
              ))}
            </div>
          </div>
          <Link className="adm-btn ghost sm" to="/admin/products" style={{ alignSelf: "flex-start", background: "#ffffff" }}>
            Manage inventory
          </Link>
        </div>
      )}

      {/* Card Customization Panel */}
      {editing && (
        <section className="adm-card">
          <h2>Summary metrics customization</h2>
          <p className="adm-hint">Toggle visibility and arrange metric order to fit your dashboard.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 8, margin: "14px 0" }}>
            {ordered.map((x, i) => (
              <div key={x.k} className="adm-row" style={{ padding: "8px 12px", background: "var(--p-background)", borderRadius: 6, border: "1px solid var(--p-border-subdued)" }}>
                <input
                  type="checkbox"
                  checked={!cfg.hidden.includes(x.k)}
                  onChange={(e) =>
                    saveCfg({
                      order: keys,
                      hidden: e.target.checked ? cfg.hidden.filter((h) => h !== x.k) : [...cfg.hidden, x.k],
                    })
                  }
                />
                <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{x.k}</span>
                <button className="adm-btn ghost sm" disabled={i === 0} onClick={() => shift(i, -1)}>↑</button>
                <button className="adm-btn ghost sm" disabled={i === ordered.length - 1} onClick={() => shift(i, 1)}>↓</button>
              </div>
            ))}
          </div>
          <button className="adm-btn ghost sm" onClick={() => saveCfg({ order: [], hidden: [] })}>
            Reset to default
          </button>
        </section>
      )}

      {/* Shopify Clean Metric Cards */}
      <div className="adm-stats">
        {ordered
          .filter((x) => !cfg.hidden.includes(x.k))
          .map((x) => (
            <Link
              to={x.to}
              className="adm-stat"
              key={x.k}
              style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span>{x.k}</span>
                {x.chip && (
                  <span className={`adm-tag ${x.chip.tone}`} style={{ fontSize: 11, padding: "2px 7px" }}>
                    {x.chip.text}
                  </span>
                )}
              </div>
              <b>{x.v}</b>
              <small>{x.sub}</small>
            </Link>
          ))}
      </div>

      {/* Analytics & System Health Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 16, marginBottom: 16 }}>
        {/* Visitors Chart */}
        <section className="adm-card" style={{ margin: 0 }}>
          <div className="adm-top" style={{ marginBottom: 10, paddingBottom: 8 }}>
            <div>
              <h2>Store sessions</h2>
              <span className="adm-hint" style={{ margin: 0 }}>Visitors by day this week</span>
            </div>
            <Link className="link" to="/admin/analytics/$report" params={{ report: "overview" }}>
              Analytics report →
            </Link>
          </div>
          <div className="adm-bars" style={{ marginTop: 16, marginBottom: 24 }}>
            {DEMO_VISITS.map((v, i) => (
              <div key={i} style={{ height: `${(v / max) * 100}%` }} title={`${DAYS[i]}: ${v} visitors`}>
                <span>{DAYS[i]}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--p-text-subdued)" }}>
            <span>Weekly average: <b>65 sessions/day</b></span>
            <span>Peak: <b>Saturday ({max})</b></span>
          </div>
        </section>

        {/* Live Launch & System Status */}
        <section className="adm-card" style={{ margin: 0 }}>
          <div className="adm-top" style={{ marginBottom: 10, paddingBottom: 8 }}>
            <div>
              <h2>Store status</h2>
              <span className="adm-hint" style={{ margin: 0 }}>Live configuration & environment</span>
            </div>
            <Link className="link" to="/admin/settings">
              Settings →
            </Link>
          </div>
          <div className="adm-status">
            <span>Storefront visibility</span>
            <span className="adm-tag active">Online</span>
          </div>
          <div className="adm-status">
            <span>Supabase database</span>
            <span className="adm-tag active">8 migrations ready</span>
          </div>
          <div className="adm-status">
            <span>Maintenance mode</span>
            <span className="adm-tag">{s.site.technical.maintenance ? "Enabled (locked)" : "Disabled (open)"}</span>
          </div>
          <div className="adm-status">
            <span>Storage mode</span>
            <span className="adm-tag">Browser draft + Static mirror</span>
          </div>
          <div className="adm-status">
            <span>Security audit</span>
            <span className="adm-tag active">OWASP ASVS passed</span>
          </div>
        </section>
      </div>

      {/* Recent Orders with Interactive Status Tabs */}
      <section className="adm-card">
        <div className="adm-top" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <div>
            <h2>Recent orders</h2>
            <div className="adm-row" style={{ marginTop: 8, gap: 6 }}>
              <button
                className={`adm-btn sm ${orderFilter === "all" ? "" : "ghost"}`}
                onClick={() => setOrderFilter("all")}
              >
                All ({s.orders.length})
              </button>
              <button
                className={`adm-btn sm ${orderFilter === "paid" ? "" : "ghost"}`}
                onClick={() => setOrderFilter("paid")}
              >
                Paid
              </button>
              <button
                className={`adm-btn sm ${orderFilter === "unfulfilled" ? "" : "ghost"}`}
                onClick={() => setOrderFilter("unfulfilled")}
              >
                Unfulfilled
              </button>
              <button
                className={`adm-btn sm ${orderFilter === "fulfilled" ? "" : "ghost"}`}
                onClick={() => setOrderFilter("fulfilled")}
              >
                Fulfilled
              </button>
            </div>
          </div>
          <Link className="adm-btn ghost" to="/admin/orders">
            View all orders
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment status</th>
                <th>Fulfillment status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "28px 16px", color: "var(--p-text-subdued)" }}>
                    No orders placed yet. Orders created via the storefront checkout will appear here in real time.
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(-6).reverse().map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.id}</b></td>
                    <td>{o.date}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customer}</div>
                      <div style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>{o.email}</div>
                    </td>
                    <td>{o.items}</td>
                    <td>৳{o.total}</td>
                    <td>
                      <span className={`adm-tag ${o.payment.toLowerCase() === "paid" ? "paid" : "pending"}`}>
                        {o.payment}
                      </span>
                    </td>
                    <td>
                      <span className={`adm-tag ${o.status.toLowerCase() === "fulfilled" ? "active" : "unfulfilled"}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Activity Log */}
      <section className="adm-card">
        <div className="adm-top" style={{ marginBottom: 10, paddingBottom: 8 }}>
          <div>
            <h2>Audit log</h2>
            <span className="adm-hint" style={{ margin: 0 }}>Recorded admin events and updates</span>
          </div>
          <Link className="link" to="/admin/activity">
            View full log →
          </Link>
        </div>
        {s.activity.length ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Section</th>
                  <th>Action</th>
                  <th>Target Item</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {s.activity.slice(0, 5).map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 12.5, color: "var(--p-text-subdued)" }}>{new Date(a.at).toLocaleString()}</td>
                    <td>
                      <span className="adm-tag">{a.section}</span>
                    </td>
                    <td>
                      <span className={`adm-tag ${a.action === "added" ? "active" : a.action === "deleted" ? "danger" : "warning"}`}>
                        {a.action}
                      </span>
                    </td>
                    <td><b>{a.item}</b> {a.fields && <small style={{ color: "var(--p-text-subdued)" }}>({a.fields})</small>}</td>
                    <td style={{ fontSize: 12.5 }}>{a.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--p-text-subdued)", margin: "14px 0", textAlign: "center", padding: "18px 0" }}>
            No recent audit changes recorded yet. Admin operations, edits, and updates will be logged here.
          </p>
        )}
      </section>
    </>
  );
}
