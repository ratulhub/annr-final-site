import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import catalog from "../admin/catalog.json";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type SearchProduct = {
  handle: string;
  title: string;
  price?: number | undefined;
  code?: string | undefined;
  size?: string | undefined;
  showSize?: boolean | undefined;
  status?: string | undefined;
  images?: string[] | undefined;
};

export const Route = createFileRoute("/search")({ component: SearchPage });

const LEGACY_PRODUCT_HANDLES = new Set([
  "aka-manto-longsleeve",
  "divine-sanctum-tee",
  "ruin-and-rebirth-varsity-jacket",
  "blue-moon-long-sleeve",
  "hound-of-hades-tee",
  "ruin-and-rebirth-reversible-hoodie",
]);

function safeImgSrc(url?: string): string {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") || "";
    setQuery(initial);
    void searchProducts(initial);
  }, []);

  async function searchProducts(term: string) {
    setLoading(true);
    const q = term.trim().toLowerCase();
    try {
      const mapRow = (row: any): SearchProduct => {
        const tags: string[] = Array.isArray(row.tags)
          ? row.tags
          : String(row.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        return {
          handle: String(row.handle || ""),
          title: String(row.title || ""),
          price: typeof row.price === "number" ? row.price : parseFloat(String(row.price || "0").replace(/,/g, "")) || 0,
          code: row.code || "",
          size: row.size || "",
          showSize: row.show_size !== undefined ? row.show_size !== false : (row.showSize !== false && !tags.includes("__hide_size")),
          status: row.status || "active",
          images: Array.isArray(row.images) ? row.images : (row.image ? [row.image] : []),
        };
      };

      const filterList = (list: SearchProduct[]) =>
        list.filter((product) => {
          if (!product.handle || LEGACY_PRODUCT_HANDLES.has(product.handle)) return false;
          if (product.status && !["active", "reserved", "sold"].includes(product.status)) return false;
          if (!q) return true;
          const searchableSize = product.showSize !== false ? (product.size || "") : "";
          return `${product.title} ${product.handle} ${product.code || ""} ${searchableSize}`
            .toLowerCase()
            .includes(q);
        });

      const mergedMap = new Map<string, SearchProduct>();

      // Base catalog fallback
      ((catalog.products || []) as any[]).forEach((raw) => {
        const item = mapRow(raw);
        if (item.handle && !LEGACY_PRODUCT_HANDLES.has(item.handle)) mergedMap.set(item.handle, item);
      });

      // Cached live remote products
      try {
        const rawLive = localStorage.getItem("annr_live_products");
        if (rawLive) {
          const parsed = JSON.parse(rawLive);
          if (Array.isArray(parsed)) {
            parsed.forEach((raw: any) => {
              const item = mapRow(raw);
              if (item.handle && !LEGACY_PRODUCT_HANDLES.has(item.handle)) mergedMap.set(item.handle, item);
            });
          }
        }
      } catch {}

      // Supabase live query (retry without show_size if migration 16 not yet run)
      if (isSupabaseConfigured()) {
        let res = await supabase
          .from("products")
          .select("handle,title,price,code,size,show_size,status,images,tags")
          .in("status", ["active", "reserved", "sold"])
          .order("updated_at", { ascending: false });
        if (res.error && /show_size|column/i.test(res.error.message || "")) {
          res = await supabase
            .from("products")
            .select("handle,title,price,code,size,status,images,tags")
            .in("status", ["active", "reserved", "sold"])
            .order("updated_at", { ascending: false }) as typeof res;
        }
        if (!res.error && Array.isArray(res.data)) {
          res.data.forEach((raw: any) => {
            const item = mapRow(raw);
            if (item.handle && !LEGACY_PRODUCT_HANDLES.has(item.handle)) mergedMap.set(item.handle, item);
          });
        }
      }

      // Local admin edits override in this browser
      try {
        const rawAdm = localStorage.getItem("shihiko-admin-v1");
        if (rawAdm) {
          const parsed = JSON.parse(rawAdm);
          if (parsed && Array.isArray(parsed.products)) {
            parsed.products.forEach((raw: any) => {
              const item = mapRow(raw);
              if (item.handle && !LEGACY_PRODUCT_HANDLES.has(item.handle)) mergedMap.set(item.handle, item);
            });
          }
        }
      } catch {}

      setProducts(filterList(Array.from(mergedMap.values())));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-sm text-muted-foreground">
            ← AnnR store
          </Link>
          <a href="/account/login/index.html" className="text-sm">
            VIP
          </a>
        </div>
        <h1 className="text-3xl font-bold">Search AnnR</h1>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void searchProducts(query);
            window.history.replaceState(
              {},
              "",
              `/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
            );
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            className="min-w-0 flex-1 rounded border bg-background px-3 py-2"
          />
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground">Search</button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          {loading
            ? "Searching..."
            : `${products.length} result${products.length === 1 ? "" : "s"}`}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isSold = product.status === "sold";
            const imgSrc = safeImgSrc(product.images?.[0]);
            return (
              <a
                key={product.handle}
                href={`/products/${product.handle}/index.html`}
                className="group relative flex flex-col justify-between rounded-lg border bg-card p-5 transition-all hover:border-foreground"
              >
                <div>
                  {imgSrc && (
                    <div className="mb-3 aspect-square w-full overflow-hidden rounded bg-muted">
                      <img src={imgSrc} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${isSold ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                      {isSold
                        ? "SOLD / ARCHIVE"
                        : (product.showSize !== false && product.size)
                          ? `1 OF 1 · SIZE ${product.size}`
                          : "1 OF 1 · PIECE"}
                    </span>
                    {product.code && (
                      <span className="font-mono text-xs font-semibold text-[#e05a2b]">
                        {product.code}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-foreground group-hover:underline">
                    {product.title}
                  </h2>
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t pt-3">
                  <span className="font-mono text-xs text-muted-foreground">BDT</span>
                  <span className="text-lg font-black text-foreground">
                    {product.price ? `৳${Number(product.price).toLocaleString()}` : "View piece"}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
