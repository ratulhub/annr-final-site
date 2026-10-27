import { safeImageUrl, safeUrl } from "../admin/security/sanitize";
import type { Block, CustomPage } from "../admin/site/types";

// Renders admin-built pages with the store's fonts and black/white style.
export type MiniProduct = { handle: string; title: string; price: string; image: string; status: string };
// Admin content is untrusted: only safe link and image schemes are rendered.
const fix = (u: string) => safeImageUrl(u.startsWith("//") ? "https:" + u : u) || undefined;
const safe = (u: string) => safeUrl(u);

export function PageView({ page, products }: { page: CustomPage; products: MiniProduct[] }) {
  return (
    <div style={{ fontFamily: "'NB Architekt Std', monospace", color: "#000", background: "#fff", padding: "40px 24px", maxWidth: 1200, margin: "0 auto", fontSize: 13 }}>
      {page.blocks.map((b) => <BlockView key={b.id} b={b} products={products} />)}
    </div>
  );
}

function BlockView({ b, products }: { b: Block; products: MiniProduct[] }) {
  const H = { fontFamily: "'Druk Wide', sans-serif", textTransform: "uppercase" as const, margin: "0 0 16px", fontWeight: 500 };
  switch (b.type) {
    case "heading": { const T = b.level; return <T style={{ ...H, fontSize: b.level === "h1" ? 34 : b.level === "h2" ? 24 : 16, textAlign: b.align as "left" }}>{b.text}</T>; }
    case "text": return <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, textAlign: b.align as "left", margin: "0 0 16px" }}>{b.text}</p>;
    case "image": return b.url ? <figure style={{ margin: "0 0 20px" }}><img src={fix(b.url)} alt={b.alt} style={{ width: "100%", display: "block" }} />{b.caption && <figcaption style={{ fontSize: 10, marginTop: 6, textTransform: "uppercase" }}>{b.caption}</figcaption>}</figure> : null;
    case "button": return <p><a href={safe(b.url)} style={{ display: "inline-block", background: "#000", color: "#fff", padding: "12px 22px", textDecoration: "none", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>{b.label}</a></p>;
    case "spacer": return <div style={{ height: Number(b.size) || 40 }} />;
    case "faq": return <div style={{ marginBottom: 20 }}>{b.items.map((it) => <details key={it.id} style={{ borderBottom: "1px solid #000", padding: "12px 0" }}><summary style={{ cursor: "pointer", textTransform: "uppercase" }}>{it.q}</summary><p style={{ marginTop: 8 }}>{it.a}</p></details>)}</div>;
    case "gallery": { const imgs = b.images.split("\n").map((s) => s.trim()).filter(Boolean); return <div style={{ display: "grid", gridTemplateColumns: `repeat(${b.columns}, 1fr)`, gap: 10, marginBottom: 20 }}>{imgs.map((u) => <img key={u} src={fix(u)} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />)}</div>; }
    case "products": {
      const hs = b.handles.split(",").map((h) => h.trim()).filter(Boolean);
      const list = (hs.length ? hs.map((h) => products.find((p) => p.handle === h)).filter(Boolean) as MiniProduct[] : products).filter((p) => p.status === "active").slice(0, Number(b.limit) || 4);
      return <div style={{ marginBottom: 24 }}>{b.title && <h3 style={{ ...H, fontSize: 14 }}>{b.title}</h3>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>{list.map((p) => <a key={p.handle} href={`/products/${p.handle}/index.html`} style={{ color: "#000", textDecoration: "none" }}>
          {p.image && <img src={fix(p.image)} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", background: "#f2f2f2" }} />}
          <div style={{ fontSize: 11, textTransform: "uppercase", marginTop: 6 }}>{p.title}</div><div style={{ fontSize: 11 }}>Tk {p.price.replace(/\.00$/, "")}</div></a>)}</div></div>;
    }
  }
}
