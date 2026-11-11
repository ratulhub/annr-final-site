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
  status?: string | undefined;
  images?: string[] | undefined;
};

export const Route = createFileRoute("/search")({ component: SearchPage });

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
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("products")
          .select("handle,title,price,code,size,status,images")
          .in("status", ["active", "reserved", "sold"])
          .order("updated_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          setProducts(
            ((data || []) as SearchProduct[]).filter(
              (product) =>
                !q ||
                `${product.title} ${product.handle} ${product.code || ""} ${product.size || ""}`
                  .toLowerCase()
                  .includes(q),
            ),
          );
          return;
        }
      }

      // Local fallback from admin store or catalog
      let localProducts: SearchProduct[] = [];
      try {
        const rawAdm = localStorage.getItem("shihiko-admin-v1");
        if (rawAdm) {
          const parsed = JSON.parse(rawAdm);
          if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
            localProducts = parsed.products.map((p: any) => ({
              handle: p.handle || "",
              title: p.title || "",
              price: parseFloat(p.price) || 0,
              code: p.code || "",
              size: p.size || "",
              status: p.status || "active",
              images: p.images || [],
            }));
          }
        }
      } catch {}

      if (!localProducts.length) {
        localProducts = ((catalog.products || []) as any[]).map((product: any) => ({
          handle: product.handle || "",
          title: product.title || "",
          price: typeof product.price === "number" ? product.price : parseFloat(String(product.price || "0").replace(/,/g, "")) || 0,
          code: product.code || "",
          size: product.size || (product.sizes && product.sizes[0]) || "",
          status: "active",
        }));
      }

      setProducts(
        localProducts.filter(
          (product) =>
            !q ||
            `${product.title} ${product.handle} ${product.code || ""} ${product.size || ""}`
              .toLowerCase()
              .includes(q),
        ),
      );
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
          <Link to="/vip" className="text-sm">
            VIP
          </Link>
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
            return (
              <a
                key={product.handle}
                href={`/products/${product.handle}/index.html`}
                className="group relative flex flex-col justify-between rounded-lg border bg-card p-5 transition-all hover:border-foreground"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${isSold ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                      {isSold ? "SOLD / ARCHIVE" : `1 OF 1 · SIZE ${product.size || "M"}`}
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
