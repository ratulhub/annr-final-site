import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { BarList, DataTable, Funnel, LineChart, MetricCard, csv } from "../admin/analytics/charts";
import { presetRange, previousPeriod, savedPresets, savePresets, useFilters, type Filters, type Saved } from "../admin/analytics/filters";
import { EVENT_NAMES, EVENTS_KEY, funnel, provider, readEvents, type EventName, type Source } from "../admin/analytics/provider";
import { REPORTS } from "../admin/analytics/reports";

export const Route = createFileRoute("/admin/analytics/$report")({ component: Analytics });

function Analytics() {
  const { report } = Route.useParams();
  const meta = REPORTS.find((r) => r.id === report);
  const { f, update, src, setSource } = useFilters();
  if (!meta) return <Card title="Report not found"><Link className="link" to="/admin/analytics/$report" params={{ report: "overview" }}>Analytics overview</Link></Card>;
  const custom = ["funnels", "seo", "reports", "settings"].includes(report);
  return (
    <>
      <div className="adm-top"><div><h1>{meta.title}</h1><p className="adm-hint" style={{ marginTop: 6 }}>{meta.purpose}</p></div>
        <span className="adm-tag" style={{ background: src === "demo" ? "#000" : "#fff", color: src === "demo" ? "#fff" : "#000" }}>{src === "demo" ? "DEMO DATA — not real visitors" : "LOCAL — this browser only"}</span></div>
      {report !== "settings" && report !== "seo" && <FilterBar f={f} update={update} src={src} setSource={setSource} />}
      {!custom && <StandardReport id={report} f={f} src={src} />}
      {report === "funnels" && <Funnels f={f} src={src} />}
      {report === "seo" && <SeoReport />}
      {report === "reports" && <Reports f={f} src={src} update={update} />}
      {report === "settings" && <Settings src={src} setSource={setSource} />}
    </>
  );
}

function FilterBar({ f, update, src, setSource }: { f: Filters; update: (p: Partial<Filters>) => void; src: Source; setSource: (s: Source) => void }) {
  const pages = Array.from(new Set(readEvents().map((e) => e.path))).slice(0, 30);
  const chips = [f.device !== "all" && `Device: ${f.device}`, f.channel !== "all" && `Channel: ${f.channel}`, f.page !== "all" && `Page: ${f.page}`].filter(Boolean) as string[];
  return (
    <section className="adm-card adm-filters">
      <div className="adm-row">
        <select value={f.preset} onChange={(e) => update(e.target.value === "custom" ? { preset: "custom" } : { preset: e.target.value, ...presetRange(e.target.value) })} style={{ width: 150 }} aria-label="Date range">
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="12m">Last 12 months</option><option value="custom">Custom</option></select>
        <input type="date" value={f.start} max={f.end} onChange={(e) => update({ preset: "custom", start: e.target.value })} style={{ width: 150 }} aria-label="Start date" />
        <input type="date" value={f.end} min={f.start} onChange={(e) => update({ preset: "custom", end: e.target.value })} style={{ width: 150 }} aria-label="End date" />
        <select value={f.interval} onChange={(e) => update({ interval: e.target.value as Filters["interval"] })} style={{ width: 110 }} aria-label="Interval"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select>
        <select value={f.device} onChange={(e) => update({ device: e.target.value })} style={{ width: 120 }} aria-label="Device"><option value="all">All devices</option>{["Mobile", "Desktop", "Tablet"].map((d) => <option key={d}>{d}</option>)}</select>
        <select value={f.channel} onChange={(e) => update({ channel: e.target.value })} style={{ width: 140 }} aria-label="Channel" disabled={src === "local"}><option value="all">All channels</option>{["Direct", "Organic search", "Social", "Referral", "Email", "Paid"].map((d) => <option key={d}>{d}</option>)}</select>
        <select value={f.page} onChange={(e) => update({ page: e.target.value })} style={{ width: 200 }} aria-label="Page"><option value="all">All pages</option>{["/home.html", ...pages.filter((p) => p !== "/home.html")].map((p) => <option key={p}>{p}</option>)}</select>
        <label className="adm-check"><input type="checkbox" checked={f.compare} onChange={(e) => update({ compare: e.target.checked })} />Compare to previous period</label>
        <select value={src} onChange={(e) => setSource(e.target.value as Source)} style={{ width: 170 }} aria-label="Data source"><option value="demo">Demo data</option><option value="local">This browser's events</option></select>
      </div>
      {chips.length > 0 && <div className="adm-row" style={{ marginTop: 8 }}>{chips.map((c) => <span key={c} className="adm-tag">{c}</span>)}<button className="adm-btn ghost sm" onClick={() => update({ device: "all", channel: "all", page: "all" })}>Clear filters</button></div>}
    </section>
  );
}

function StandardReport({ id, f, src }: { id: string; f: Filters; src: Source }) {
  const nav = useNavigate();
  const [state, setState] = useState<{ loading: boolean; error?: string; data?: ReturnType<ReturnType<typeof provider>["get"]> }>({ loading: true });
  useEffect(() => {
    setState({ loading: true });
    const t = setTimeout(() => {
      try {
        const p = provider(src); const data = p.get(id, f);
        if (f.compare) { const prev = p.get(id, previousPeriod(f)); data.cards = data.cards.map((c, i) => ({ ...c, prev: prev.cards[i]?.value ?? null })); }
        else data.cards = data.cards.map((c) => ({ ...c, prev: null }));
        setState({ loading: false, data });
      } catch (e) { setState({ loading: false, error: (e as Error).message }); }
    }, 150);
    return () => clearTimeout(t);
  }, [id, src, f]);
  if (state.loading) return <p className="adm-hint">Loading report…</p>;
  if (state.error || !state.data) return <div className="adm-err">Could not load this report: {state.error}</div>;
  const d = state.data;
  const empty = !d.cards.length && !d.tables.length && !d.bars?.length;
  return (
    <>
      {d.note && <p className="adm-hint">{d.note}</p>}
      {empty && <Card title="No data"><p>{src === "local" ? "No events recorded in this browser for this report yet. Browse the store, then come back." : "This report has no data for these filters."}</p></Card>}
      {d.cards.length > 0 && <div className="adm-stats">{d.cards.map((c) => <MetricCard key={c.label} c={c} onOpen={c.report ? () => nav({ to: "/admin/analytics/$report", params: { report: c.report! } }) : undefined} />)}</div>}
      {d.trend && <Card title={d.trend.title}><LineChart series={d.trend.series} /></Card>}
      {d.bars && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>{d.bars.map((b) => <Card key={b.title} title={b.title}><BarList items={b.items} unit={b.unit} /></Card>)}</div>}
      {d.tables.map((t) => <DataTable key={t.title} t={t} onRowClick={id === "content" || id === "overview" ? (r) => { const page = String(r[0]); if (page.startsWith("/pages/")) nav({ to: "/admin/pages" }); else if (page.startsWith("/products/")) nav({ to: "/admin/products/$handle", params: { handle: page.split("/")[2]! } }); else nav({ to: "/admin/sections" }); } : undefined} />)}
      {(id === "content" || id === "overview") && <p className="adm-hint">Click a page row to open its editor. Numbers show what happened, not why.</p>}
      {id === "acquisition" && <Card title="Campaign tracking (UTM)"><p>Add these to links you share so visits are grouped by campaign:</p><code>?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=orbit-drop</code><p className="adm-hint">The store already records the utm_ values in local page_view events.</p></Card>}
      {id === "events" && <EventSchema src={src} f={f} />}
      {id === "performance" && <Thresholds />}
      {id === "visitors" && <Card title="Cohorts & retention"><p style={{ marginTop: 0 }}>Unavailable: retention needs a connected analytics provider that recognises returning visitors across days. Country breakdowns also need a provider with reliable location data.</p></Card>}
      {id === "errors" && <LinkChecker />}
      {id === "errors" && <p className="adm-hint">Monitoring status: no monitoring service connected. {src === "demo" ? "These errors are examples." : "These were caught in this browser."}</p>}
    </>
  );
}

function EventSchema({ src, f }: { src: Source; f: Filters }) {
  const evs = provider(src).events(f).slice(-200).reverse();
  return <>
    <DataTable t={{ title: "Event schema", columns: ["Event", "Properties"], rows: [["page_view", "path, referrer, utm_*, device, session"], ["cta_click", "label, href"], ["outbound_click", "href"], ["form_start / form_submit / form_error", "form id (never field contents)"], ["site_search", "query length only"], ["file_download", "href"], ["scroll_depth", "percent (25/50/75/100)"], ["add_to_cart", "product handle"], ["javascript_error", "message (no stack with user data)"], ["web_vital", "metric, value"]] }} />
    {src === "local" && <DataTable t={{ title: "Latest events in this browser", columns: ["Time", "Event", "Page", "Details"], rows: evs.map((e) => [e.at.replace("T", " ").slice(0, 19), e.name, e.path, JSON.stringify(e.props || {})]) }} />}
  </>;
}

const DEFAULT_STEPS: EventName[] = ["page_view", "add_to_cart", "cta_click"];
function Funnels({ f, src }: { f: Filters; src: Source }) {
  const [steps, setSteps] = useState<EventName[]>(DEFAULT_STEPS);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("shihiko-funnel") || "null"); if (s) setSteps(s); } catch { /* ignore */ } }, []);
  const save = (s: EventName[]) => { setSteps(s); localStorage.setItem("shihiko-funnel", JSON.stringify(s)); };
  const res = funnel(src, f, steps);
  const prev = f.compare ? funnel(src, previousPeriod(f), steps) : null;
  const rows = res.map((r, i) => { const before = i ? res[i - 1]!.count : r.count; return [`${i + 1}. ${r.step}`, r.count, i ? (before ? Math.round((r.count / before) * 1000) / 10 : 0) : 100, i ? before - r.count : 0, prev ? prev[i]!.count : "—"]; });
  const overall = res[0]?.count ? Math.round((res[res.length - 1]!.count / res[0].count) * 1000) / 10 : 0;
  return <>
    <Card title="Steps">
      {steps.map((s, i) => <div key={i} className="adm-row" style={{ marginBottom: 6 }}><b>{i + 1}.</b>
        <select value={s} onChange={(e) => save(steps.map((x, j) => (j === i ? (e.target.value as EventName) : x)))} style={{ width: 220 }}>{EVENT_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
        <button className="adm-btn danger sm" disabled={steps.length <= 2} onClick={() => save(steps.filter((_, j) => j !== i))}>✕</button></div>)}
      <button className="adm-btn ghost sm" disabled={steps.length >= 6} onClick={() => save([...steps, "form_submit"])}>+ Add step</button>
      <p className="adm-hint">Checkout happens on the live Shopify store, so purchase is not tracked here; the deepest step is add_to_cart.</p>
    </Card>
    <div className="adm-stats"><MetricCard c={{ label: "Entered", value: res[0]?.count ?? null, help: src === "local" ? "Sessions in this browser" : "Sample sessions" }} /><MetricCard c={{ label: "Completed", value: res[res.length - 1]?.count ?? null, help: "Reached the last step" }} /><MetricCard c={{ label: "Overall conversion", value: overall, unit: "%", help: "Completed ÷ entered" }} /></div>
    <Card title="Funnel"><Funnel steps={res} /></Card>
    <DataTable t={{ title: "Funnel detail", columns: ["Step", "Sessions", "Step conversion %", "Drop-off", "Previous period"], rows }} />
  </>;
}

function SeoReport() {
  const s = useAdmin();
  const items = [...s.pages.map((p) => ({ k: "Page", ...p })), ...s.collections.map((c) => ({ k: "Collection", ...c })), ...s.products.map((p) => ({ k: "Product", ...p }))];
  const missT = items.filter((i) => !i.seoTitle), missD = items.filter((i) => !i.seoDescription), long = items.filter((i) => i.seoTitle.length > 60);
  const dupT = items.filter((i, _, a) => i.seoTitle && a.filter((x) => x.seoTitle === i.seoTitle).length > 1);
  const seo = s.site.seo;
  const check = (ok: boolean, label: string, to: string) => [ok ? "✓ OK" : "✕ Fix", label, to];
  return <>
    <div className="adm-stats">
      <MetricCard c={{ label: "Title coverage", value: Math.round(((items.length - missT.length) / items.length) * 100), unit: "%", help: "Pages with a search title. Checked from your admin data." }} />
      <MetricCard c={{ label: "Description coverage", value: Math.round(((items.length - missD.length) / items.length) * 100), unit: "%", help: "Pages with a search description." }} />
      <MetricCard c={{ label: "Duplicate titles", value: dupT.length, lowerIsBetter: true, help: "Pages sharing the same title." }} />
      <MetricCard c={{ label: "Search clicks", value: null, help: "Needs Google Search Console connected." }} />
    </div>
    <p className="adm-hint">Checked from your real admin data (not demo). Impressions, clicks, position and backlinks need Search Console connected.</p>
    <DataTable t={{ title: "Technical checklist", columns: ["Status", "Check", "Fix in"], rows: [
      check(!missT.length, `Search titles present (${missT.length} missing)`, "SEO"), check(!missD.length, `Descriptions present (${missD.length} missing)`, "SEO"),
      check(!long.length, `Titles under 60 characters (${long.length} too long)`, "SEO"), check(!dupT.length, `No duplicate titles (${dupT.length})`, "SEO"),
      check(!seo.noindex, "Site is allowed in search engines", "SEO"), check(!!seo.canonicalBase, "Canonical domain set", "SEO"),
      check(seo.structuredData, "Structured data enabled", "SEO"), check(!!seo.robots, "robots.txt configured (saved, not served yet)", "SEO"),
      check(!!seo.ogImage, "Social sharing image set", "SEO")] }} />
    <DataTable t={{ title: "Pages needing work", columns: ["Type", "Page", "Issue"], rows: [...missD.map((i) => [i.k, i.title, "No description"]), ...long.map((i) => [i.k, i.title, "Title too long"]), ...dupT.map((i) => [i.k, i.title, "Duplicate title"])] }} />
    <Link className="adm-btn" to="/admin/seo">Open SEO editor</Link>
  </>;
}

const CARD_KEY = "shihiko-analytics-cards";
function Reports({ f, src, update }: { f: Filters; src: Source; update: (p: Partial<Filters>) => void }) {
  const [saved, setSaved] = useState<Saved[]>([]); const [name, setName] = useState("");
  const all = provider(src).get("overview", f).cards;
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => { setSaved(savedPresets()); try { setOrder(JSON.parse(localStorage.getItem(CARD_KEY) || "null") || all.map((c) => c.label)); } catch { setOrder(all.map((c) => c.label)); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const saveOrder = (o: string[]) => { setOrder(o); localStorage.setItem(CARD_KEY, JSON.stringify(o)); };
  const exportAll = () => { const rows: (string | number)[][] = []; REPORTS.filter((r) => r.standard).forEach((r) => provider(src).get(r.id, f).cards.forEach((c) => rows.push([r.title, c.label, c.value ?? "", c.unit || ""]))); csv(`analytics-${src}-${f.start}-${f.end}`, ["Report", "Metric", "Value", "Unit"], rows); };
  return <>
    <Card title="My overview cards">
      <p className="adm-hint">Pick and order the cards for your summary.</p>
      {all.map((c) => { const i = order.indexOf(c.label); return <div key={c.label} className="adm-row" style={{ marginBottom: 4 }}>
        <input type="checkbox" checked={i >= 0} onChange={(e) => saveOrder(e.target.checked ? [...order, c.label] : order.filter((x) => x !== c.label))} /> <span style={{ width: 180 }}>{c.label}</span>
        {i >= 0 && <><button className="adm-btn ghost sm" disabled={i === 0} onClick={() => { const o = order.slice(); [o[i - 1], o[i]] = [o[i]!, o[i - 1]!]; saveOrder(o); }}>↑</button><button className="adm-btn ghost sm" disabled={i === order.length - 1} onClick={() => { const o = order.slice(); [o[i + 1], o[i]] = [o[i]!, o[i + 1]!]; saveOrder(o); }}>↓</button></>}
      </div>; })}
      <div className="adm-stats" style={{ marginTop: 14 }}>{order.map((l) => all.find((c) => c.label === l)).filter(Boolean).map((c) => <MetricCard key={c!.label} c={c!} />)}</div>
    </Card>
    <Card title="Saved filters">
      <div className="adm-row"><input placeholder="Name, e.g. Mobile last 7 days" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 280 }} />
        <button className="adm-btn" disabled={!name.trim()} onClick={() => { const l = [...saved.filter((s) => s.name !== name), { name, filters: f }]; savePresets(l); setSaved(l); setName(""); }}>Save current filters</button></div>
      {saved.length ? <table style={{ marginTop: 10 }}><tbody>{saved.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.filters.start} → {s.filters.end} · {s.filters.device}</td>
        <td><button className="adm-btn ghost sm" onClick={() => update(s.filters)}>Apply</button> <button className="adm-btn danger sm" onClick={() => { const l = saved.filter((x) => x.name !== s.name); savePresets(l); setSaved(l); }}>✕</button></td></tr>)}</tbody></table> : <p>No saved filters.</p>}
    </Card>
    <Card title="Export"><button className="adm-btn" onClick={exportAll}>Download all report metrics (CSV)</button>
      <p className="adm-hint">Scheduled email reports are a future integration and are not set up.</p></Card>
  </>;
}

function Settings({ src, setSource }: { src: Source; setSource: (s: Source) => void }) {
  const [n, setN] = useState(0);
  useEffect(() => setN(readEvents().length), []);
  const providers = [["Google Analytics 4 / Plausible", "Visitors, traffic, events"], ["Google Search Console", "Search clicks, queries"], ["PageSpeed Insights / RUM", "Performance"], ["Sentry or similar", "Errors"], ["Shopify", "Orders & revenue"]];
  return <>
    <Card title="Data source">
      <div className="adm-row"><label className="adm-check"><input type="radio" checked={src === "demo"} onChange={() => setSource("demo")} />Demo data (sample numbers)</label>
        <label className="adm-check"><input type="radio" checked={src === "local"} onChange={() => setSource("local")} />This browser's events ({n} recorded)</label></div>
      <p className="adm-hint">Local mode uses real events the store pages record in this browser only (trackEvent → local adapter). It is not your visitors' data.</p>
      <button className="adm-btn danger sm" onClick={() => { if (confirm("Delete all locally recorded events?")) { localStorage.removeItem(EVENTS_KEY); setN(0); } }}>Clear local events</button>
    </Card>
    <Card title="Providers">
      <table><thead><tr><th>Provider</th><th>Used for</th><th>Status</th></tr></thead><tbody>{providers.map(([p, u]) => <tr key={p}><td>{p}</td><td>{u}</td><td><span className="adm-tag">Not connected</span></td></tr>)}</tbody></table>
      <p className="adm-hint">Connecting needs a backend so keys stay private. No keys are stored in the browser.</p>
    </Card>
  </>;
}

const TH_KEY = "shihiko-vitals-thresholds";
const TH_DEFAULT: [string, string, number, number][] = [["LCP", "s", 2.5, 4], ["INP", "ms", 200, 500], ["CLS", "", 0.1, 0.25], ["FCP", "s", 1.8, 3], ["TTFB", "s", 0.8, 1.8]];
function Thresholds() {
  const [rows, setRows] = useState(TH_DEFAULT);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(TH_KEY) || "null"); if (v) setRows(v); } catch { /* ignore */ } }, []);
  const set = (i: number, j: 2 | 3, v: string) => { const n = Number(v); if (!(n >= 0)) return; const r = rows.map((x, k) => (k === i ? ([...x] as typeof x) : x)); r[i]![j] = n; setRows(r); localStorage.setItem(TH_KEY, JSON.stringify(r)); };
  const bad = rows.some((r) => r[2] >= r[3]);
  return <Card title="Alert thresholds (defaults from web.dev Core Web Vitals)" action={<button className="adm-btn ghost sm" onClick={() => { setRows(TH_DEFAULT); localStorage.removeItem(TH_KEY); }}>Reset</button>}>
    <table><thead><tr><th>Metric</th><th>Good up to</th><th>Poor above</th><th>Unit</th></tr></thead><tbody>
      {rows.map((r, i) => <tr key={r[0]}><td>{r[0]}</td><td><input type="number" step="any" min={0} value={r[2]} onChange={(e) => set(i, 2, e.target.value)} style={{ width: 90 }} /></td><td><input type="number" step="any" min={0} value={r[3]} onChange={(e) => set(i, 3, e.target.value)} style={{ width: 90 }} /></td><td>{r[1] || "score"}</td></tr>)}
    </tbody></table>
    {bad && <div className="adm-err">"Good up to" must be lower than "Poor above".</div>}
    <p className="adm-hint">Values between the two are "needs improvement". No Lighthouse or PageSpeed test has been run; local mode shows real measurements from your own browser only.</p>
  </Card>;
}

// Real broken-link check: loads a store page in this browser and requests every internal link on it.
function LinkChecker() {
  const [page, setPage] = useState("/home.html");
  const [state, setState] = useState<{ running: boolean; done: number; total: number; broken: { url: string; status: string }[]; error?: string } | null>(null);
  const run = async () => {
    setState({ running: true, done: 0, total: 0, broken: [] });
    try {
      const html = await (await fetch(page)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const urls = Array.from(new Set(Array.from(doc.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")!).filter((h) => h.startsWith("/") && !h.startsWith("//")).map((h) => h.split("#")[0]!).filter(Boolean))).slice(0, 200);
      const broken: { url: string; status: string }[] = []; let done = 0;
      for (let i = 0; i < urls.length; i += 8) {
        await Promise.all(urls.slice(i, i + 8).map(async (u) => { try { const r = await fetch(u, { method: "GET", redirect: "follow" }); if (!r.ok) broken.push({ url: u, status: String(r.status) }); } catch { broken.push({ url: u, status: "failed" }); } done++; }));
        setState({ running: true, done, total: urls.length, broken: [...broken] });
      }
      setState({ running: false, done, total: urls.length, broken });
    } catch (e) { setState({ running: false, done: 0, total: 0, broken: [], error: (e as Error).message }); }
  };
  return <Card title="Broken link check (real)">
    <div className="adm-row"><input value={page} onChange={(e) => setPage(e.target.value)} style={{ width: 320 }} aria-label="Page to check" />
      <button className="adm-btn" disabled={!!state?.running || !page.startsWith("/")} onClick={run}>{state?.running ? `Checking ${state.done}/${state.total}…` : "Check links"}</button></div>
    {state?.error && <div className="adm-err">Could not load that page: {state.error}</div>}
    {state && !state.running && !state.error && (state.broken.length
      ? <table><thead><tr><th>Link</th><th>Status</th></tr></thead><tbody>{state.broken.map((b) => <tr key={b.url}><td>{b.url}</td><td>{b.status}</td></tr>)}</tbody></table>
      : <p>All {state.total} internal links on this page answered OK.</p>)}
    <p className="adm-hint">Checks links inside this website only (up to 200 per page), from your browser, when you press the button.</p>
  </Card>;
}
