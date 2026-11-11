import { useSyncExternalStore } from "react";
import catalog from "./catalog.json";
import { dataSource } from "./services/dataSource";
import { siteDefaults } from "./site/defaults";
import type { SiteConfig } from "./site/types";
import { getSession as getSessionSafe } from "./security/auth";
import { normalizeDbImageUrl, normalizeProductCode, normalizeProductHandle } from "./security/sanitize";
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
  showSize?: boolean;
  measurementUnit?: "in" | "cm";
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

export const LEGACY_PRODUCT_HANDLES = new Set([
  "aka-manto-longsleeve",
  "divine-sanctum-tee",
  "ruin-and-rebirth-varsity-jacket",
  "blue-moon-long-sleeve",
  "hound-of-hades-tee",
  "ruin-and-rebirth-reversible-hoodie",
]);

export const LEGACY_COLLECTION_HANDLES = new Set([
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

export const TEMPLATE_PRODUCT: Product = {
  handle: "annr-archival-001",
  code: "ANNR-001",
  title: "Archival Heavyweight Hoodie 001",
  description: "One-of-one archival cut-and-sew piece. Handcrafted from 480 GSM Japanese French Terry with bespoke distressing and custom hardware. Exactly one garment in existence worldwide. Once acquired, this piece is permanently archived.",
  price: "9,800.00",
  compareAt: "12,500.00",
  currency: "BDT",
  status: "active",
  vendor: "AnnR",
  type: "Hoodie",
  category: "hoodies",
  campaign: "unique-campaign",
  tags: "unique, 1-of-1, archival, heavyweight",
  images: ["/_ext/annr-template-001.png"],
  variants: [
    {
      id: "var-001",
      option: "L",
      sku: "ANNR-001",
      price: "9,800.00",
      stock: 1,
    },
  ],
  collections: ["unique-campaign", "all", "hoodies"],
  seoTitle: "Archival Heavyweight Hoodie 001 — AnnR 1-of-1",
  seoDescription: "One-of-one archival piece. Handcrafted in Dhaka. Exactly one piece available worldwide.",
  weight: "0.8",
  badge: "1 OF 1",
  featured: true,
  trackStock: true,
  allowBackorder: false,
  sizeChart: "",
  isOneOfOne: true,
  size: "L",
  showSize: true,
  measurementUnit: "in",
  measurements: { chest: 24.5, length: 29, shoulder: 20.5, sleeve: 25 },
  fabric: "480 GSM Custom Heavyweight French Terry",
  condition: "10/10 Archival Deadstock",
  careInstructions: "Dry Clean or Cold Hand Wash Only",
  stock: 1,
};

function seed(): State {
  return {
    products: [TEMPLATE_PRODUCT],
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
    orders: [],
    customers: [],
    discounts: [],
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
    admins: [
      { id: "owner-arahim", name: "Rahim Ratul", email: "arahimratul2004@gmail.com", role: "super_admin" },
    ],
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
    try {
      const raw = dataSource.read<State>(KEY);
      const base = seed();
      if (raw) {
        let dirty = false;
        const rawProds = Array.isArray(raw.products) ? raw.products : [];
        let prods = rawProds
          .filter((p: any) => p && p.handle && !LEGACY_PRODUCT_HANDLES.has(p.handle))
          .map((p: Product) => {
            if (Array.isArray(p.images) && p.images.some((u) => /AkaManto|Bakeneko|BAKENEKO2|DiscordBanner|DivineSanctum|SANCTUMTEE|HoundOfHades|hades_back|BlueMoon|RuinAndRebirth|backhoodie_white|RUINMODEL|Shihiko_2nd_Logo|Shihiko Logo White|SHIHIKOSOCKS|shihiko\.com/i.test(u))) {
              dirty = true;
              return {
                ...p,
                images: p.images.map((u) =>
                  /AkaManto|Bakeneko|BAKENEKO2|DiscordBanner|DivineSanctum|SANCTUMTEE|HoundOfHades|hades_back|BlueMoon|RuinAndRebirth|backhoodie_white|RUINMODEL|Shihiko_2nd_Logo|Shihiko Logo White|SHIHIKOSOCKS|shihiko\.com/i.test(u)
                    ? "/_ext/annr-template-001.png"
                    : u,
                ),
              };
            }
            return p;
          });
        if (prods.length !== rawProds.length) dirty = true;
        if (prods.length === 0) {
          prods = [TEMPLATE_PRODUCT];
          dirty = true;
        }

        const rawCols = Array.isArray(raw.collections) ? raw.collections : [];
        const hasLegacyCols = rawCols.some((c: any) => c && LEGACY_COLLECTION_HANDLES.has(c.handle));
        let cols = rawCols.filter((c: any) => c && c.handle && !LEGACY_COLLECTION_HANDLES.has(c.handle));
        if (hasLegacyCols || cols.length === 0) {
          cols = base.collections;
          dirty = true;
        }

        const rawOrders = Array.isArray(raw.orders) ? raw.orders : [];
        const ords = rawOrders.filter(
          (o: any) =>
            o &&
            o.customer !== "Arif Hasan" &&
            o.customer !== "Nadia Islam" &&
            !(typeof o.items === "string" && /Aka Manto|Divine Sanctum/i.test(o.items)),
        );
        if (ords.length !== rawOrders.length) {
          dirty = true;
          try { localStorage.removeItem("annr-orders"); } catch {}
        }

        const rawCusts = Array.isArray(raw.customers) ? raw.customers : [];
        const custs = rawCusts.filter(
          (c: any) =>
            c &&
            c.name !== "Arif Hasan" &&
            c.name !== "Nadia Islam" &&
            c.email !== "nadia@example.com" &&
            c.email !== "arif@example.com",
        );
        if (custs.length !== rawCusts.length) dirty = true;

        const rawAdmins = Array.isArray(raw.admins) ? raw.admins : [];
        const admins = rawAdmins.filter((a: any) => a && a.email?.toLowerCase() !== "ratul123@gmail.com");
        if (!admins.some((a: any) => a.email?.toLowerCase() === "arahimratul2004@gmail.com")) {
          admins.unshift(base.admins[0]!);
          dirty = true;
        }
        if (admins.length !== rawAdmins.length) dirty = true;

        const mergedSite = { ...base.site, ...(raw.site || {}) };
        if (Array.isArray(mergedSite.events)) {
          const cleanEvents = mergedSite.events.filter(
            (ev: any) => ev && ev.id !== "gwp-launch" && ev.id !== "event-capsule-drop" && !/UWUSOCKS1|Midnight Vault/i.test(JSON.stringify(ev)),
          );
          if (cleanEvents.length !== mergedSite.events.length) {
            mergedSite.events = cleanEvents;
            dirty = true;
          }
        }
        if (Array.isArray(mergedSite.header?.items) && mergedSite.header.items.some((it: any) => it.label === "New In" && String(it.url).includes("all/index.html?sort_by"))) {
          mergedSite.header = base.site.header;
          dirty = true;
        }

        const rawCats = Array.isArray(raw.categories) ? raw.categories : [];
        const LEGACY_CATEGORY_SLUGS = new Set(["tees", "bottoms", "longsleeves", "outwear", "outerwear", "jeans", "joggers", "hats", "socks", "flight-tags-keychains"]);
        const hasLegacyCats = rawCats.some((c: any) => c && (LEGACY_CATEGORY_SLUGS.has(c.slug) || LEGACY_COLLECTION_HANDLES.has(c.slug)));
        const cats = hasLegacyCats || !rawCats.length ? base.categories : rawCats;
        if (hasLegacyCats) dirty = true;

        const mainMenu: MenuItem[] =
          hasLegacyCols || hasLegacyCats
            ? (base.menus["main"] ?? [])
            : (raw.menus?.["main"] ?? base.menus["main"] ?? []);
        const cleanMenus: Record<string, MenuItem[]> = {
          ...base.menus,
          ...(raw.menus ?? {}),
          main: mainMenu,
        };

        const nextState: State = {
          ...base,
          ...raw,
          products: prods,
          categories: cats,
          campaigns: Array.isArray(raw.campaigns) && raw.campaigns.length ? raw.campaigns : base.campaigns,
          collections: cols,
          orders: ords,
          customers: custs,
          admins,
          menus: cleanMenus,
          activity: dirty && rawOrders.length !== ords.length ? [] : raw.activity || [],
          site: mergedSite,
        };
        state = nextState;

        if (dirty) {
          persist(nextState);
        }
      } else {
        state = base;
        persist(state);
      }
    } catch {
      state = seed();
    }
  }
  return state!;
}

export function wipeAllDemoData() {
  const base = seed();
  setState((prev) => ({
    ...prev,
    products: [TEMPLATE_PRODUCT],
    categories: base.categories,
    campaigns: base.campaigns,
    collections: base.collections,
    menus: base.menus,
    orders: [],
    customers: [],
    discounts: [],
    activity: [],
    site: {
      ...prev.site,
      events: [],
      texts: [],
      images: [],
      media: [],
      header: base.site.header,
    },
  }));
  try {
    localStorage.removeItem("annr-orders");
    localStorage.removeItem("annr_live_products");
    localStorage.removeItem("annr-cart");
    localStorage.removeItem("shihiko-cart");
    localStorage.removeItem("annr_reservation");
  } catch {}
  publish();
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
  products: [
    "code",
    "title",
    "price",
    "compareAt",
    "currency",
    "status",
    "seoTitle",
    "seoDescription",
    "description",
    "badge",
    "images",
    "size",
    "showSize",
    "measurementUnit",
    "measurements",
    "category",
    "campaign",
    "fabric",
    "condition",
    "careInstructions",
    "stock",
    "isOneOfOne",
    "tags",
    "sizeChart",
    "variants",
    "trackStock",
    "allowBackorder",
    "collections",
  ],
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
      id: p.id || "",
      handle: p.handle,
      code: p.code || "",
      title: p.title,
      price: p.price,
      compareAt: p.compareAt || "",
      currency: p.currency || "BDT",
      image: p.images[0] || "",
      image2: p.images[1] || "",
      images: p.images || [],
      description: p.description || "",
      badge: p.badge || "1 OF 1",
      category: p.category || "hoodies",
      campaign: p.campaign || "unique-campaign",
      collections: p.collections || [],
      size: p.size || "L",
      showSize: p.showSize !== false,
      measurementUnit: "in" as const,
      measurements: p.measurements || {},
      fabric: p.fabric || "",
      condition: p.condition || "",
      careInstructions: p.careInstructions || "",
      stock: p.status === "sold" ? 0 : (p.stock ?? 1),
      isOneOfOne: p.isOneOfOne !== false,
      tags: p.tags || "",
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || "",
      sizeChart: p.sizeChart || "",
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
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem("annr_live_products");
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("annr:products:updated"));
  } catch {}
}

const isUuidStr = (v?: string | null) =>
  Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));

const parseNumPrice = (v?: string | number | null) =>
  parseFloat(String(v ?? "0").replace(/[^0-9.-]/g, "")) || 0;

export async function syncProductToSupabase(
  product: Product,
): Promise<{ ok: boolean; error?: string; skippedLocalImages?: number; rejectedHttpImages?: number }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase not configured" };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return {
        ok: false,
        error: "No live Supabase Auth session active — sign out and sign in with your Supabase admin email/password to sync products to live DB.",
      };
    }

    const cleanMeas: Record<string, number> = {};
    const mObj = product.measurements || {};
    (["chest", "length", "shoulder", "sleeve", "waist", "inseam"] as const).forEach((k) => {
      const val = Number(mObj[k]);
      if (Number.isFinite(val) && val > 0 && val <= 500) {
        cleanMeas[k] = val;
      }
    });

    const catSlug = product.category || "hoodies";
    const campSlug = product.campaign || "unique-campaign";
    const baseTags = String(product.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith("cat:") && !t.startsWith("camp:") && t !== "__hide_size" && !t.startsWith("__unit:"));
    if (catSlug) baseTags.push(`cat:${catSlug}`);
    if (campSlug && campSlug !== "none") baseTags.push(`camp:${campSlug}`);
    if (product.showSize === false) baseTags.push("__hide_size");
    baseTags.push("__unit:in");

    let categoryId: string | null = isUuidStr(product.category) ? product.category! : null;
    let campaignId: string | null = campSlug === "none" ? null : isUuidStr(product.campaign) ? product.campaign! : null;

    if (!categoryId && catSlug) {
      const { data: catRow } = await supabase.from("categories").select("id").eq("slug", catSlug).maybeSingle();
      if (catRow?.id) categoryId = catRow.id;
    }
    if (!campaignId && campSlug && campSlug !== "none") {
      const { data: campRow } = await supabase.from("campaigns").select("id").eq("slug", campSlug).maybeSingle();
      if (campRow?.id) campaignId = campRow.id;
    }

    const rawImages = Array.isArray(product.images) ? product.images : [];
    let localDataCount = 0;
    let rejectedHttpImages = 0;
    const remoteImages: string[] = [];
    for (const rawUrl of rawImages) {
      const s = String(rawUrl ?? "").trim();
      if (!s) continue;
      if (/^data:image\//i.test(s)) {
        localDataCount++;
        continue;
      }
      const cleanUrl = normalizeDbImageUrl(s);
      if (cleanUrl) {
        if (!remoteImages.includes(cleanUrl) && remoteImages.length < 12) {
          remoteImages.push(cleanUrl);
        }
      } else {
        rejectedHttpImages++;
      }
    }

    const cleanHandle = normalizeProductHandle(product.handle);
    const cleanCode = normalizeProductCode(product.code);
    const numPrice = Math.max(0, Math.round(parseNumPrice(product.price) * 100) / 100);
    const numCompareAt = parseNumPrice(product.compareAt);

    const payload: Record<string, unknown> = {
      handle: cleanHandle,
      title: product.title || "Untitled Piece",
      description: product.description || "",
      product_type: catSlug || product.type || "hoodies",
      vendor: product.vendor || "AnnR",
      tags: Array.from(new Set(baseTags)),
      price: numPrice,
      compare_at_price: numCompareAt > 0 ? Math.round(numCompareAt * 100) / 100 : null,
      currency: (product.currency || "BDT").slice(0, 3),
      images: remoteImages,
      seo_title: product.seoTitle || "",
      seo_description: product.seoDescription || "",
      status: product.status || "active",
      code: cleanCode,
      size: product.size || "L",
      show_size: product.showSize !== false,
      measurement_unit: "in",
      measurements: cleanMeas,
      fabric: product.fabric || null,
      condition: product.condition || null,
      care_instructions: product.careInstructions || null,
      stock: product.status === "sold" ? 0 : (product.stock ?? 1),
      campaign_id: campSlug === "none" ? null : campaignId,
      updated_at: new Date().toISOString(),
    };

    if (categoryId) payload["category_id"] = categoryId;

    let { error } = await supabase.from("products").upsert(payload, { onConflict: "handle" });
    if (error && /show_size|measurement_unit|care_instructions|column/i.test(error.message)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload["show_size"];
      delete fallbackPayload["measurement_unit"];
      delete fallbackPayload["care_instructions"];
      const retry = await supabase.from("products").upsert(fallbackPayload, { onConflict: "handle" });
      error = retry.error;
    }

    if (error) return { ok: false, error: error.message, skippedLocalImages: localDataCount, rejectedHttpImages };
    return { ok: true, skippedLocalImages: localDataCount, rejectedHttpImages };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function deleteProductFromSupabase(handle: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  if (!handle) return { ok: false, error: "Missing product handle" };
  try {
    const { error } = await supabase.from("products").delete().eq("handle", handle);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
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
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("annr:products:updated"));
      window.dispatchEvent(new CustomEvent("annr:categories:updated"));
    }
  } catch {}

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
