import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "../admin/store";
import { dataSource } from "../admin/services/dataSource";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

// Example numbers only: no analytics provider is connected yet.
const DEMO_VISITS = [42, 58, 51, 73, 66, 88, 79];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CARDS_KEY = "shihiko-dashboard-cards";
type CardCfg = { order: string[]; hidden: string[] };

function Dashboard() {
  const s = useAdmin();
  const stock = s.products.reduce((n, p) => n + p.variants.reduce((m, v) => m + (Number(v.stock) || 0), 0), 0);
  const low = s.products.filter((p) => p.variants.some((v) => v.stock <= 2));
  const stats: { k: string; v: string | number; to: string }[] = [
    { k: "Products", v: s.products.length, to: "/admin/products" }, { k: "Active", v: s.products.filter((p) => p.status === "active").length, to: "/admin/products" },
    { k: "Collections", v: s.collections.length, to: "/admin/collections" }, { k: "Pages", v: s.pages.length, to: "/admin/pages" },
    { k: "Orders", v: s.orders.length, to: "/admin/orders" }, { k: "Customers", v: s.customers.length, to: "/admin/customers" },
    { k: "Units in stock", v: stock, to: "/admin/products" }, { k: "Low stock items", v: low.length, to: "/admin/products" },
    { k: "Custom pages", v: s.site.customPages.length, to: "/admin/website" }, { k: "Media files", v: s.site.media.length, to: "/admin/media" },
  ];
  const [cfg, setCfg] = useState<CardCfg>({ order: [], hidden: [] });
  const [editing, setEditing] = useState(false);
  useEffect(() => { const c = dataSource.read<CardCfg>(CARDS_KEY); if (c) setCfg(c); }, []);
  const saveCfg = (c: CardCfg) => { setCfg(c); dataSource.write(CARDS_KEY, c); };
  const ordered = [...cfg.order.map((k) => stats.find((x) => x.k === k)).filter(Boolean) as typeof stats, ...stats.filter((x) => !cfg.order.includes(x.k))];
  const keys = ordered.map((x) => x.k);
  const shift = (i: number, d: number) => { const o = keys.slice(); [o[i], o[i + d]] = [o[i + d]!, o[i]!]; saveCfg({ ...cfg, order: o }); };
  const max = Math.max(...DEMO_VISITS);
  const status: [string, string][] = [
    ["Store", s.site.technical.maintenance ? "Maintenance mode ON" : "Online"],
    ["Hidden products", String(s.products.filter((p) => p.status !== "active").length)],
    ["Hidden pages", String(s.site.hiddenPages.length)],
    ["Page transition", s.site.technical.pageTransition ? "On" : "Off"],
    ["Analytics", "Not connected"],
    ["Data storage", "This browser only (demo)"],
  ];
  return (
    <>
      <div className="adm-top"><h1>Dashboard</h1>
        <div className="adm-row">
          <button className="adm-btn ghost" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Customise cards"}</button>
          <Link className="adm-btn ghost" to="/admin/sections">Edit sections</Link>
          <Link className="adm-btn ghost" to="/admin/theme">Design</Link>
          <Link className="adm-btn" to="/admin/products">Manage products</Link>
        </div>
      </div>
      {editing && <section className="adm-card"><h2>Summary cards</h2><p className="adm-hint">Tick the cards to show and use the arrows to order them.</p>
        {ordered.map((x, i) => <div key={x.k} className="adm-row" style={{ marginBottom: 4 }}>
          <input type="checkbox" checked={!cfg.hidden.includes(x.k)} onChange={(e) => saveCfg({ order: keys, hidden: e.target.checked ? cfg.hidden.filter((h) => h !== x.k) : [...cfg.hidden, x.k] })} />
          <span style={{ width: 180 }}>{x.k}</span>
          <button className="adm-btn ghost sm" disabled={i === 0} onClick={() => shift(i, -1)}>↑</button>
          <button className="adm-btn ghost sm" disabled={i === ordered.length - 1} onClick={() => shift(i, 1)}>↓</button>
        </div>)}
        <button className="adm-btn ghost sm" onClick={() => saveCfg({ order: [], hidden: [] })}>Reset cards</button>
      </section>}
      <div className="adm-stats">{ordered.filter((x) => !cfg.hidden.includes(x.k)).map((x) => <Link to={x.to} className="adm-stat" key={x.k} style={{ textDecoration: "none", color: "inherit" }}><span>{x.k}</span><b>{x.v}</b></Link>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <section className="adm-card"><h2>Visitors this week</h2>
          <span className="adm-tag">Example data · no analytics connected</span>
          <div className="adm-bars" style={{ marginTop: 16, marginBottom: 24 }}>
            {DEMO_VISITS.map((v, i) => <div key={i} style={{ height: `${(v / max) * 100}%` }} title={`${v}`}><span>{DAYS[i]}</span></div>)}
          </div>
          <Link className="link" to="/admin/analytics/$report" params={{ report: "overview" }}>Open analytics</Link>
        </section>
        <section className="adm-card"><h2>Site status</h2>
          {status.map(([k, v]) => <div className="adm-status" key={k}><span>{k}</span><b>{v}</b></div>)}
        </section>
      </div>
      <section className="adm-card"><div className="adm-top" style={{ marginBottom: 10, paddingBottom: 8 }}><h2>Recent activity</h2><Link className="link" to="/admin/activity">View all</Link></div>
        {s.activity.length ? (
          <table><tbody>{s.activity.slice(0, 6).map((a) => <tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.section}</td><td>{a.action}</td><td>{a.item}</td></tr>)}</tbody></table>
        ) : <p>No changes yet. Edits you make will appear here.</p>}
      </section>
      <section className="adm-card"><h2>Recent orders</h2>
        <span className="adm-tag">Sample orders</span>
        <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{s.orders.slice(-5).reverse().map((o) => <tr key={o.id}><td>{o.id}</td><td>{o.customer}</td><td>৳{o.total}</td><td><span className="adm-tag">{o.status}</span></td></tr>)}</tbody></table>
      </section>
      <section className="adm-card"><h2>Low stock</h2>
        {low.length ? low.map((p) => <div key={p.handle}><Link className="link" to="/admin/products/$handle" params={{ handle: p.handle }}>{p.title}</Link></div>) : <p>Everything is stocked.</p>}
      </section>
    </>
  );
}
