import { createFileRoute } from "@tanstack/react-router";
import catalog from "../admin/catalog.json";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const LEGACY_PRODUCT_HANDLES = new Set([
  "aka-manto-longsleeve",
  "divine-sanctum-tee",
  "ruin-and-rebirth-varsity-jacket",
  "blue-moon-long-sleeve",
  "hound-of-hades-tee",
  "ruin-and-rebirth-reversible-hoodie",
]);

const LEGACY_COLLECTION_HANDLES = new Set([
  "archived",
  "bonsai",
  "bottoms",
  "classics",
  "clocked-out",
  "divine",
  "flight-tags-keychains",
  "golden-goal",
  "hats",
  "jeans",
  "joggers",
  "longsleeves",
  "outwear",
  "samurai",
  "socks",
  "vault",
]);

const BUILTIN_STATIC_COLLECTIONS = new Set([
  "unique-campaign",
  "all",
  "hoodies",
  "sweatshirts",
  "trousers",
  "sweaters",
  "t-shirts",
  "jackets",
  "knitwear",
  "accessories",
]);

// Same behaviour as the original mirror server: live Shopify features (cart, cart drawer,
// recommendations, localization) are passed through to the real store; any other
// clean page URL is sent to its static copy in /public.
const LIVE = "https://shihiko.com";
const DYNAMIC =
  /^\/(cart|recommendations|localization|discount|contact)(?=[/.?]|$)/;
const EXT_HOSTS = [
  "cdn.shopify.com", "extensions.shopifycdn.com", "cdn.jsdelivr.net", "unpkg.com",
  "static.klaviyo.com", "fonts.bunny.net", "widget.gotolstoy.com", "play.gotolstoy.com",
];

function rewrite(text: string) {
  let t = text.replace(/(?:https?:)?\/\/(?:www\.)?shihiko\.com(?![\w.-])/gi, "")
    .replace(/(?:https?:)?\\\/\\\/(?:www\.)?shihiko\.com(?![\w.-])/gi, "");
  for (const h of EXT_HOSTS) {
    const e = h.replace(/\./g, "\\.");
    t = t.replace(new RegExp(`(?:https?:)?//${e}(?![\\w.-])`, "gi"), `/_ext/${h}`);
  }
  // Clean page links -> static copies.
  t = t.replace(/href="\/(products|collections|pages|policies)\/([^"?#]+?)\/?(?=["?#])/g,
    (_m, a, b) => `href="/${a}/${b}/index.html`);
  // Apply AnnR branding and creator credit to proxied responses.
  t = t.replace(/<p>created by BL\/S[^<]*<\/p>/gi, '<p>created by <a href="https://ratul.site" target="_blank" rel="noopener noreferrer">Ratul</a></p>')
    .replace(/support@shihiko\.com/gi, "support@annr.com")
    .replace(/\\u003eShihiko/g, "\\u003eAnnR")
    .replace(/(?<![A-Za-z0-9_])SHIHIKO(?![A-Za-z0-9_])/g, "ANNR")
    .replace(/(?<![A-Za-z0-9_]|%2F)Shihiko(?![A-Za-z0-9_]|%20Logo)/g, "AnnR");
  return t;
}

// Security headers on every response this server produces (static files get theirs from public/_headers).
export const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};
const MAX_BODY = 1024 * 1024; // 1 MB: cart/contact payloads are tiny
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);

// Sliding-window per-IP rate limiter for proxied storefront endpoints (POST mutations vs GET queries).
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_POST = 30;
const RATE_LIMIT_GET = 120;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

type EdgeAnalyticsEvent = {
  name: string;
  at: string;
  path: string;
  props: Record<string, string | number>;
};

const VALID_ANALYTICS_EVENTS = new Set([
  "page_view",
  "cta_click",
  "form_start",
  "form_submit",
  "form_error",
  "site_search",
  "file_download",
  "outbound_click",
  "scroll_depth",
  "add_to_cart",
  "javascript_error",
  "web_vital",
]);

const edgeAnalyticsEvents: EdgeAnalyticsEvent[] = [];

function recordEdgeAnalyticsEvent(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const r = raw as Record<string, unknown>;
  const name = String(r["name"] || "").trim();
  if (!VALID_ANALYTICS_EVENTS.has(name)) return;
  const at = typeof r["at"] === "string" && /^\d{4}-\d{2}-\d{2}T/.test(r["at"]) ? r["at"].slice(0, 30) : new Date().toISOString();
  const path = String(r["path"] || "/").split(/[?#]/)[0]!.slice(0, 180) || "/";
  const props: Record<string, string | number> = {};
  const rawProps = r["props"];
  if (rawProps && typeof rawProps === "object" && !Array.isArray(rawProps)) {
    const entries = Object.entries(rawProps as Record<string, unknown>).slice(0, 12);
    for (const [k, v] of entries) {
      const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32);
      if (!cleanKey) continue;
      if (typeof v === "number" && Number.isFinite(v)) {
        props[cleanKey] = v;
      } else if (typeof v === "string") {
        props[cleanKey] = v.slice(0, 140);
      }
    }
  }
  edgeAnalyticsEvents.push({ name, at, path, props });
  if (edgeAnalyticsEvents.length > 3000) {
    edgeAnalyticsEvents.splice(0, edgeAnalyticsEvents.length - 3000);
  }
}

export function checkRateLimit(key: string, method: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const limit = method === "POST" ? RATE_LIMIT_POST : RATE_LIMIT_GET;
  const bucketKey = `${method === "POST" ? "P" : "G"}:${key}`;
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k);
  }
  const cur = rateBuckets.get(bucketKey);
  if (!cur || cur.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  cur.count += 1;
  if (cur.count > limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

// Rejects cross-site POST requests to proxied mutation endpoints (/cart, /contact, /discount, /localization).
export function isSameOriginMutation(request: Request, url = new URL(request.url)): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === url.host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === url.host;
    } catch {
      return false;
    }
  }
  return true;
}

function secure(res: Response) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!h.has(k)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Upstream redirects may only go to our own pages, the live store or Shopify checkout (no open redirect).
export function safeRedirectTarget(loc: string): string | null {
  let abs: URL;
  try { abs = new URL(loc, LIVE); } catch { return null; }
  if (abs.protocol !== "https:") return null;
  const store = /(^|\.)shihiko\.com$/i.test(abs.hostname);
  if (store && !/^\/checkouts?\b/.test(abs.pathname)) return abs.pathname + abs.search.replace(/([?&])country=BD&?/, "$1").replace(/[?&]$/, "") + abs.hash;
  if (store || /(^|\.)(shopify\.com|myshopify\.com|shop\.app)$/i.test(abs.hostname)) return abs.href;
  return null;
}

// Clean page URL -> static copy. Collapses slashes so "//evil.com" can never become an external redirect.
export function staticPagePath(pathname: string, page: string | null): string | null {
  let p = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (/\.\.|%2e|%2f|%5c|\\/i.test(p)) return null;
  const nested = p.match(/^\/collections\/[^/]+\/products\/([^/]+)$/);
  if (nested) p = "/products/" + nested[1];
  if (!p || /\.[a-z0-9]+$/i.test(p) || !/^\/[\w\-/]+$/.test(p)) return null;
  const file = page && /^\d{1,3}$/.test(page) && page !== "1" ? `index.page-${page}.html` : "index.html";
  return `${p}/${file}`;
}

function fixCookie(c: string) {
  return c.split(";").map((s) => s.trim())
    .filter((p) => !/^(domain|secure|partitioned)(=|$)/i.test(p))
    .map((p) => (/^samesite=none$/i.test(p) ? "SameSite=Lax" : p)).join("; ");
}

async function proxy(request: Request, url: URL) {
  const target = new URL(url.pathname + url.search, LIVE);
  const cookie = request.headers.get("cookie") || "";
  if (request.method === "GET" && !/(?:^|;\s*)localization=/.test(cookie) && !target.searchParams.has("country")) {
    target.searchParams.set("country", "BD");
  }
  const headers: Record<string, string> = {
    "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
    accept: request.headers.get("accept") || "*/*",
    origin: LIVE,
    referer: LIVE + "/",
  };
  for (const h of ["cookie", "content-type", "x-requested-with"]) {
    const v = request.headers.get(h);
    if (v) headers[h] = v;
  }
  let body: BodyInit | null = null;
  if (!["GET", "HEAD"].includes(request.method)) {
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return new Response("Payload too large", { status: 413 });
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_BODY) return new Response("Payload too large", { status: 413 });
    body = buf;
  }
  const up = await fetch(target, { method: request.method, headers, body, redirect: "manual" });

  const out = new Headers();
  const type = up.headers.get("content-type") || "";
  if (type) out.set("content-type", type);
  out.set("cache-control", "no-store");
  const cookies = (up.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() || [];
  for (const c of cookies) out.append("set-cookie", fixCookie(c));
  const loc = up.headers.get("location");
  if (loc) {
    const safe = safeRedirectTarget(loc);
    if (safe) out.set("location", safe);
  }
  const isText = /text|json|javascript/.test(type);
  const payload = isText ? rewrite(await up.text()) : await up.arrayBuffer();
  return new Response(up.status === 204 || up.status === 304 ? null : payload, { status: up.status, headers: out });
}

function esc(t: unknown): string {
  return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

const SEARCH_SYNONYMS: Record<string, string> = {
  tshirt: "t-shirts",
  "t-shirt": "t-shirts",
  shirt: "t-shirts",
  tee: "t-shirts",
  tees: "t-shirts",
  hoody: "hoodies",
  hoodie: "hoodies",
  sweatshirt: "sweatshirts",
  crewneck: "sweatshirts",
  sweater: "sweaters",
  knit: "knitwear",
  jacket: "jackets",
  coat: "jackets",
  outerwear: "jackets",
  pant: "trousers",
  pants: "trousers",
  jean: "trousers",
  jeans: "trousers",
  trouser: "trousers",
  jogger: "trousers",
  joggers: "trousers",
  cargo: "trousers",
  bottom: "trousers",
  bottoms: "trousers",
  cap: "accessories",
  beanie: "accessories",
  hat: "accessories",
  hats: "accessories",
  sock: "accessories",
  socks: "accessories",
};

async function buildPredictiveSearchHtml(query: string): Promise<string> {
  const rawTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!rawTerms.length) {
    return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products></div></div></div>`;
  }
  const terms = rawTerms.map((t) => SEARCH_SYNONYMS[t] || t);
  const byHandle = new Map<string, Record<string, unknown>>();
  for (const p of (catalog.products || []) as Array<Record<string, unknown>>) {
    const h = String(p["handle"] || "");
    if (h && !LEGACY_PRODUCT_HANDLES.has(h)) byHandle.set(h, p);
  }
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("products")
        .select("id,handle,title,description,tags,price,images,status,code,size,show_size")
        .in("status", ["active", "reserved", "sold"])
        .limit(100);
      if (Array.isArray(data)) {
        // When live products exist in Supabase, clear the static template fallback so deleted template products don't appear
        if (data.length > 0) byHandle.clear();
        for (const r of data as Array<Record<string, unknown>>) {
          const h = String(r["handle"] || "");
          if (h && !LEGACY_PRODUCT_HANDLES.has(h)) {
            const tagsArr = Array.isArray(r["tags"]) ? (r["tags"] as string[]) : [];
            const catTag = tagsArr.find((t) => typeof t === "string" && t.startsWith("cat:"))?.slice(4) || "";
            byHandle.set(h, {
              ...r,
              category: catTag,
              showSize: r["show_size"],
            });
          }
        }
      }
    } catch {}
  }

  const matches = Array.from(byHandle.values()).filter((p) => {
    const h = String(p["handle"] || "");
    if (!h || LEGACY_PRODUCT_HANDLES.has(h)) return false;
    if (p["status"] && p["status"] !== "active" && p["status"] !== "sold" && p["status"] !== "reserved") return false;
    const skus = Array.isArray(p["skus"]) ? (p["skus"] as string[]).join(" ") : "";
    const variants = Array.isArray(p["variants"])
      ? (p["variants"] as Array<Record<string, unknown>>).map((v) => `${v["sku"] || ""} ${v["id"] || ""} ${v["title"] || ""}`).join(" ")
      : "";
    const code = String(p["code"] || "");
    const size = p["showSize"] !== false ? String(p["size"] || "") : "";
    const cat = String(p["category"] || p["type"] || "");
    const hay = `${p["title"] || ""} ${p["description"] || ""} ${h} ${cat} ${code} ${size} ${Array.isArray(p["tags"]) ? (p["tags"] as string[]).join(" ") : p["tags"] || ""} ${p["id"] || ""} ${skus} ${variants}`.toLowerCase();
    return terms.every((t, i) => hay.includes(t) || Boolean(rawTerms[i] && hay.includes(rawTerms[i]!)));
  }).slice(0, 10);

  if (!matches.length) {
    return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products></div></div></div>`;
  }

  const cards = matches.map((p) => {
    const images = Array.isArray(p["images"]) ? (p["images"] as string[]) : [];
    const img = (typeof p["image"] === "string" ? p["image"] : "") || images[0] || "/_ext/annr-template-001.png";
    const pTitle = esc(p["title"]);
    const price = String(p["price"] || "0").replace(/\.00$/, "");
    const handle = String(p["handle"] || "");
    const code = esc(p["code"] || "");
    const size = p["showSize"] !== false ? esc(p["size"] || "") : "";
    const badgeText = p["status"] === "sold" ? "SOLD / ARCHIVE" : `1 OF 1${size && size !== "NONE" ? ` · SIZE ${size}` : ""}`;
    return `<div class="product-card">
	<div class="product-card-image" style="position:relative">
    <div style="position:absolute;top:6px;left:6px;background:rgba(17,17,17,0.9);color:#fff;font-family:'FK Grotesk SemiMono',monospace;font-size:8px;font-weight:700;padding:2px 6px;letter-spacing:1px;z-index:2">${badgeText}</div>
		<a href="/products/${esc(handle)}/index.html" class="product-card-image-wrapper" aria-label="${pTitle}">
			<img src="${esc(img)}" alt="${pTitle}" loading="lazy" onerror="this.src='/_ext/annr-template-001.png'">
		</a>
	</div>
  ${code ? `<div style="font-family:'FK Grotesk SemiMono',monospace;font-size:9px;color:#e05a2b;font-weight:700;margin-top:6px">${code}</div>` : ""}
	<a href="/products/${esc(handle)}/index.html" class="product-card-title">
		${pTitle}
	</a>
	<div class="product-card-price">
		<span class="money">Tk ${esc(price)}<span class="money-currency-code">BDT</span></span>
	</div>
</div>`;
  }).join("\n");

  return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products>${cards}</div></div></div>`;
}

async function buildAnnrRecommendationSlides(excludeHandle?: string, allowedHandles?: Set<string>): Promise<string> {
  if (!isSupabaseConfigured()) return "";
  try {
    const { data } = await supabase
      .from("products")
      .select("id,handle,title,price,images,status,code,size,show_size")
      .in("status", ["active", "reserved"])
      .order("created_at", { ascending: false })
      .limit(12);
    if (!Array.isArray(data) || data.length === 0) return "";
    const filtered = (data as Array<Record<string, unknown>>).filter((r) => {
      const h = String(r["handle"] || "");
      if (!h || LEGACY_PRODUCT_HANDLES.has(h) || h === "annr-archival-001") return false;
      if (excludeHandle && h === excludeHandle) return false;
      if (allowedHandles && allowedHandles.size > 0 && !allowedHandles.has(h)) return false;
      return true;
    }).slice(0, 8);
    if (!filtered.length) return "";
    return filtered.map((p) => {
      const images = Array.isArray(p["images"]) ? (p["images"] as string[]) : [];
      const img1 = images[0] || "/_ext/annr-template-001.png";
      const img2 = images[1] && images[1] !== img1 ? images[1] : "";
      const pTitle = esc(p["title"]);
      const price = String(p["price"] || "0").replace(/\.00$/, "");
      const handle = esc(p["handle"] || "");
      const code = esc(p["code"] || "");
      const size = p["show_size"] !== false && p["size"] && p["size"] !== "NONE" ? esc(p["size"]) : "";
      const badgeText = `1 OF 1${size ? ` · SIZE ${size}` : ""}`;
      return `<div class="swiper-slide"><div class="product-card" data-handle="${handle}">
  <div class="product-card-image" style="position:relative">
    <div style="position:absolute;top:8px;left:8px;background:rgba(17,17,17,0.92);color:#fff;font-family:'FK Grotesk SemiMono',monospace;font-size:9px;font-weight:700;padding:3px 7px;letter-spacing:1px;z-index:2">${badgeText}</div>
    <a href="/products/${handle}/index.html" class="product-card-image-wrapper" aria-label="${pTitle}">
      <img src="${esc(img1)}" alt="${pTitle}" width="1200" height="1200" loading="lazy" onerror="this.onerror=null;this.src='/_ext/annr-template-001.png'">
      ${img2 ? `<img src="${esc(img2)}" alt="${pTitle}" width="1200" height="1200" loading="lazy" onerror="this.onerror=null;this.src='/_ext/annr-template-001.png'">` : ""}
    </a>
  </div>
  ${code ? `<div style="font-family:'FK Grotesk SemiMono',monospace;font-size:9.5px;color:#e05a2b;letter-spacing:1.4px;margin-top:8px;font-weight:700">${code}</div>` : ""}
  <a href="/products/${handle}/index.html" class="product-card-title">${pTitle}</a>
  <div class="product-card-price"><span class="money">Tk ${esc(price)} <span class="money-currency-code">BDT</span></span></div>
</div></div>`;
    }).join("\n");
  } catch {
    return "";
  }
}

async function handle({ request }: { request: Request }) {
  return secure(await route(request));
}

const LEGACY_VENDOR_STUBS: Record<string, { contentType: string; body: string }> = {
  "/_ext/cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.js": {
    contentType: "application/javascript; charset=utf-8",
    body: "window.TomSelect=window.TomSelect||function(){return{on:function(){},off:function(){},destroy:function(){},setValue:function(){},clear:function(){}}};",
  },
  "/_ext/cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.min.css": {
    contentType: "text/css; charset=utf-8",
    body: "/* tom-select stub */",
  },
  "/_ext/cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js": {
    contentType: "application/javascript; charset=utf-8",
    body: "window.Fancybox=window.Fancybox||{bind:function(){},close:function(){}};",
  },
  "/_ext/cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css": {
    contentType: "text/css; charset=utf-8",
    body: "/* fancybox stub */",
  },
  "/_ext/githubfix.myshopify.com/cdn/shop/t/1/assets/component-1.0.47.js": {
    contentType: "application/javascript; charset=utf-8",
    body: "/* noop */",
  },
  "/_ext/www.googletagmanager.com/gtag/js": {
    contentType: "application/javascript; charset=utf-8",
    body: "window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};",
  },
  "/checkouts/internal/preloads.js": {
    contentType: "application/javascript; charset=utf-8",
    body: "/* noop */",
  },
  "/shopify_pay/accelerated_checkout": {
    contentType: "application/json; charset=utf-8",
    body: "{}",
  },
};

type CloudflareAssetsBinding = {
  fetch(input: Request | string): Promise<Response>;
};

function getCfAssetsBinding(): CloudflareAssetsBinding | null {
  const env = (globalThis as unknown as { __env__?: { ASSETS?: CloudflareAssetsBinding } }).__env__;
  return env?.ASSETS && typeof env.ASSETS.fetch === "function" ? env.ASSETS : null;
}

async function fetchStaticHtml(url: URL, assetPath: string): Promise<Response | null> {
  const cfAssets = getCfAssetsBinding();
  if (cfAssets) {
    const candidates = [assetPath];
    if (assetPath.endsWith("/index.html")) {
      candidates.push(assetPath.slice(0, -"index.html".length));
    }
    for (const candidate of candidates) {
      try {
        let currentUrl = new URL(candidate, url.origin);
        for (let hop = 0; hop < 3; hop += 1) {
          const res = await cfAssets.fetch(new Request(currentUrl.toString(), { method: "GET" }));
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            if (!loc) break;
            const nextUrl = new URL(loc, currentUrl);
            if (nextUrl.origin !== url.origin) break;
            currentUrl = nextUrl;
            continue;
          }
          const ct = res.headers.get("content-type") || "";
          if (res.ok && /text\/html/i.test(ct)) {
            return new Response(res.body, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
            });
          }
          break;
        }
      } catch {
        // try next candidate
      }
    }
  }

  try {
    const res = await fetch(new URL(assetPath, url.origin), {
      headers: { "x-annr-static-check": "1" },
    });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && /text\/html/i.test(ct)) {
      return new Response(res.body, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
  } catch {
    // ignore fetch error
  }
  return null;
}

async function route(request: Request): Promise<Response> {
  if (request.headers.get("x-annr-static-check") === "1") {
    return new Response("Not found", { status: 404 });
  }
  const url = new URL(request.url);
  if (!ALLOWED_METHODS.has(request.method)) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, POST" } });
  if (!isSameOriginMutation(request, url)) return new Response("Forbidden: cross-origin mutation rejected", { status: 403 });
  const stub = LEGACY_VENDOR_STUBS[url.pathname];
  if (stub && (request.method === "GET" || request.method === "HEAD" || (request.method === "POST" && url.pathname === "/shopify_pay/accelerated_checkout"))) {
    return new Response(request.method === "HEAD" ? null : stub.body, {
      status: 200,
      headers: {
        "content-type": stub.contentType,
        "cache-control": "public, max-age=86400",
      },
    });
  }
  if (url.pathname === "/_ext/analytics-events") {
    if (request.method === "GET") {
      return Response.json(
        { events: edgeAnalyticsEvents.slice(-1500) },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
    if (request.method === "POST") {
      const clientIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local").trim().slice(0, 64);
      const rl = checkRateLimit(`analytics:${clientIp}`, "POST");
      if (!rl.allowed) {
        return Response.json({ ok: false }, { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } });
      }
      try {
        const text = await request.text();
        if (text.length <= 64 * 1024) {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed?.events) ? parsed.events.slice(0, 50) : Array.isArray(parsed) ? parsed.slice(0, 50) : [parsed];
          for (const item of list) recordEdgeAnalyticsEvent(item);
        }
      } catch {}
      return Response.json({ ok: true, count: edgeAnalyticsEvents.length }, { status: 200, headers: { "cache-control": "no-store" } });
    }
  }
  if (url.pathname === "/search" || url.pathname === "/search/") {
    return new Response(null, {
      status: 302,
      headers: { location: `/search/index.html${url.search}` },
    });
  }
  if (url.pathname === "/search/suggest") {
    return new Response(await buildPredictiveSearchHtml(url.searchParams.get("q") || ""), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (url.pathname.startsWith("/recommendations/")) {
    let excludeHandle = "";
    const ref = request.headers.get("referer") || "";
    const refMatch = ref.match(/\/products\/([a-zA-Z0-9_-]+)/);
    if (refMatch && refMatch[1]) excludeHandle = refMatch[1];
    const slides = await buildAnnrRecommendationSlides(excludeHandle);
    return new Response(`<div class="shopify-section"><div data-product-list>${slides}</div></div>`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (url.searchParams.get("section_id") === "ajax-product-recently-viewed") {
    const rawProds = (url.searchParams.get("products") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const ref = request.headers.get("referer") || "";
    const refMatch = ref.match(/\/products\/([a-zA-Z0-9_-]+)/);
    const excludeHandle = refMatch && refMatch[1] ? refMatch[1] : "";
    const allowed = new Set(rawProds.filter((h) => h && h !== "annr-archival-001" && !LEGACY_PRODUCT_HANDLES.has(h)));
    const slides = allowed.size > 0 ? await buildAnnrRecommendationSlides(excludeHandle, allowed) : "";
    return new Response(`<div id="product-list">${slides}</div>`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (DYNAMIC.test(url.pathname)) {
    const clientIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local").trim().slice(0, 64);
    const rl = checkRateLimit(clientIp, request.method);
    if (!rl.allowed) {
      return new Response("Too many requests", { status: 429, headers: { "retry-after": String(rl.retryAfterSec), "cache-control": "no-store" } });
    }
    const isPopup = url.pathname === "/cart" && url.searchParams.get("section_id") === "ajax-cart-popup";
    const popupFallback = async () => {
      const staticPopup = await fetchStaticHtml(url, "/_ext/cart-popup-empty.html");
      if (staticPopup) return staticPopup;
      return new Response('<div id="cart-popup" class="cart-popup"></div>', {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    };
    try {
      const res = await proxy(request, url);
      if (isPopup) {
        const text = await res.text();
        if (!res.ok || !text.includes('id="cart-popup"')) return await popupFallback();
        return new Response(text, { status: res.status, headers: res.headers });
      }
      return res;
    } catch {
      if (isPopup) return await popupFallback();
      if (url.pathname === "/cart.js") {
        return Response.json({ token: "offline", items: [], item_count: 0, total_price: 0, currency: "BDT" });
      }
      return new Response("Unavailable", { status: 503 });
    }
  }
  if (request.method === "GET") {
    // Dynamic product page routing & legacy handle redirects
    const prodMatch = url.pathname.match(/^\/products\/([a-zA-Z0-9_-]+)(?:\/index\.html)?\/?$/);
    if (prodMatch && prodMatch[1]) {
      const handle = prodMatch[1];
      if (LEGACY_PRODUCT_HANDLES.has(handle)) {
        return new Response(null, {
          status: 302,
          headers: { location: `/collections/unique-campaign/index.html${url.search}` },
        });
      }
      // Render products through the product template, pre-injecting live Supabase product metadata when available
      const fallbackProd = await fetchStaticHtml(url, "/products/annr-archival-001/index.html");
      if (fallbackProd) {
        if (isSupabaseConfigured()) {
          try {
            const { data: row, error: rowErr } = await supabase
              .from("products")
              .select("id,handle,code,title,description,price,compare_at_price,currency,status,size,show_size,measurement_unit,measurements,fabric,condition,care_instructions,images,tags,stock,reserved_until,created_at")
              .eq("handle", handle)
              .maybeSingle();
            if (!rowErr && row && row.status !== "archived" && row.status !== "draft") {
              let html = await fallbackProd.text();
              const safeTitle = esc(String(row.title || "Archival Piece"));
              const safeImg = esc(String((Array.isArray(row.images) && row.images[0]) || "/_ext/annr-template-001.png"));
              const safeJson = JSON.stringify(row).replace(/</g, "\\u003c");
              html = html
                .replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle} (1 of 1) - AnnR</title>`)
                .replace(/(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["'])/i, `$1${safeTitle} - AnnR$2`)
                .replace(/(<meta\s+property=["']og:image["']\s+content=["'])[^"']*(["'])/i, `$1${safeImg}$2`)
                .replace(/<\/head>/i, `<script>window.__ANNR_SSR_PRODUCT__=${safeJson};</script></head>`);
              return new Response(html, {
                status: 200,
                headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
              });
            }
            if (!rowErr && (!row || row.status === "archived" || row.status === "draft") && url.searchParams.get("preview") !== "1") {
              let html = await fallbackProd.text();
              html = html.replace(/<\/head>/i, `<script>window.__ANNR_PRODUCT_UNAVAILABLE__=true;</script></head>`);
              return new Response(html, {
                status: 404,
                headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
              });
            }
          } catch {}
        }
        return fallbackProd;
      }
    }

    // Dynamic collection page routing & legacy collection redirects
    const colMatch = url.pathname.match(/^\/collections\/([a-zA-Z0-9_-]+)(?:\/index(?:\.page-\d+)?\.html)?\/?$/);
    if (colMatch && colMatch[1]) {
      const colHandle = colMatch[1].toLowerCase();
      if (LEGACY_COLLECTION_HANDLES.has(colHandle)) {
        return new Response(null, {
          status: 302,
          headers: { location: `/collections/unique-campaign/index.html${url.search}` },
        });
      }
      if (BUILTIN_STATIC_COLLECTIONS.has(colHandle)) {
        if (!url.pathname.endsWith("/index.html")) {
          return new Response(null, {
            status: 302,
            headers: { location: `/collections/${colHandle}/index.html${url.search}` },
          });
        }
        const existing = await fetchStaticHtml(url, `/collections/${colHandle}/index.html`);
        if (existing) return existing;
      }
      const fallbackCol = await fetchStaticHtml(url, "/collections/unique-campaign/index.html");
      if (fallbackCol) return fallbackCol;
    }

    // Clean VIP & Account route redirects
    if (/^\/(account|vip)\/?$/i.test(url.pathname)) {
      return new Response(null, {
        status: 302,
        headers: { location: `/account/login/index.html${url.search}` },
      });
    }

    const target = staticPagePath(url.pathname, url.searchParams.get("page"));
    if (target) return new Response(null, { status: 302, headers: { location: target } });
  }
  return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/$")({
  server: {
    handlers: { GET: handle, HEAD: handle, POST: handle, PUT: handle, DELETE: handle, PATCH: handle },
  },
});
