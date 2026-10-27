// Analytics provider boundary. Pages call these functions only; swap the provider later
// (GA4, Plausible, PageSpeed, Sentry…) through a backend. No keys live in the frontend.
import type { Filters } from "./filters";

export type Source = "demo" | "local";
export type Card = { label: string; value: number | null; unit?: string; prev?: number | null; help: string; lowerIsBetter?: boolean; report?: string };
export type Series = { name: string; points: { x: string; y: number }[] };
export type Table = { title: string; columns: string[]; rows: (string | number)[][]; help?: string };
export type Report = { cards: Card[]; trend?: { title: string; unit?: string; series: Series[] }; bars?: { title: string; unit?: string; items: { label: string; value: number }[] }[]; tables: Table[]; note?: string };
export type TrackedEvent = { name: EventName; at: string; path: string; props?: Record<string, string | number> };
export type EventName = "page_view" | "cta_click" | "form_start" | "form_submit" | "form_error" | "site_search" | "file_download" | "outbound_click" | "scroll_depth" | "add_to_cart" | "javascript_error" | "web_vital";
export const EVENT_NAMES: EventName[] = ["page_view", "cta_click", "form_start", "form_submit", "form_error", "site_search", "file_download", "outbound_click", "scroll_depth", "add_to_cart", "javascript_error", "web_vital"];

export interface AnalyticsProvider {
  status: "Demo Data" | "Local (this browser)" | "Connected";
  get(report: string, f: Filters): Report;
  events(f: Filters): TrackedEvent[];
}

// ---------- helpers ----------
function rng(seed: string) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
export function buckets(f: Filters): string[] {
  const out: string[] = []; const d = new Date(f.start); const end = new Date(f.end);
  const step = f.interval === "month" ? 30 : f.interval === "week" ? 7 : 1;
  while (d <= end && out.length < 400) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + step); }
  return out;
}
const days = (f: Filters) => Math.max(1, Math.round((+new Date(f.end) - +new Date(f.start)) / 864e5) + 1);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const r1 = (n: number) => Math.round(n * 10) / 10;
const PAGES = ["/home.html", "/collections/all/index.html", "/collections/vault/index.html", "/products/aka-manto-longsleeve/index.html", "/products/divine-sanctum-tee/index.html", "/pages/faq/index.html", "/collections/hoodies/index.html", "/pages/shipping-policy/index.html", "/account/login/index.html", "/pages/return-policy/index.html"];
const CHANNELS = ["Direct", "Organic search", "Social", "Referral", "Email", "Paid"];
const DEVICES = ["Mobile", "Desktop", "Tablet"];
const BROWSERS = ["Chrome", "Safari", "Samsung Internet", "Firefox", "Edge"];
const COUNTRIES = ["Bangladesh", "India", "United States", "United Kingdom", "UAE"];

// ---------- demo provider (deterministic sample numbers, always labelled) ----------
function demoReport(id: string, f: Filters): Report {
  const R = rng(id + f.start + f.end + f.device + f.channel + f.page);
  const scale = (f.device !== "all" ? 0.45 : 1) * (f.channel !== "all" ? 0.3 : 1) * (f.page !== "all" ? 0.15 : 1);
  const b = buckets(f);
  const line = (name: string, base: number) => ({ name, points: b.map((x, i) => ({ x, y: Math.round(base * scale * (f.interval === "month" ? 30 : f.interval === "week" ? 7 : 1) * (0.75 + R() * 0.5 + Math.sin(i / 3) * 0.12)) })) });
  const v = line("Visitors", 120), s = line("Sessions", 160), pv = line("Page views", 430);
  const tot = (x: Series) => sum(x.points.map((p) => p.y));
  const prev = (n: number) => Math.round(n * (0.8 + R() * 0.35));
  const split = (labels: string[], total: number) => { const w = labels.map((_, i) => (labels.length - i) * (0.6 + R())); const W = sum(w); return labels.map((l, i) => ({ label: l, value: Math.round((total * w[i]!) / W) })); };
  const V = tot(v), S = tot(s), PV = tot(pv);
  const pages = split(PAGES, PV);
  switch (id) {
    case "overview": return {
      cards: [
        { label: "Visitors", value: V, prev: prev(V), help: "Unique browsers that visited in the period.", report: "visitors" },
        { label: "Sessions", value: S, prev: prev(S), help: "Visits. One visitor can have many sessions.", report: "visitors" },
        { label: "Page views", value: PV, prev: prev(PV), help: "Every page load, including repeats.", report: "content" },
        { label: "Pages / session", value: r1(PV / S), prev: r1(PV / S * 0.95), help: "Page views divided by sessions." },
        { label: "Avg. engagement", value: Math.round(60 + R() * 80), unit: "s", prev: 90, help: "Average time the page was in focus per session." },
        { label: "Engagement rate", value: r1(55 + R() * 15), unit: "%", prev: 60, help: "Sessions over 10 s, with 2+ page views or a conversion." },
        { label: "Add-to-cart rate", value: r1(3 + R() * 3), unit: "%", prev: 4, help: "Sessions with an add_to_cart event.", report: "funnels" },
        { label: "JS errors", value: Math.round(R() * 30), prev: 20, lowerIsBetter: true, help: "Script errors reported by browsers.", report: "errors" },
      ],
      trend: { title: "Visitors and sessions", series: [v, s] },
      bars: [{ title: "Traffic by channel (sessions)", items: split(CHANNELS, S) }],
      tables: [{ title: "Top pages", columns: ["Page", "Views"], rows: pages.map((p) => [p.label, p.value]) }],
    };
    case "visitors": { const nv = Math.round(V * 0.68); return {
      cards: [
        { label: "Visitors", value: V, prev: prev(V), help: "Unique browsers (not people)." },
        { label: "New visitors", value: nv, prev: prev(nv), help: "First visit in this period." },
        { label: "Returning visitors", value: V - nv, prev: prev(V - nv), help: "Visited before." },
        { label: "Sessions / visitor", value: r1(S / V), help: "Average visits per visitor." },
        { label: "Avg. session", value: Math.round(80 + R() * 90), unit: "s", help: "Average session duration." },
      ],
      trend: { title: "Visitors vs sessions", series: [v, s] },
      bars: [{ title: "Device", items: split(DEVICES, S) }, { title: "Browser", items: split(BROWSERS, S) }, { title: "Country", items: split(COUNTRIES, S) }],
      tables: [{ title: "Landing pages", columns: ["Page", "Sessions", "Exit rate %"], rows: split(PAGES, S).map((p) => [p.label, p.value, Math.round(20 + R() * 50)]) },
        { title: "Visit frequency", columns: ["Visits", "Visitors"], rows: split(["1", "2", "3–5", "6–10", "10+"], V).map((p) => [p.label, p.value]) }],
    }; }
    case "acquisition": return {
      cards: CHANNELS.slice(0, 4).map((c) => ({ label: c, value: Math.round(S * (0.1 + R() * 0.3)), help: `Sessions from ${c.toLowerCase()}.` })),
      trend: { title: "Sessions by channel", series: CHANNELS.slice(0, 3).map((c) => line(c, 40 + R() * 40)) },
      bars: [{ title: "Channel share", items: split(CHANNELS, S) }],
      tables: [
        { title: "Campaigns (UTM)", columns: ["Source", "Medium", "Campaign", "Sessions"], rows: [["instagram", "social", "orbit-drop", Math.round(S * 0.08)], ["newsletter", "email", "vault-restock", Math.round(S * 0.04)], ["facebook", "paid", "eid-sale", Math.round(S * 0.03)]] },
        { title: "Referring domains", columns: ["Domain", "Sessions"], rows: split(["instagram.com", "facebook.com", "tiktok.com", "google.com", "discord.com"], Math.round(S * 0.4)).map((p) => [p.label, p.value]) },
      ],
      note: "Search queries and ad-platform data need Search Console / ad accounts connected.",
    };
    case "content": return {
      cards: [{ label: "Page views", value: PV, prev: prev(PV), help: "All page loads." }, { label: "Avg. scroll depth", value: Math.round(45 + R() * 30), unit: "%", help: "How far down pages are scrolled." }, { label: "Outbound clicks", value: Math.round(PV * 0.02), help: "Clicks to other websites." }, { label: "Searches", value: Math.round(S * 0.05), help: "Uses of store search." }],
      trend: { title: "Page views", series: [pv] },
      tables: [{ title: "All pages", columns: ["Page", "Views", "Avg. time (s)", "Exit %", "Scroll %"], rows: pages.map((p) => [p.label, p.value, Math.round(20 + R() * 120), Math.round(15 + R() * 60), Math.round(30 + R() * 60)]) },
        { title: "Button / link clicks", columns: ["Element", "Page", "Clicks"], rows: [["Add to cart", "/products/*", Math.round(S * 0.06)], ["WAITLIST", "/home.html", Math.round(S * 0.03)], ["Shop all", "header", Math.round(S * 0.1)], ["VIP", "header", Math.round(S * 0.02)]] }],
    };
    case "events": return {
      cards: [{ label: "Events", value: Math.round(PV * 3.2), help: "All tracked events." }, { label: "Event types", value: EVENT_NAMES.length, help: "Names in the event schema." }],
      trend: { title: "Events per day", series: [line("Events", 1300)] },
      bars: [{ title: "Events by name", items: split(EVENT_NAMES, Math.round(PV * 3.2)) }],
      tables: [],
    };
    case "performance": return {
      cards: [
        { label: "LCP (p75)", value: r1(1.8 + R() * 2), unit: "s", lowerIsBetter: true, help: "Largest Contentful Paint: when the main content appears. Good ≤ 2.5 s, poor > 4 s." },
        { label: "INP (p75)", value: Math.round(120 + R() * 250), unit: "ms", lowerIsBetter: true, help: "Interaction to Next Paint: delay after taps/clicks. Good ≤ 200 ms, poor > 500 ms." },
        { label: "CLS (p75)", value: Math.round((0.02 + R() * 0.2) * 100) / 100, lowerIsBetter: true, help: "Cumulative Layout Shift: how much the page jumps. Good ≤ 0.1, poor > 0.25." },
        { label: "FCP (p75)", value: r1(1 + R() * 1.5), unit: "s", lowerIsBetter: true, help: "First Contentful Paint. Good ≤ 1.8 s." },
        { label: "TTFB (p75)", value: Math.round(300 + R() * 700), unit: "ms", lowerIsBetter: true, help: "Time to First Byte from the server. Good ≤ 800 ms." },
      ],
      trend: { title: "LCP trend (s, ×10)", unit: "", series: [{ name: "LCP ×10", points: b.map((x) => ({ x, y: Math.round(18 + R() * 20) })) }] },
      bars: [{ title: "LCP by device (s ×10)", items: DEVICES.map((d) => ({ label: d, value: Math.round(15 + R() * 25) })) }],
      tables: [{ title: "Slowest pages", columns: ["Page", "LCP s", "INP ms", "CLS"], rows: PAGES.slice(0, 6).map((p) => [p, r1(1.5 + R() * 3), Math.round(100 + R() * 300), Math.round(R() * 30) / 100]) }],
    };
    case "errors": return {
      cards: [{ label: "JS errors", value: Math.round(R() * 30), lowerIsBetter: true, help: "Script errors." }, { label: "Failed requests", value: Math.round(R() * 12), lowerIsBetter: true, help: "Network calls that failed." }, { label: "Pages affected", value: Math.round(1 + R() * 5), lowerIsBetter: true, help: "Distinct pages with errors." }],
      trend: { title: "Errors per day", series: [{ name: "Errors", points: b.map((x) => ({ x, y: Math.round(R() * 5) })) }] },
      tables: [{ title: "Error groups", columns: ["Severity", "Message", "Page", "Count", "First seen", "Last seen"], rows: [["High", "Fancybox is not defined", "/home.html", Math.round(5 + R() * 20), f.start, f.end], ["Medium", "ServiceWorker registration failed (404)", "all", Math.round(5 + R() * 20), f.start, f.end], ["Low", "Unexpected token 'N' in JSON", "/collections/*", Math.round(R() * 8), f.start, f.end]] }],
    };
    case "ecommerce": { const orders = Math.round(S * 0.012); const aov = 9800; return {
      cards: [{ label: "Orders", value: orders, help: "Completed checkouts." }, { label: "Gross revenue", value: orders * aov, unit: "৳", help: "Before refunds." }, { label: "Refunds", value: Math.round(orders * 0.03) * aov, unit: "৳", lowerIsBetter: true, help: "Refunded value." }, { label: "Avg. order value", value: aov, unit: "৳", help: "Revenue ÷ orders." }, { label: "Conversion rate", value: r1((orders / S) * 100), unit: "%", help: "Orders ÷ sessions." }],
      trend: { title: "Orders", series: [line("Orders", 1.8)] },
      tables: [{ title: "Products", columns: ["Product", "Views", "Add to cart", "Orders"], rows: ["Aka Manto Longsleeve", "Divine Sanctum Tee", "Blue Moon Long Sleeve", "Hound of Hades Tee"].map((p) => [p, Math.round(PV * 0.04), Math.round(S * 0.01), Math.round(orders * 0.15)]) },
        { title: "Coupons", columns: ["Code", "Uses", "Discount ৳"], rows: [["WELCOME10", Math.round(orders * 0.1), Math.round(orders * 0.1 * 980)]] }],
      note: "Real orders live in Shopify. Connect it through a backend to replace these numbers.",
    }; }
    default: return { cards: [], tables: [] };
  }
}

// ---------- local provider: events recorded by the store pages in THIS browser ----------
export const EVENTS_KEY = "shihiko-events";
export function readEvents(): TrackedEvent[] { try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]"); } catch { return []; } }
function filtered(f: Filters) {
  const s = f.start, e = f.end + "T23:59:59";
  return readEvents().filter((x) => x.at >= s && x.at <= e && (f.page === "all" || x.path === f.page) && (f.device === "all" || x.props?.['device'] === f.device));
}
const pct = (arr: number[], p: number) => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]!; };
function countBy(evs: TrackedEvent[], key: (e: TrackedEvent) => string) { const m = new Map<string, number>(); evs.forEach((e) => m.set(key(e), (m.get(key(e)) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })); }
function localReport(id: string, f: Filters): Report {
  const evs = filtered(f); const pvs = evs.filter((e) => e.name === "page_view");
  const sess = new Set(pvs.map((e) => String(e.props?.['session']))).size;
  const b = buckets(f);
  const perBucket = (list: TrackedEvent[]) => b.map((x, i) => ({ x, y: list.filter((e) => e.at >= x && (i === b.length - 1 || e.at < b[i + 1]!)).length }));
  const vit = (n: string) => evs.filter((e) => e.name === "web_vital" && e.props?.['metric'] === n).map((e) => Number(e.props?.['value']));
  const errs = evs.filter((e) => e.name === "javascript_error");
  switch (id) {
    case "overview": case "visitors": case "content": return {
      cards: [{ label: "Page views", value: pvs.length, help: "Page loads in this browser." }, { label: "Sessions", value: sess, help: "Browser sessions in this browser." }, { label: "Visitors", value: pvs.length ? 1 : 0, help: "Only this browser is measured locally." }, { label: "Clicks", value: evs.filter((e) => e.name === "cta_click").length, help: "Button and link clicks." }],
      trend: { title: "Page views", series: [{ name: "Page views", points: perBucket(pvs) }] },
      bars: [{ title: "Device", items: countBy(pvs, (e) => String(e.props?.['device'] || "unknown")) }],
      tables: [{ title: "Pages", columns: ["Page", "Views"], rows: countBy(pvs, (e) => e.path).map((x) => [x.label, x.value]) }],
    };
    case "acquisition": return { cards: [], bars: [{ title: "Referrer", items: countBy(pvs, (e) => String(e.props?.['referrer'] || "Direct")) }], tables: [] };
    case "events": return { cards: [{ label: "Events", value: evs.length, help: "All events in this browser." }], trend: { title: "Events", series: [{ name: "Events", points: perBucket(evs) }] }, bars: [{ title: "By name", items: countBy(evs, (e) => e.name) }], tables: [] };
    case "performance": return {
      cards: [
        { label: "LCP (p75)", value: pct(vit("LCP"), 0.75) == null ? null : r1(pct(vit("LCP"), 0.75)! / 1000), unit: "s", lowerIsBetter: true, help: "Measured in this browser. Good ≤ 2.5 s." },
        { label: "INP (p75)", value: pct(vit("INP"), 0.75), unit: "ms", lowerIsBetter: true, help: "Approximated from the slowest interaction. Good ≤ 200 ms." },
        { label: "CLS (p75)", value: pct(vit("CLS"), 0.75), lowerIsBetter: true, help: "Good ≤ 0.1." },
        { label: "FCP (p75)", value: pct(vit("FCP"), 0.75) == null ? null : r1(pct(vit("FCP"), 0.75)! / 1000), unit: "s", lowerIsBetter: true, help: "Good ≤ 1.8 s." },
        { label: "TTFB (p75)", value: pct(vit("TTFB"), 0.75), unit: "ms", lowerIsBetter: true, help: "Good ≤ 800 ms." },
      ],
      tables: [{ title: "Measurements by page", columns: ["Page", "Metric", "Value"], rows: evs.filter((e) => e.name === "web_vital").slice(-50).reverse().map((e) => [e.path, String(e.props?.['metric']), Number(e.props?.['value'])]) }],
      note: "Real measurements from this browser only — not your visitors.",
    };
    case "errors": return {
      cards: [{ label: "JS errors", value: errs.length, lowerIsBetter: true, help: "Errors caught in this browser." }, { label: "Pages affected", value: new Set(errs.map((e) => e.path)).size, lowerIsBetter: true, help: "Distinct pages." }],
      trend: { title: "Errors", series: [{ name: "Errors", points: perBucket(errs) }] },
      tables: [{ title: "Error groups", columns: ["Message", "Page", "Count", "First seen", "Last seen"], rows: Object.values(errs.reduce((m: Record<string, (string | number)[]>, e) => { const k = e.props?.['message'] + "|" + e.path; const r = m[k] || [String(e.props?.['message']), e.path, 0, e.at.slice(0, 16), e.at.slice(0, 16)]; r[2] = Number(r[2]) + 1; r[4] = e.at.slice(0, 16); m[k] = r; return m; }, {})) }],
    };
    default: return { cards: [], tables: [], note: "No local data for this report." };
  }
}

export const demoProvider: AnalyticsProvider = { status: "Demo Data", get: demoReport, events: () => [] };
export const localProvider: AnalyticsProvider = { status: "Local (this browser)", get: localReport, events: filtered };
export const provider = (s: Source) => (s === "local" ? localProvider : demoProvider);

// Named entry points (stable API for the future backend).
export const getAnalyticsOverview = (s: Source, f: Filters) => provider(s).get("overview", f);
export const getVisitorReport = (s: Source, f: Filters) => provider(s).get("visitors", f);
export const getTrafficReport = (s: Source, f: Filters) => provider(s).get("acquisition", f);
export const getContentReport = (s: Source, f: Filters) => provider(s).get("content", f);
export const getPerformanceReport = (s: Source, f: Filters) => provider(s).get("performance", f);
export const getErrorReport = (s: Source, f: Filters) => provider(s).get("errors", f);
export const getConversionReport = (s: Source, f: Filters, steps: EventName[]) => funnel(s, f, steps);

// Funnel: local = real sessions in this browser; demo = sample counts.
export function funnel(s: Source, f: Filters, steps: EventName[]) {
  if (s === "local") {
    const evs = filtered(f); const bySess = new Map<string, TrackedEvent[]>();
    evs.forEach((e) => { const k = String(e.props?.['session']); bySess.set(k, [...(bySess.get(k) || []), e]); });
    return steps.map((st, i) => ({ step: st, count: [...bySess.values()].filter((l) => steps.slice(0, i + 1).every((x) => l.some((e) => e.name === x))).length }));
  }
  const R = rng(steps.join() + f.start + f.end); let n = Math.round(4000 * (days(f) / 30));
  return steps.map((st, i) => { if (i) n = Math.round(n * (0.15 + R() * 0.5)); return { step: st, count: n }; });
}
