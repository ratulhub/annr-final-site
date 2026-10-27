import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setState, useAdmin, type Product, type Variant } from "../admin/store";
import { Area, Card, RowList, Select, Text, Toggle } from "../admin/ui";
import { storeFile } from "../admin/services/media";
import { safeImageUrl } from "../admin/security/sanitize";

export const Route = createFileRoute("/admin/products_/$handle")({ component: Edit });

function Edit() {
  const { handle } = Route.useParams();
  const s = useAdmin();
  const nav = useNavigate();
  const p = s.products.find((x) => x.handle === handle);
  const [img, setImg] = useState("");
  const [imgErr, setImgErr] = useState("");
  if (!p) return <p>Product not found. <Link className="link" to="/admin/products">Back</Link></p>;
  const up = (patch: Partial<Product>) => setState((x) => ({ ...x, products: x.products.map((y) => (y.handle === handle ? { ...y, ...patch } : y)) }));
  const toggleCol = (h: string) => up({ collections: p.collections.includes(h) ? p.collections.filter((c) => c !== h) : [...p.collections, h] });
  return (
    <>
      <div className="adm-top">
        <h1>{p.title}</h1>
        <div className="adm-row">
          <span className="adm-saved">Auto-saved</span>
          <a className="adm-btn ghost" href={`/products/${p.handle}/index.html`} target="_blank" rel="noreferrer">View</a>
          <button className="adm-btn ghost" onClick={() => { const h = p.handle + "-copy"; setState((x) => ({ ...x, products: [{ ...p, handle: h, title: p.title + " (copy)", status: "draft" }, ...x.products] })); nav({ to: "/admin/products/$handle", params: { handle: h } }); }}>Duplicate</button>
          <button className="adm-btn danger" onClick={() => { if (confirm("Delete this product?")) { setState((x) => ({ ...x, products: x.products.filter((y) => y.handle !== handle) })); nav({ to: "/admin/products" }); } }}>Delete</button>
        </div>
      </div>
      <Card title="Details"><div className="adm-grid">
        <Text label="Title" value={p.title} onChange={(v) => up({ title: v })} />
        <Select label="Status" value={p.status} options={["active", "draft", "archived"]} onChange={(v) => up({ status: v as Product["status"] })} />
        <Text label="Vendor" value={p.vendor} onChange={(v) => up({ vendor: v })} />
        <Text label="Product type" value={p.type} onChange={(v) => up({ type: v })} />
        <Text label="Tags (comma separated)" value={p.tags} onChange={(v) => up({ tags: v })} />
        <Text label="Badge (e.g. NEW, SOLD OUT)" value={p.badge} onChange={(v) => up({ badge: v })} />
        <Area label="Description" value={p.description} onChange={(v) => up({ description: v })} />
        <Area label="Size chart / extra info" value={p.sizeChart} onChange={(v) => up({ sizeChart: v })} />
      </div></Card>
      <Card title="Pricing"><div className="adm-grid">
        <Text label="Price" value={p.price} onChange={(v) => up({ price: v })} />
        <Text label="Compare-at price" value={p.compareAt} onChange={(v) => up({ compareAt: v })} />
        <Select label="Currency" value={p.currency} options={["BDT", "USD", "EUR", "INR"]} onChange={(v) => up({ currency: v })} />
        <Text label="Weight (kg)" value={p.weight} onChange={(v) => up({ weight: v })} />
      </div></Card>
      <Card title="Images">
        <div className="adm-thumbs">{p.images.map((src, i) => (
          <div key={src + i}><img src={src} alt="" /><button onClick={() => up({ images: p.images.filter((_, j) => j !== i) })}>✕</button>
            {i > 0 && <button style={{ left: 2, right: "auto" }} onClick={() => { const a = [...p.images]; const tmp = a[i - 1]!; a[i - 1] = a[i]!; a[i] = tmp; up({ images: a }); }}>←</button>}
          </div>))}
        </div>
        <div className="adm-row" style={{ marginTop: 12 }}>
          <input placeholder="Image URL" value={img} onChange={(e) => { setImg(e.target.value); setImgErr(""); }} style={{ maxWidth: 400 }} />
          <button className="adm-btn ghost" onClick={() => {
            const clean = safeImageUrl(img);
            if (!clean) { setImgErr("Enter a valid / or https:// image URL (SVG is not allowed)."); return; }
            setImgErr(""); up({ images: [...p.images, clean] }); setImg("");
          }}>Add URL</button>
          <label className="adm-btn ghost">Upload<input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setImgErr("");
            try { const url = await storeFile(f); up({ images: [...p.images, url] }); }
            catch (err) { setImgErr((err as Error).message); }
          }} /></label>
        </div>
        {imgErr && <div className="adm-err" style={{ marginTop: 8 }}>{imgErr}</div>}
      </Card>
      <Card title="Variants & inventory">
        <div className="adm-row" style={{ marginBottom: 12 }}>
          <Toggle label="Track stock" value={p.trackStock} onChange={(v) => up({ trackStock: v })} />
          <Toggle label="Sell when out of stock" value={p.allowBackorder} onChange={(v) => up({ allowBackorder: v })} />
          <Toggle label="Featured" value={p.featured} onChange={(v) => up({ featured: v })} />
        </div>
        <RowList<Variant> rows={p.variants} onChange={(v) => up({ variants: v })} blank={{ option: "", sku: "", price: p.price, stock: 0 }}
          fields={[{ key: "option", label: "Option / size" }, { key: "sku", label: "SKU" }, { key: "price", label: "Price" }, { key: "stock", label: "Stock", type: "number" }]} />
      </Card>
      <Card title="Collections"><div className="adm-row">
        {s.collections.map((c) => <Toggle key={c.handle} label={c.title} value={p.collections.includes(c.handle)} onChange={() => toggleCol(c.handle)} />)}
      </div></Card>
      <Card title="Search engine listing"><div className="adm-grid">
        <Text label="URL handle" value={p.handle} onChange={(v) => { up({ handle: v }); nav({ to: "/admin/products/$handle", params: { handle: v }, replace: true }); }} />
        <Text label="SEO title" value={p.seoTitle} onChange={(v) => up({ seoTitle: v })} />
        <Area label="SEO description" value={p.seoDescription} onChange={(v) => up({ seoDescription: v })} />
      </div></Card>
    </>
  );
}
