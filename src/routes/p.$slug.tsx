import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageView, type MiniProduct } from "../site/PageView";
import type { CustomPage } from "../admin/site/types";

const FONTS = ["Druk-Wide", "NB-Architekt", "FKGroteskSemiMono"].map((f) => ({ rel: "stylesheet", href: `/cdn/shop/t/75/assets/${f}.css` }));

export const Route = createFileRoute("/p/$slug")({
  head: () => ({
    meta: [
      { title: "AnnR" },
      { name: "description", content: "AnnR streetwear." },
      { property: "og:title", content: "AnnR" },
      { property: "og:description", content: "AnnR streetwear." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: FONTS,
  }),
  component: CustomPageRoute,
});

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/i;

// Pages built in the admin. They live in this browser's published config (demo), so they render after load.
function CustomPageRoute() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<{ page: CustomPage | null; products: MiniProduct[] } | null>(null);
  useEffect(() => {
    if (!SAFE_SLUG.test(slug)) { setData({ page: null, products: [] }); return; }
    const preview = new URLSearchParams(location.search).get("preview") === "1";
    try {
      const cfg = JSON.parse(localStorage.getItem(preview ? "shihiko-site-draft" : "shihiko-site-config") || "null");
      const page = (cfg?.site?.customPages || []).find((p: CustomPage) => p.slug === slug && (preview || p.status === "published")) || null;
      setData({ page, products: cfg?.catalog || [] });
      if (page) { document.title = page.seoTitle || `${page.title} | AnnR`; }
    } catch { setData({ page: null, products: [] }); }
  }, [slug]);
  if (!data) return null;
  if (!data.page) return <div style={{ fontFamily: "'Druk Wide', sans-serif", padding: 80, textAlign: "center", textTransform: "uppercase" }}>Page not found<br /><a href="/home.html" style={{ fontSize: 12, color: "#000" }}>Home</a></div>;
  return <>
    <div style={{ borderBottom: "1px solid #000", padding: "14px 24px", fontFamily: "'Druk Wide', sans-serif", textTransform: "uppercase" }}><a href="/home.html" style={{ color: "#000", textDecoration: "none" }}>AnnR</a></div>
    <PageView page={data.page} products={data.products} />
    <div style={{ borderTop: "1px solid #000", padding: "16px 24px", fontFamily: "'NB Architekt Std', sans-serif", fontSize: 11, textTransform: "uppercase", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <span>COPYRIGHT © 2026 AnnR, Inc. ALL RIGHTS RESERVED.</span>
      <span>created by <a href="https://ratul.site" target="_blank" rel="noopener noreferrer" style={{ color: "#000", fontWeight: 700, textDecoration: "underline" }}>Ratul</a></span>
    </div>
  </>;
}
