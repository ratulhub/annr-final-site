import { useSyncExternalStore } from "react";
import catalog from "./catalog.json";
import { dataSource } from "./services/dataSource";
import { siteDefaults } from "./site/defaults";
import type { SiteConfig } from "./site/types";
import { getSession as getSessionSafe } from "./security/auth";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// Demo-only admin data layer. Everything lives in the browser (localStorage) until a
// real database is connected; swap load/save for API calls later.
export type Variant = { id: string; option: string; sku: string; price: string; stock: number };
export type Campaign = {
  id: string;
  slug: string;
  name: string;
  description: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  status: "draft" | "active" | "ended" | "archived";
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
};
export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  visible: boolean;
};
export type Product = {
  id?: string;
  handle: string;
  code?: string;
  title: string;
  description: string;
  price: string;
  compareAt: string;
  currency: string;
  status: "active" | "draft" | "archived" | "reserved" | "sold";
  vendor: string;
  type: string;
  category?: string;
  campaign?: string;
  tags: string;
  images: string[];
  variants: Variant[];
  collections: string[];
  seoTitle: string;
  seoDescription: string;
  weight: string;
  badge: string;
  featured: boolean;
  trackStock: boolean;
  allowBackorder: boolean;
  sizeChart: string;
  isOneOfOne?: boolean;
  size?: string;
  measurements?: {
    chest?: number | string | null;
    length?: number | string | null;
    shoulder?: number | string | null;
    sleeve?: number | string | null;
    waist?: number | string | null;
    inseam?: number | string | null;
  };
  fabric?: string;
  condition?: string;
  careInstructions?: string;
  stock?: number;
  soldAt?: string;
  reservedUntil?: string;
};
export type Collection = { handle: string; title: string; description: string; image: string; visible: boolean; sort: string; products: string[]; seoTitle: string; seoDescription: string };
export type Page = { handle: string; title: string; body: string; visible: boolean; seoTitle: string; seoDescription: string };
export type Order = { id: string; date: string; customer: string; email: string; total: string; status: string; payment: string; items: string; address: string; note: string };
export type Customer = { id: string; name: string; email: string; phone: string; orders: number; points: number; tier: string; tags: string; blocked: boolean };
export type Discount = { id: string; code: string; type: string; value: string; minOrder: string; uses: number; limit: string; active: boolean; starts: string; ends: string };
export type MenuItem = { id: string; label: string; url: string };
export type AdminUser = { id: string; name: string; email: string; role: string };
export type State = {
  products: Product[];
  categories: Category[];
  campaigns: Campaign[];
  collections: Collection[];
  pages: Page[];
  orders: Order[];
  customers: Customer[];
  discounts: Discount[];
  menus: Record<string, MenuItem[]>;
  admins: AdminUser[];
  theme: Record<string, string | boolean>;
  settings: Record<string, string | boolean>;
  activity: Activity[];
  site: SiteConfig;
};
export type Activity = { id: string; at: string; section: string; action: "added" | "updated" | "deleted"; item: string; fields: string; by: string };

const KEY = "shihiko-admin-v1";
export const uid = () => Math.random().toString(36).slice(2, 9);

function seed(): State {
  const sizes = ["S", "M", "L", "XL"];
  return {
    products: catalog.products.map((p: any) => ({
      handle: p.handle,
      code: p.code || `ANNR-${p.handle.toUpperCase()}`,
      title: p.title,
      description: p.description,
      price: p.price,
      compareAt: "",
      currency: p.currency,
      status: "active" as const,
      vendor: "AnnR",
      type: p.type || "",
      category: p.category || "hoodies",
      campaign: "unique-campaign",
      tags: "",
      images: p.image ? [p.image] : [],
      variants: (p.sizes && p.sizes.length ? p.sizes : sizes).map((s: string) => ({
        id: uid(),
        option: s,
        sku: `${p.handle}-${s}`.toUpperCase(),
        price: p.price,
        stock: 1,
      })),
      collections: [],
      seoTitle: p.title,
      seoDescription: p.description,
      weight: "0.5",
      badge: "1 OF 1",
      featured: false,
      trackStock: true,
      allowBackorder: false,
      sizeChart: "",
      isOneOfOne: true,
      size: "M",
      measurements: { chest: 60, length: 72, shoulder: 50, sleeve: 62 },
      fabric: "480 GSM French Terry",
      condition: "10/10 Archival Deadstock",
      stock: 1,
    })),
    categories: [
      { id: uid(), slug: "hoodies", name: "Hoodies", description: "One-of-one heavyweight archival hoodies crafted from luxury custom fabrics.", imageUrl: "", sortOrder: 1, visible: true },
      { id: uid(), slug: "sweatshirts", name: "Sweatshirts", description: "Unique crewnecks and pullovers with custom cut-and-sew silhouettes.", imageUrl: "", sortOrder: 2, visible: true },
      { id: uid(), slug: "trousers", name: "Trousers", description: "Architectural trousers, tailored cargo bottoms, and bespoke denim pieces.", imageUrl: "", sortOrder: 3, visible: true },
      { id: uid(), slug: "sweaters", name: "Sweaters", description: "Heavy knitwear and textured artisanal sweaters.", imageUrl: "", sortOrder: 4, visible: true },
      { id: uid(), slug: "t-shirts", name: "T-Shirts", description: "Single-edition luxury heavyweight t-shirts with bespoke graphics.", imageUrl: "", sortOrder: 5, visible: true },
      { id: uid(), slug: "jackets", name: "Jackets", description: "Archival statement jackets, bombers, and structured outerwear.", imageUrl: "", sortOrder: 6, visible: true },
      { id: uid(), slug: "knitwear", name: "Knitwear", description: "Handcrafted and technical knit garments.", imageUrl: "", sortOrder: 7, visible: true },
      { id: uid(), slug: "accessories", name: "Accessories", description: "One-off leather goods, flight tags, hats, and hardware.", imageUrl: "", sortOrder: 8, visible: true },
    ],
    campaigns: [
      {
        id: uid(),
        slug: "unique-campaign",
        name: "Unique Campaign",
        description: "Archival One-of-One Collection. Exactly one piece in existence.",
        heroImageUrl: "",
        heroTitle: "Unique Campaign",
        heroSubtitle: "One of one. When it is gone, it is gone.",
        status: "active",
        sortOrder: 1,
      },
    ],
    collections: catalog.collections.map((c) => ({ handle: c.handle, title: c.title, description: c.description, image: c.image, visible: true, sort: "manual", products: [], seoTitle: c.title, seoDescription: c.description })),
    pages: catalog.pages.map((p) => ({ handle: p.handle, title: p.title, body: p.description, visible: true, seoTitle: p.title, seoDescription: p.description })),
    orders: [
      { id: "#1001", date: "2026-10-20", customer: "Arif Hasan", email: "arif@example.com", total: "8,600.00", status: "Unfulfilled", payment: "Paid", items: "Archival One-of-One Piece × 1", address: "Dhaka", note: "" },
      { id: "#1002", date: "2026-10-22", customer: "Nadia Islam", email: "nadia@example.com", total: "19,600.00", status: "Fulfilled", payment: "Paid", items: "Archival One-of-One Piece × 1", address: "Chattogram", note: "" },
    ],
    customers: [
      { id: uid(), name: "Arif Hasan", email: "arif@example.com", phone: "+8801700000000", orders: 1, points: 86, tier: "Bronze", tags: "", blocked: false },
      { id: uid(), name: "Nadia Islam", email: "nadia@example.com", phone: "+8801800000000", orders: 1, points: 196, tier: "Silver", tags: "vip", blocked: false },
    ],
    discounts: [{ id: uid(), code: "WELCOME10", type: "percentage", value: "10", minOrder: "0", uses: 0, limit: "", active: true, starts: "", ends: "" }],
    menus: {
      main: [
        { id: uid(), label: "UNIQUE CAMPAIGN", url: "/collections/unique-campaign/index.html" },
        { id: uid(), label: "HOODIES", url: "/collections/hoodies/index.html" },
        { id: uid(), label: "SWEATSHIRTS", url: "/collections/sweatshirts/index.html" },
        { id: uid(), label: "TROUSERS", url: "/collections/trousers/index.html" },
        { id: uid(), label: "SWEATERS", url: "/collections/sweaters/index.html" },
        { id: uid(), label: "T-SHIRTS", url: "/collections/t-shirts/index.html" },
        { id: uid(), label: "JACKETS", url: "/collections/jackets/index.html" },
        { id: uid(), label: "KNITWEAR", url: "/collections/knitwear/index.html" },
        { id: uid(), label: "ACCESSORIES", url: "/collections/accessories/index.html" },
        { id: uid(), label: "ALL PIECES", url: "/collections/all/index.html" },
      ],
      footer: [{ id: uid(), label: "FAQ", url: "/pages/faq/index.html" }, { id: uid(), label: "Shipping", url: "/pages/shipping-policy/index.html" }],
    },
    admins: [{ id: uid(), name: "Ratul", email: "ratul123@gmail.com", role: "super_admin" }],
    theme: {
      primary: "#000000", background: "#ffffff", accent: "#e10600", text: "#000000",
      headingFont: "Druk Wide", bodyFont: "NB Architekt Std", monoFont: "FK Grotesk SemiMono",
      announcement: "FREE SHIPPING ON ORDERS OVER ৳5,000", announcementOn: true, logo: "/cdn/shop/t/75/assets/image_logo.svg",
      heroTitle: "ANNR", heroSubtitle: "", heroVideo: "", heroButton: "SHOP NOW", heroLink: "/collections/all/index.html",
      pageTransition: true, cartDrawer: true, freeGift: true, quickView: true, productsPerRow: "4", productsPerPage: "24",
    },
    settings: {
      storeName: "AnnR", email: "support@annr.com", phone: "", address: "Dhaka, Bangladesh", currency: "BDT",
      shippingDhaka: "80", shippingOutside: "150", freeShippingOver: "5000", taxRate: "0", codEnabled: true,
      instagram: "", facebook: "", tiktok: "", maintenance: false, checkoutUrl: "https://annr.com/checkout",
      metaTitle: "AnnR | Streetwear Clothing & Fashion Online Store", metaDescription: "", pointsPerTaka: "1",
    },
    activity: [],
    site: siteDefaults(),
  };
}

let state: State | null = null;
const subs = new Set<() => void>();
function get(): State {
  if (!state) {
    try { const raw = dataSource.read<State>(KEY); const base = seed(); state = raw ? { ...base, ...raw, site: { ...base.site, ...(raw.site || {}) } } : base; }
    catch { state = seed(); }
  }
  return state!;
}
// Compare two states and describe every change (section, item, fields).
type Change = Omit<Activity, "id" | "at" | "by">;
const label = (o: Record<string, unknown>) => String(o["title"] || o["name"] || o["code"] || o["label"] || o["id"] || o["handle"] || "item");
const keyOf = (o: Record<string, unknown>) => String(o["handle"] ?? o["id"] ?? "");
function diffList(section: string, a: Record<string, unknown>[], b: Record<string, unknown>[], out: Change[]) {
  const am = new Map(a.map((x) => [keyOf(x), x])), bm = new Map(b.map((x) => [keyOf(x), x]));
  for (const [k, x] of bm) {
    const old = am.get(k);
    if (!old) { out.push({ section, action: "added", item: label(x), fields: "" }); continue; }
    if (old === x) continue;
    const f = Object.keys({ ...old, ...x }).filter((f) => JSON.stringify(old[f]) !== JSON.stringify(x[f]));
    if (f.length) out.push({ section, action: "updated", item: label(x), fields: f.join(", ") });
  }
  for (const [k, x] of am) if (!bm.has(k)) out.push({ section, action: "deleted", item: label(x), fields: "" });
}
export function diffStates(a: State, b: State): Change[] {
  const out: Change[] = [];
  for (const sec of ["products", "categories", "campaigns", "collections", "pages", "orders", "customers", "discounts", "admins"] as const)
    if (a[sec] !== b[sec]) diffList(sec, a[sec] || [], b[sec] || [], out);
  if (a.site !== b.site) for (const k of Object.keys({ ...a.site, ...b.site }) as (keyof SiteConfig)[])
    if (JSON.stringify(a.site?.[k]) !== JSON.stringify(b.site?.[k])) out.push({ section: "website", action: "updated", item: k, fields: "draft" });
  if (a.menus !== b.menus) for (const m of new Set([...Object.keys(a.menus || {}), ...Object.keys(b.menus || {})]))
    if (JSON.stringify(a.menus?.[m]) !== JSON.stringify(b.menus?.[m])) out.push({ section: "navigation", action: "updated", item: m + " menu", fields: "items" });
  for (const sec of ["theme", "settings"] as const) if (a[sec] !== b[sec]) {
    const f = Object.keys({ ...a[sec], ...b[sec] }).filter((k) => a[sec]?.[k] !== b[sec]?.[k]);
    if (f.length) out.push({ section: sec, action: "updated", item: sec === "theme" ? "Theme & design" : "Store settings", fields: f.join(", ") });
  }
  return out;
}
const MERGE_MS = 5000; // typing in one field merges into one entry
export function setSite<K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) { setState((x) => ({ ...x, site: { ...x.site, [k]: v } })); }
export function setState(fn: (s: State) => State) {
  const prev = get();
  const next = fn(prev);
  const log = [...(next.activity || [])];
  const now = new Date();
  for (const c of diffStates(prev, next)) {
    const last = log[0];
    if (last && c.action === "updated" && last.action === "updated" && last.section === c.section && last.item === c.item && last.fields === c.fields && now.getTime() - new Date(last.at).getTime() < MERGE_MS) {
      log[0] = { ...last, at: now.toISOString() };
    } else log.unshift({ id: uid(), at: now.toISOString(), by: getSessionSafe()?.email || "unknown", ...c });
  }
  state = { ...next, activity: log.slice(0, 1000) };
  persist(state);
  subs.forEach((f) => f());
}
export function clearActivity() { state = { ...get(), activity: [] }; persist(state); subs.forEach((f) => f()); }
export function resetState() { dataSource.clear(KEY); dataSource.clear(DRAFT_KEY); state = null; subs.forEach((f) => f()); }

// Draft vs published. Admin edits change the draft (this state). Publish copies the
// store-facing part into PUB_KEY, which the store pages read; DRAFT_KEY feeds ?preview=1.
const PUB_KEY = "shihiko-site-config", DRAFT_KEY = "shihiko-site-draft", HIST_KEY = "shihiko-site-history";
let seedCache: State | null = null;
const PUBLIC_FIELDS = {
  products: ["title", "price", "compareAt", "status", "seoTitle", "seoDescription", "description", "badge", "images", "sizeChart", "variants", "trackStock", "allowBackorder", "collections"],
  collections: ["title", "description", "image", "seoTitle", "seoDescription", "visible", "sort", "products"],
  pages: ["title", "seoTitle", "seoDescription", "visible", "body"],
} as const;
export function siteConfig(s: State) {
  const base = (seedCache ||= seed());
  const out: Record<"products" | "collections" | "pages", Record<string, unknown>> = { products: {}, collections: {}, pages: {} };
  for (const sec of ["products", "collections", "pages"] as const) {
    const orig = new Map<string, Record<string, unknown>>(base[sec].map((x) => [x.handle, x as unknown as Record<string, unknown>]));
    for (const item of s[sec] as Array<Record<string, unknown>>) {
      const o = orig.get(item["handle"] as string); const d: Record<string, unknown> = {};
      for (const f of PUBLIC_FIELDS[sec]) if (!o || JSON.stringify(o[f]) !== JSON.stringify(item[f])) d[f] = item[f];
      if (sec === "collections" || sec === "pages") {
        d["visible"] = item["visible"] !== false;
      }
      if (Object.keys(d).length) out[sec][item["handle"] as string] = d;
    }
  }

  const currentProductHandles = new Set(s.products.map((p) => p.handle));
  const deletedProducts: string[] = [];
  for (const p of base.products) {
    if (!currentProductHandles.has(p.handle)) {
      deletedProducts.push(p.handle);
      out.products[p.handle] = { deleted: true, status: "deleted" };
    }
  }

  const currentColHandles = new Set(s.collections.map((c) => c.handle));
  const deletedCollections: string[] = [];
  for (const c of base.collections) {
    if (!currentColHandles.has(c.handle)) {
      deletedCollections.push(c.handle);
      out.collections[c.handle] = { deleted: true, visible: false };
    }
  }

  const currentPageHandles = new Set(s.pages.map((p) => p.handle));
  const deletedPages: string[] = [];
  for (const pg of base.pages) {
    if (!currentPageHandles.has(pg.handle)) {
      deletedPages.push(pg.handle);
      out.pages[pg.handle] = { deleted: true, visible: false };
    }
  }

  return {
    ...out,
    allCollections: s.collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      visible: c.visible !== false,
      sort: c.sort,
    })),
    site: s.site,
    defaults: base.site,
    catalog: s.products.map((p) => ({
      handle: p.handle,
      title: p.title,
      price: p.price,
      compareAt: p.compareAt || "",
      image: p.images[0] || "",
      image2: p.images[1] || "",
      description: p.description || "",
      badge: p.badge || "",
      collections: p.collections || [],
      status: p.status,
    })),
    deletedProducts,
    deletedCollections,
    deletedPages,
    publishedAt: new Date().toISOString(),
  };
}
export type Published = ReturnType<typeof siteConfig>;
function persist(s: State) {
  dataSource.write(KEY, s);
  const cfg = siteConfig(s);
  dataSource.write(DRAFT_KEY, cfg);
  dataSource.write(PUB_KEY, cfg);
}
export const getPublished = () => dataSource.read<Published>(PUB_KEY);
export const getHistory = () => dataSource.read<{ at: string; state: State }[]>(HIST_KEY) || [];
export function publish() {
  const s = get();
  const hist = getHistory();
  hist.unshift({ at: new Date().toISOString(), state: { ...s, activity: [] } });
  try { dataSource.write(HIST_KEY, hist.slice(0, 10)); } catch { dataSource.write(HIST_KEY, hist.slice(0, 2)); }
  const pubCfg = siteConfig(s);
  dataSource.write(PUB_KEY, pubCfg);
  const act = { id: uid(), at: new Date().toISOString(), by: getSessionSafe()?.email || "unknown", section: "publish", action: "updated" as const, item: "Website", fields: "published draft" };
  state = { ...s, activity: [act, ...s.activity].slice(0, 1000), publishedAt: act.at } as State;
  dataSource.write(KEY, state); subs.forEach((f) => f());

  // Also publish to Supabase if configured
  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await supabase.from("site_config_versions").update({ is_published: false }).eq("is_published", true);
        await supabase.from("site_config_versions").insert({
          config: pubCfg,
          is_published: true,
          note: `Published by ${getSessionSafe()?.email || "admin"}`,
        });
      } catch (err) {
        console.warn("Notice: Supabase publish synced locally (DB pending table migration)", err);
      }
    })();
  }
}
// Throw away unpublished edits: go back to the last published version (or original).
export function discardDraft() {
  const h = getHistory()[0];
  const next = h ? { ...h.state, activity: get().activity } : { ...seed(), activity: get().activity };
  state = next; persist(next); subs.forEach((f) => f());
}
export function restoreVersion(i: number) {
  const h = getHistory()[i]; if (!h) return;
  setState((x) => ({ ...h.state, activity: x.activity }));
}
export function unpublishAll() { dataSource.clear(PUB_KEY); subs.forEach((f) => f()); }
export function replaceState(s: State) { setState(() => s); }
export function useAdmin(): State {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, get, get);
}

// Demo login only (no database yet). See src/admin/security/auth.ts — no plaintext password in the bundle.
export { login, logout, getSession } from "./security/auth";
export const isLoggedIn = () => !!getSessionSafe();
