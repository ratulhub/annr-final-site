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

const SAFE_LEVELS = new Set(["h1", "h2", "h3"] as const);
const SAFE_ALIGNS = new Set(["left", "center", "right"] as const);
const SAFE_HANDLE = /^[a-z0-9][a-z0-9-]{0,99}$/i;

function BlockView({ b, products }: { b: Block; products: MiniProduct[] }) {
  const H = { fontFamily: "'Druk Wide', sans-serif", textTransform: "uppercase" as const, margin: "0 0 16px", fontWeight: 500 };
  switch (b.type) {
    case "heading": {
      const T = SAFE_LEVELS.has(b.level) ? b.level : "h2";
      const align = SAFE_ALIGNS.has(b.align as "left") ? (b.align as "left" | "center" | "right") : "left";
      return <T style={{ ...H, fontSize: T === "h1" ? 34 : T === "h2" ? 24 : 16, textAlign: align }}>{String(b.text ?? "").slice(0, 500)}</T>;
    }
    case "text": {
      const align = SAFE_ALIGNS.has(b.align as "left") ? (b.align as "left" | "center" | "right") : "left";
      return <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, textAlign: align, margin: "0 0 16px" }}>{String(b.text ?? "").slice(0, 20000)}</p>;
    }
    case "image": {
      const src = fix(String(b.url ?? ""));
      return src ? <figure style={{ margin: "0 0 20px" }}><img src={src} alt={String(b.alt ?? "").slice(0, 200)} style={{ width: "100%", display: "block" }} />{b.caption && <figcaption style={{ fontSize: 10, marginTop: 6, textTransform: "uppercase" }}>{String(b.caption).slice(0, 300)}</figcaption>}</figure> : null;
    }
    case "button": return <p><a href={safe(b.url)} rel="noopener noreferrer" style={{ display: "inline-block", background: "#000", color: "#fff", padding: "12px 22px", textDecoration: "none", textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>{String(b.label ?? "").slice(0, 80)}</a></p>;
    case "spacer": {
      const h = Math.min(Math.max(Number(b.size) || 40, 8), 400);
      return <div style={{ height: h }} />;
    }
    case "faq": return <div style={{ marginBottom: 20 }}>{(Array.isArray(b.items) ? b.items.slice(0, 50) : []).map((it) => <details key={it.id} style={{ borderBottom: "1px solid #000", padding: "12px 0" }}><summary style={{ cursor: "pointer", textTransform: "uppercase" }}>{String(it.q ?? "").slice(0, 300)}</summary><p style={{ marginTop: 8 }}>{String(it.a ?? "").slice(0, 5000)}</p></details>)}</div>;
    case "gallery": {
      const cols = Math.min(Math.max(Math.floor(Number(b.columns) || 3), 1), 6);
      const imgs = String(b.images ?? "").split("\n").map((s) => fix(s.trim())).filter((u): u is string => Boolean(u)).slice(0, 24);
      return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 20 }}>{imgs.map((u, i) => <img key={`${u}-${i}`} src={u} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />)}</div>;
    }
    case "products": {
      const limit = Math.min(Math.max(Math.floor(Number(b.limit) || 4), 1), 24);
      const hs = String(b.handles ?? "").split(",").map((h) => h.trim()).filter((h) => SAFE_HANDLE.test(h));
      const list = (hs.length ? hs.map((h) => products.find((p) => p.handle === h)).filter(Boolean) as MiniProduct[] : products).filter((p) => p.status === "active" && SAFE_HANDLE.test(p.handle)).slice(0, limit);
      return <div style={{ marginBottom: 24 }}>{b.title && <h3 style={{ ...H, fontSize: 14 }}>{String(b.title).slice(0, 120)}</h3>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>{list.map((p) => <a key={p.handle} href={`/products/${encodeURIComponent(p.handle)}/index.html`} style={{ color: "#000", textDecoration: "none" }}>
          {p.image && fix(p.image) && <img src={fix(p.image)} alt={String(p.title ?? "").slice(0, 200)} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", background: "#f2f2f2" }} />}
          <div style={{ fontSize: 11, textTransform: "uppercase", marginTop: 6 }}>{String(p.title ?? "").slice(0, 200)}</div><div style={{ fontSize: 11 }}>Tk {String(p.price ?? "").replace(/\.00$/, "")}</div></a>)}</div></div>;
    }
    default:
      return null;
  }
}
