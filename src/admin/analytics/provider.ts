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
const PAGES = ["/home.html", "/collections/unique-campaign/index.html", "/collections/all/index.html", "/products/annr-archival-001/index.html", "/collections/hoodies/index.html", "/collections/jackets/index.html", "/collections/trousers/index.html", "/pages/faq/index.html", "/pages/shipping-policy/index.html", "/account/login/index.html"];
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
        { title: "Campaigns (UTM)", columns: ["Source", "Medium", "Campaign", "Sessions"], rows: [["instagram", "social", "unique-campaign", Math.round(S * 0.08)], ["newsletter", "email", "archival-drop", Math.round(S * 0.04)], ["facebook", "paid", "unique-pieces", Math.round(S * 0.03)]] },
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
      tables: [{ title: "Products", columns: ["Product", "Views", "Add to cart", "Orders"], rows: ["Archival Heavyweight Hoodie 001 (ANNR-001)"].map((p) => [p, Math.round(PV * 0.08), Math.round(S * 0.02), Math.max(1, Math.round(orders * 0.4))]) },
        { title: "Coupons", columns: ["Code", "Uses", "Discount ৳"], rows: [["WELCOME10", Math.round(orders * 0.1), Math.round(orders * 0.1 * 980)]] }],
      note: "Real orders live in Shopify. Connect it through a backend to replace these numbers.",
    }; }
    default: return { cards: [], tables: [] };
  }
}

// ---------- local / live provider: real events recorded by store pages + live Supabase orders/catalog ----------
export const EVENTS_KEY = "shihiko-events";
export function readEvents(): TrackedEvent[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(EVENTS_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function syncAnalyticsEventsFromEdge(): Promise<TrackedEvent[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/_ext/analytics-events", { headers: { accept: "application/json" } });
    if (!res.ok) return readEvents();
    const payload = await res.json();
    const edgeList: TrackedEvent[] = Array.isArray(payload?.events) ? payload.events : [];
    if (!edgeList.length) return readEvents();
    const current = readEvents();
    const sig = (e: TrackedEvent) => `${e.at}|${e.name}|${e.path}|${e.props?.["session"] || ""}`;
    const seen = new Set(current.map(sig));
    let added = 0;
    for (const ev of edgeList) {
      if (ev && ev.name && ev.at && !seen.has(sig(ev))) {
        seen.add(sig(ev));
        current.push(ev);
        added++;
      }
    }
    if (added > 0) {
      current.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(current.slice(-3000)));
    }
    return current;
  } catch {
    return readEvents();
  }
}

function readLiveStoreSnapshot(): {
  products: Array<Record<string, any>>;
  orders: Array<Record<string, any>>;
  customers: Array<Record<string, any>>;
  discounts: Array<Record<string, any>>;
} {
  try {
    if (typeof localStorage === "undefined") return { products: [], orders: [], customers: [], discounts: [] };
    const raw = localStorage.getItem("shihiko-admin-v1");
    if (!raw) return { products: [], orders: [], customers: [], discounts: [] };
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      orders: Array.isArray(parsed?.orders) ? parsed.orders : [],
      customers: Array.isArray(parsed?.customers) ? parsed.customers : [],
      discounts: Array.isArray(parsed?.discounts) ? parsed.discounts : [],
    };
  } catch {
    return { products: [], orders: [], customers: [], discounts: [] };
  }
}

function classifyChannel(e: TrackedEvent): string {
  const med = String(e.props?.["utm_medium"] || "").toLowerCase();
  const src = String(e.props?.["utm_source"] || "").toLowerCase();
  const ref = String(e.props?.["referrer"] || "Direct").toLowerCase();
  if (med === "paid" || med === "cpc" || med === "ads") return "Paid";
  if (med === "email" || src === "newsletter") return "Email";
  if (med === "social" || /instagram|facebook|tiktok|discord|youtube|twitter|t\.co|x\.com/.test(src + " " + ref)) return "Social";
  if (/google|bing|duckduckgo|yahoo|baidu/.test(src + " " + ref)) return "Organic search";
  if (!ref || ref === "direct" || /annr\.site|localhost|127\.0\.0\.1/.test(ref)) return "Direct";
  return "Referral";
}

function filtered(f: Filters) {
  const s = f.start, e = f.end + "T23:59:59";
  return readEvents().filter(
    (x) =>
      x.at >= s &&
      x.at <= e &&
      (f.page === "all" || x.path === f.page) &&
      (f.device === "all" || x.props?.["device"] === f.device) &&
      (f.channel === "all" || classifyChannel(x) === f.channel),
  );
}
const pct = (arr: number[], p: number) => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]!; };
function countBy(evs: TrackedEvent[], key: (e: TrackedEvent) => string) { const m = new Map<string, number>(); evs.forEach((e) => m.set(key(e), (m.get(key(e)) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })); }

function localReport(id: string, f: Filters): Report {
  const evs = filtered(f);
  const pvs = evs.filter((e) => e.name === "page_view");
  const atcs = evs.filter((e) => e.name === "add_to_cart");
  const clicks = evs.filter((e) => e.name === "cta_click");
  const searches = evs.filter((e) => e.name === "site_search");
  const scrolls = evs.filter((e) => e.name === "scroll_depth");
  const outbounds = evs.filter((e) => e.name === "outbound_click");
  const errs = evs.filter((e) => e.name === "javascript_error");

  const sessionSet = new Set(pvs.map((e) => String(e.props?.["session"] || "s1")));
  const sess = Math.max(sessionSet.size, pvs.length > 0 ? 1 : 0);
  const visitorSet = new Set(pvs.map((e) => String(e.props?.["vid"] || e.props?.["session"] || "v1")));
  const visitors = Math.max(visitorSet.size, pvs.length > 0 ? 1 : 0);

  const b = buckets(f);
  const perBucket = (list: TrackedEvent[]) => b.map((x, i) => ({ x, y: list.filter((e) => e.at >= x && (i === b.length - 1 || e.at < b[i + 1]!)).length }));
  const sessPerBucket = () =>
    b.map((x, i) => ({
      x,
      y: new Set(
        pvs
          .filter((e) => e.at >= x && (i === b.length - 1 || e.at < b[i + 1]!))
          .map((e) => String(e.props?.["session"] || "s1")),
      ).size,
    }));
  const visPerBucket = () =>
    b.map((x, i) => ({
      x,
      y: new Set(
        pvs
          .filter((e) => e.at >= x && (i === b.length - 1 || e.at < b[i + 1]!))
          .map((e) => String(e.props?.["vid"] || e.props?.["session"] || "v1")),
      ).size,
    }));

  const vit = (n: string) => evs.filter((e) => e.name === "web_vital" && e.props?.["metric"] === n).map((e) => Number(e.props?.["value"])).filter((v) => Number.isFinite(v) && v >= 0);
  const store = readLiveStoreSnapshot();
  const realOrders = store.orders.filter((o) => {
    const dt = String(o["date"] || "").slice(0, 10);
    return !dt || (dt >= f.start && dt <= f.end);
  });
  const grossRevenue = realOrders.reduce((acc, o) => acc + (parseFloat(String(o["total"] || "0").replace(/[^0-9.]/g, "")) || 0), 0);
  const avgScroll = scrolls.length
    ? Math.round(scrolls.reduce((acc, e) => acc + (Number(e.props?.["percent"]) || 0), 0) / scrolls.length)
    : pvs.length > 0 ? 50 : 0;
  const atcSessions = new Set(atcs.map((e) => String(e.props?.["session"] || "s1"))).size;
  const atcRate = sess > 0 ? r1((atcSessions / sess) * 100) : 0;

  switch (id) {
    case "overview":
      return {
        cards: [
          { label: "Visitors", value: visitors, help: "Unique tracked browsers across your store.", report: "visitors" },
          { label: "Sessions", value: sess, help: "Active browsing sessions recorded.", report: "visitors" },
          { label: "Page views", value: pvs.length, help: "Real page loads recorded by the storefront tracker.", report: "content" },
          { label: "Pages / session", value: sess > 0 ? r1(pvs.length / sess) : 0, help: "Page views divided by sessions." },
          { label: "Orders", value: realOrders.length, help: "Real orders synced from Supabase & checkout.", report: "ecommerce" },
          { label: "Gross revenue", value: Math.round(grossRevenue), unit: "৳", help: "Total order value in BDT.", report: "ecommerce" },
          { label: "Add-to-cart rate", value: atcRate, unit: "%", help: "Percentage of sessions with an Acquire / Add-to-cart action.", report: "funnels" },
          { label: "JS errors", value: errs.length, lowerIsBetter: true, help: "Real runtime script errors caught on storefront pages.", report: "errors" },
        ],
        trend: { title: "Visitors, sessions and page views", series: [{ name: "Visitors", points: visPerBucket() }, { name: "Sessions", points: sessPerBucket() }, { name: "Page views", points: perBucket(pvs) }] },
        bars: [
          { title: "Traffic by channel", items: countBy(pvs, classifyChannel) },
          { title: "Device breakdown", items: countBy(pvs, (e) => String(e.props?.["device"] || "Desktop")) },
        ],
        tables: [
          { title: "Top pages (real views)", columns: ["Page", "Views"], rows: countBy(pvs, (e) => e.path).map((x) => [x.label, x.value]) },
        ],
      };

    case "visitors": {
      const visitsByVid = countBy(pvs, (e) => String(e.props?.["vid"] || e.props?.["session"] || "v1"));
      const returningCount = visitsByVid.filter((v) => v.value > 1).length;
      const newCount = Math.max(0, visitors - returningCount);
      return {
        cards: [
          { label: "Visitors", value: visitors, help: "Unique tracked browsers." },
          { label: "New visitors", value: newCount, help: "First-time visitors in this period." },
          { label: "Returning visitors", value: returningCount, help: "Visitors with multiple page loads." },
          { label: "Sessions", value: sess, help: "Total browsing sessions." },
          { label: "Sessions / visitor", value: visitors > 0 ? r1(sess / visitors) : 0, help: "Average sessions per visitor." },
        ],
        trend: { title: "Visitors vs sessions", series: [{ name: "Visitors", points: visPerBucket() }, { name: "Sessions", points: sessPerBucket() }] },
        bars: [
          { title: "Device", items: countBy(pvs, (e) => String(e.props?.["device"] || "Desktop")) },
          { title: "Browser", items: countBy(pvs, (e) => String(e.props?.["browser"] || "Chrome")) },
        ],
        tables: [
          { title: "Top visited pages", columns: ["Page", "Views"], rows: countBy(pvs, (e) => e.path).map((x) => [x.label, x.value]) },
        ],
      };
    }

    case "acquisition": {
      const byChannel = countBy(pvs, classifyChannel);
      const chanMap = new Map(byChannel.map((x) => [x.label, x.value]));
      const utmRows: (string | number)[][] = [];
      const utmCounts = new Map<string, number>();
      for (const e of pvs) {
        const uSrc = String(e.props?.["utm_source"] || "");
        const uMed = String(e.props?.["utm_medium"] || "");
        const uCamp = String(e.props?.["utm_campaign"] || "");
        if (uSrc || uMed || uCamp) {
          const key = `${uSrc || "(direct)"}|${uMed || "(none)"}|${uCamp || "unique-campaign"}`;
          utmCounts.set(key, (utmCounts.get(key) || 0) + 1);
        }
      }
      for (const [k, cnt] of utmCounts.entries()) {
        const [uSrc, uMed, uCamp] = k.split("|");
        utmRows.push([uSrc!, uMed!, uCamp!, cnt]);
      }
      return {
        cards: ["Direct", "Social", "Organic search", "Referral"].map((c) => ({
          label: c,
          value: chanMap.get(c) || 0,
          help: `Real page views from ${c.toLowerCase()}.`,
        })),
        trend: { title: "Traffic over time", series: [{ name: "Page views", points: perBucket(pvs) }] },
        bars: [
          { title: "Channel share", items: byChannel },
          { title: "Referrer hostnames", items: countBy(pvs, (e) => String(e.props?.["referrer"] || "Direct")) },
        ],
        tables: [
          {
            title: "Campaigns (UTM)",
            columns: ["Source", "Medium", "Campaign", "Views"],
            rows: utmRows.length ? utmRows : [["direct", "none", "unique-campaign (organic)", pvs.length]],
          },
        ],
      };
    }

    case "content":
      return {
        cards: [
          { label: "Page views", value: pvs.length, help: "All real page loads." },
          { label: "Button & link clicks", value: clicks.length + atcs.length, help: "Tracked CTA and Acquire clicks." },
          { label: "Avg. scroll depth", value: avgScroll, unit: "%", help: "Average scroll depth reached by visitors." },
          { label: "Searches", value: searches.length, help: "Storefront search submissions." },
          { label: "Outbound clicks", value: outbounds.length, help: "Clicks to external websites." },
        ],
        trend: { title: "Page views over time", series: [{ name: "Page views", points: perBucket(pvs) }] },
        tables: [
          {
            title: "All pages",
            columns: ["Page", "Views", "CTA Clicks"],
            rows: countBy(pvs, (e) => e.path).map((x) => [
              x.label,
              x.value,
              clicks.filter((c) => c.path === x.label).length + atcs.filter((a) => a.path === x.label).length,
            ]),
          },
          {
            title: "Button / link clicks",
            columns: ["Element", "Page", "Clicks"],
            rows: countBy([...clicks, ...atcs], (e) => `${String(e.props?.["label"] || e.name)}|||${e.path}`).map((x) => {
              const [lbl, pg] = x.label.split("|||");
              return [lbl || "Button", pg || "/", x.value];
            }),
          },
        ],
      };

    case "events":
      return {
        cards: [
          { label: "Total tracked events", value: evs.length, help: "All real events recorded by the storefront tracker." },
          { label: "Distinct event types", value: new Set(evs.map((e) => e.name)).size, help: "Active event types seen in this period." },
          { label: "Add-to-cart / Acquire", value: atcs.length, help: "1-of-1 piece acquisition clicks." },
          { label: "Form submissions", value: evs.filter((e) => e.name === "form_submit").length, help: "Submitted forms (VIP login/signup, search, checkout)." },
        ],
        trend: { title: "Events per day", series: [{ name: "Events", points: perBucket(evs) }] },
        bars: [{ title: "Events by name", items: countBy(evs, (e) => e.name) }],
        tables: [],
      };

    case "performance": {
      const lcpVals = vit("LCP");
      const inpVals = vit("INP");
      const clsVals = vit("CLS");
      const fcpVals = vit("FCP");
      const ttfbVals = vit("TTFB");
      const vitalEvents = evs.filter((e) => e.name === "web_vital");
      const byPageMap = new Map<string, { lcp: number[]; fcp: number[]; ttfb: number[]; cls: number[] }>();
      for (const e of vitalEvents) {
        const cur = byPageMap.get(e.path) || { lcp: [], fcp: [], ttfb: [], cls: [] };
        const m = String(e.props?.["metric"] || "");
        const v = Number(e.props?.["value"]);
        if (Number.isFinite(v)) {
          if (m === "LCP") cur.lcp.push(v);
          if (m === "FCP") cur.fcp.push(v);
          if (m === "TTFB") cur.ttfb.push(v);
          if (m === "CLS") cur.cls.push(v);
        }
        byPageMap.set(e.path, cur);
      }
      return {
        cards: [
          { label: "LCP (p75)", value: pct(lcpVals, 0.75) == null ? null : r1(pct(lcpVals, 0.75)! / 1000), unit: "s", lowerIsBetter: true, help: "Largest Contentful Paint (real browser measurement). Good ≤ 2.5 s." },
          { label: "FCP (p75)", value: pct(fcpVals, 0.75) == null ? null : r1(pct(fcpVals, 0.75)! / 1000), unit: "s", lowerIsBetter: true, help: "First Contentful Paint (real browser measurement). Good ≤ 1.8 s." },
          { label: "TTFB (p75)", value: pct(ttfbVals, 0.75) == null ? null : Math.round(pct(ttfbVals, 0.75)!), unit: "ms", lowerIsBetter: true, help: "Time to First Byte from Cloudflare Worker. Good ≤ 800 ms." },
          { label: "CLS (p75)", value: pct(clsVals, 0.75), lowerIsBetter: true, help: "Cumulative Layout Shift. Good ≤ 0.1." },
          { label: "INP (p75)", value: pct(inpVals, 0.75) == null ? null : Math.round(pct(inpVals, 0.75)!), unit: "ms", lowerIsBetter: true, help: "Interaction to Next Paint. Good ≤ 200 ms." },
        ],
        tables: [
          {
            title: "Real Core Web Vitals by page",
            columns: ["Page", "LCP (s)", "FCP (s)", "TTFB (ms)", "CLS"],
            rows: [...byPageMap.entries()].map(([pg, m]) => [
              pg,
              pct(m.lcp, 0.75) != null ? r1(pct(m.lcp, 0.75)! / 1000) : "—",
              pct(m.fcp, 0.75) != null ? r1(pct(m.fcp, 0.75)! / 1000) : "—",
              pct(m.ttfb, 0.75) != null ? Math.round(pct(m.ttfb, 0.75)!) : "—",
              pct(m.cls, 0.75) != null ? pct(m.cls, 0.75)! : "0",
            ]),
          },
          {
            title: "Latest raw Web Vital measurements",
            columns: ["Page", "Metric", "Value"],
            rows: vitalEvents.slice(-50).reverse().map((e) => [e.path, String(e.props?.["metric"]), Number(e.props?.["value"])]),
          },
        ],
        note: "Real Core Web Vitals captured directly from storefront pages via PerformanceObserver.",
      };
    }

    case "errors": {
      const formErrs = evs.filter((e) => e.name === "form_error");
      return {
        cards: [
          { label: "JS errors", value: errs.length, lowerIsBetter: true, help: "Runtime script errors caught on storefront pages." },
          { label: "Form validation errors", value: formErrs.length, lowerIsBetter: true, help: "Form error events triggered by visitors." },
          { label: "Pages affected", value: new Set(errs.map((e) => e.path)).size, lowerIsBetter: true, help: "Distinct pages with runtime errors." },
        ],
        trend: { title: "Errors over time", series: [{ name: "Errors", points: perBucket(errs) }] },
        tables: [
          {
            title: "Error groups",
            columns: ["Message", "Page", "Count", "First seen", "Last seen"],
            rows: Object.values(
              errs.reduce((m: Record<string, (string | number)[]>, e) => {
                const k = e.props?.["message"] + "|" + e.path;
                const r = m[k] || [String(e.props?.["message"]), e.path, 0, e.at.slice(0, 16), e.at.slice(0, 16)];
                r[2] = Number(r[2]) + 1;
                r[4] = e.at.slice(0, 16);
                m[k] = r;
                return m;
              }, {}),
            ),
          },
        ],
      };
    }

    case "ecommerce": {
      const paidOrders = realOrders.filter((o) => String(o["payment"] || "").toLowerCase() === "paid");
      const paidRev = paidOrders.reduce((acc, o) => acc + (parseFloat(String(o["total"] || "0").replace(/[^0-9.]/g, "")) || 0), 0);
      const aov = realOrders.length > 0 ? Math.round(grossRevenue / realOrders.length) : 0;
      const convRate = sess > 0 ? r1((realOrders.length / sess) * 100) : 0;
      const activeInventory = store.products.filter((p) => p["status"] === "active").length;

      const orderPoints = b.map((x, i) => ({
        x,
        y: realOrders.filter((o) => {
          const dt = String(o["date"] || "").slice(0, 10);
          return dt >= x && (i === b.length - 1 || dt < b[i + 1]!);
        }).length,
      }));

      const productRows: (string | number)[][] = store.products.map((p) => {
        const handle = String(p["handle"] || "");
        const views = pvs.filter((e) => e.path.includes(`/products/${handle}`)).length;
        const addClicks = atcs.filter((e) => e.props?.["handle"] === handle || e.path.includes(`/products/${handle}`)).length;
        const prodOrders = realOrders.filter((o) => String(o["items"] || "").toLowerCase().includes(String(p["title"] || "").toLowerCase())).length;
        return [
          `${p["title"] || handle} (${p["code"] || "1-of-1"})`,
          `৳${Number(String(p["price"] || 0).replace(/[^0-9.]/g, "")).toLocaleString()}`,
          String(p["status"] || "active").toUpperCase(),
          views,
          addClicks,
          prodOrders,
        ];
      });

      return {
        cards: [
          { label: "Orders", value: realOrders.length, help: "Real orders in Supabase & Admin." },
          { label: "Gross revenue", value: Math.round(grossRevenue), unit: "৳", help: "Total order value in BDT." },
          { label: "Paid revenue", value: Math.round(paidRev), unit: "৳", help: "Revenue from orders marked Paid." },
          { label: "Avg. order value", value: aov, unit: "৳", help: "Revenue ÷ orders." },
          { label: "Conversion rate", value: convRate, unit: "%", help: "Orders ÷ tracked sessions." },
          { label: "Active 1-of-1 pieces", value: activeInventory, help: "Live active 1-of-1 pieces available in catalog." },
        ],
        trend: { title: "Orders over time", series: [{ name: "Orders", points: orderPoints }] },
        tables: [
          {
            title: "Live catalog product performance",
            columns: ["Product", "Price", "Status", "Views", "Acquire Clicks", "Orders"],
            rows: productRows,
          },
          {
            title: "Discounts & referral coupons",
            columns: ["Code", "Type", "Value", "Uses", "Status"],
            rows: store.discounts.map((d) => [
              String(d["code"] || ""),
              String(d["type"] || ""),
              String(d["value"] || ""),
              Number(d["uses"] || 0),
              d["active"] ? "Active" : "Inactive",
            ]),
          },
        ],
        note: "Live ecommerce metrics computed directly from your Supabase catalog, orders, discounts, and storefront tracker.",
      };
    }

    default:
      return { cards: [], tables: [], note: "No data for this report yet." };
  }
}

export const demoProvider: AnalyticsProvider = { status: "Demo Data", get: demoReport, events: () => [] };
export const localProvider: AnalyticsProvider = { status: "Connected", get: localReport, events: filtered };
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
