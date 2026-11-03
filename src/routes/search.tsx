import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import catalog from "../admin/catalog.json";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type SearchProduct = { handle: string; title: string; price?: number };

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
          .select("handle,title,price")
          .eq("status", "active")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setProducts(
          ((data || []) as SearchProduct[]).filter(
            (product) => !q || `${product.title} ${product.handle}`.toLowerCase().includes(q),
          ),
        );
        return;
      }
      const local = (
        (catalog.products || []) as Array<{ handle?: string; title?: string; price?: number }>
      ).map((product) => ({
        handle: product.handle || "",
        title: product.title || "",
        price: product.price,
      }));
      setProducts(
        local.filter(
          (product) => !q || `${product.title} ${product.handle}`.toLowerCase().includes(q),
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
          {products.map((product) => (
            <Link
              key={product.handle}
              to={`/products/${product.handle}/index.html`}
              className="rounded-lg border p-4 hover:border-foreground"
            >
              <h2 className="font-semibold">{product.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {product.price ? `৳${Number(product.price).toLocaleString()}` : "View product"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
