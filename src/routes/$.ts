import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";
import catalog from "../admin/catalog.json";

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

function esc(t: any): string {
  return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

function buildPredictiveSearchHtml(query: string): string {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products></div></div></div>`;
  }
  const matches = (catalog.products || []).filter((p: any) => {
    if (p.status && p.status !== "active") return false;
    const hay = `${p.title} ${p.description || ""} ${p.handle} ${p.type || ""} ${p.tags || ""}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  }).slice(0, 10);

  if (!matches.length) {
    return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products></div></div></div>`;
  }

  const cards = matches.map((p: any) => {
    const img = p.image || (p.images && p.images[0]) || "";
    const pTitle = esc(p.title);
    const price = String(p.price || "0").replace(/\.00$/, "");
    return `<div class="lazy-item product-card">
	<div class="product-card-image">
		<a href="/products/${esc(p.handle)}/index.html" class="product-card-image-wrapper" aria-label="${pTitle}">
			<img src="${esc(img)}" alt="${pTitle}" loading="lazy">
		</a>
	</div>
	<a href="/products/${esc(p.handle)}/index.html" class="product-card-title">
		${pTitle}
	</a>
	<div class="product-card-price">
		<span class="money">Tk ${esc(price)}<span class="money-currency-code">BDT</span></span>
	</div>
</div>`;
  }).join("\n");

  return `<div id="shopify-section-predictive-search-new" class="shopify-section"><div id="predictive-search-new-results"><div class="header-search-new__result-products" data-header-search-new-result-products>${cards}</div></div></div>`;
}

async function handle({ request }: { request: Request }) {
  return secure(await route(request));
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (!ALLOWED_METHODS.has(request.method)) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, POST" } });
  if (!isSameOriginMutation(request, url)) return new Response("Forbidden: cross-origin mutation rejected", { status: 403 });
  if (url.pathname === "/search" || url.pathname === "/search/") {
    return new Response(null, {
      status: 302,
      headers: { location: `/search/index.html${url.search}` },
    });
  }
  if (url.pathname === "/search/suggest") {
    return new Response(buildPredictiveSearchHtml(url.searchParams.get("q") || ""), {
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
    const popupFallback = () =>
      fetch(new URL("/_ext/cart-popup-empty.html", url.origin)).then(
        (r) => new Response(r.body, { headers: { "content-type": "text/html", "cache-control": "no-store" } }),
      );
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
    // Dynamic product page fallback for newly added admin products
    const prodMatch = url.pathname.match(/^\/products\/([a-zA-Z0-9_-]+)(?:\/index\.html)?$/);
    if (prodMatch && prodMatch[1]) {
      const handle = prodMatch[1];
      if (!url.pathname.endsWith("/index.html")) {
        return new Response(null, {
          status: 302,
          headers: { location: `/products/${handle}/index.html${url.search}` },
        });
      }
      const targetFile = path.resolve(process.cwd(), "public", "products", handle, "index.html");
      if (!fs.existsSync(targetFile)) {
        const templateFile = path.resolve(process.cwd(), "public", "products", "aka-manto-longsleeve", "index.html");
        if (fs.existsSync(templateFile)) {
          const templateHtml = fs.readFileSync(templateFile, "utf-8");
          return new Response(templateHtml, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        }
      }
    }

    // Dynamic collection page fallback for newly added collections
    const colMatch = url.pathname.match(/^\/collections\/([a-zA-Z0-9_-]+)(?:\/index\.html)?$/);
    if (colMatch && colMatch[1]) {
      const colHandle = colMatch[1];
      if (!url.pathname.endsWith("/index.html")) {
        return new Response(null, {
          status: 302,
          headers: { location: `/collections/${colHandle}/index.html${url.search}` },
        });
      }
      const targetFile = path.resolve(process.cwd(), "public", "collections", colHandle, "index.html");
      if (!fs.existsSync(targetFile)) {
        const templateFile = path.resolve(process.cwd(), "public", "collections", "all", "index.html");
        if (fs.existsSync(templateFile)) {
          const templateHtml = fs.readFileSync(templateFile, "utf-8");
          return new Response(templateHtml, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        }
      }
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
