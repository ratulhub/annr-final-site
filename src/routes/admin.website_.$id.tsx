import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid, useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { BLOCKS } from "../admin/site/registry";
import { move, OrderBtns } from "../admin/site/fields";
import type { Block, CustomPage } from "../admin/site/types";
import { PageView } from "../site/PageView";

export const Route = createFileRoute("/admin/website_/$id")({ component: EditPage });

function EditPage() {
  const { id } = Route.useParams();
  const s = useAdmin();
  const [device, setDevice] = useState("100%");
  const page = s.site.customPages.find((p) => p.id === id);
  if (!page) return <Card title="Page not found"><Link className="link" to="/admin/website">Back to pages</Link></Card>;
  const save = (p: Partial<CustomPage>) => setSite("customPages", s.site.customPages.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const setB = (blocks: Block[]) => save({ blocks });
  const upB = (bid: string, p: Record<string, unknown>) => setB(page.blocks.map((b) => (b.id === bid ? ({ ...b, ...p } as Block) : b)));
  const errors = page.blocks.map((b) => BLOCKS[b.type].validate(b)).filter(Boolean);
  const imgs = s.site.media;
  return (
    <>
      <div className="adm-top"><h1>{page.title}</h1>
        <div className="adm-row"><Link className="adm-btn ghost" to="/admin/website">All pages</Link>
          <select value={page.status} onChange={(e) => save({ status: e.target.value as CustomPage["status"] })} style={{ width: 140 }}><option value="draft">draft</option><option value="published">published</option></select></div></div>
      {errors.length > 0 && <div className="adm-err" style={{ marginBottom: 12 }}>Fix before publishing: {errors.join(" · ")}</div>}
      <Card title="Page details"><div className="adm-grid">
        <label className="adm-field"><span>Title</span><input value={page.title} onChange={(e) => save({ title: e.target.value })} /></label>
        <label className="adm-field"><span>Search title</span><input value={page.seoTitle} onChange={(e) => save({ seoTitle: e.target.value })} /></label>
        <label className="adm-field"><span>Search description</span><input value={page.seoDescription} onChange={(e) => save({ seoDescription: e.target.value })} /></label>
      </div></Card>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div>
          {page.blocks.map((b, i) => <div className="adm-card" key={b.id}>
            <div className="adm-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <b>{BLOCKS[b.type].label}</b>
              <span className="adm-row" style={{ gap: 4 }}><OrderBtns i={i} n={page.blocks.length} onMove={(to) => setB(move(page.blocks, i, to))} />
                <button className="adm-btn ghost sm" onClick={() => setB([...page.blocks.slice(0, i + 1), { ...structuredClone(b), id: uid() }, ...page.blocks.slice(i + 1)])}>Copy</button>
                <button className="adm-btn danger sm" onClick={() => confirm("Remove block?") && setB(page.blocks.filter((x) => x.id !== b.id))}>✕</button></span>
            </div>
            <BlockEditor b={b} up={(p) => upB(b.id, p)} images={imgs.map((m) => ({ name: m.name, url: m.url }))} />
            {BLOCKS[b.type].validate(b) && <small className="adm-err">{BLOCKS[b.type].validate(b)}</small>}
          </div>)}
          <div className="adm-row">{(Object.keys(BLOCKS) as Block["type"][]).map((t) => <button key={t} className="adm-btn ghost sm" onClick={() => setB([...page.blocks, { ...BLOCKS[t].blank(), id: uid() } as Block])}>+ {BLOCKS[t].label}</button>)}</div>
        </div>
        <Card title="Preview" action={<span className="adm-row" style={{ gap: 4 }}>{[["Desktop", "100%"], ["Tablet", "768px"], ["Mobile", "375px"]].map(([l, w]) => <button key={l} className={`adm-btn sm ${device === w ? "" : "ghost"}`} onClick={() => setDevice(w!)}>{l}</button>)}</span>}>
          <div style={{ border: "1px solid #000", overflow: "auto", maxHeight: 700 }}><div style={{ width: device, maxWidth: "100%", margin: "0 auto" }}><PageView page={page} products={s.products.map((p) => ({ handle: p.handle, title: p.title, price: p.price, image: p.images[0] || "", status: p.status }))} /></div></div>
        </Card>
      </div>
    </>
  );
}

function BlockEditor({ b, up, images }: { b: Block; up: (p: Record<string, unknown>) => void; images: { name: string; url: string }[] }) {
  const t = (k: string, label: string, area = false) => <label className="adm-field" style={area ? { gridColumn: "1/-1" } : undefined}><span>{label}</span>
    {area ? <textarea value={(b as any)[k]} onChange={(e) => up({ [k]: e.target.value })} /> : <input value={(b as any)[k]} onChange={(e) => up({ [k]: e.target.value })} />}</label>;
  const sel = (k: string, label: string, opts: string[]) => <label className="adm-field"><span>{label}</span><select value={(b as any)[k]} onChange={(e) => up({ [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>;
  switch (b.type) {
    case "heading": return <div className="adm-grid">{t("text", "Text")}{sel("level", "Size", ["h1", "h2", "h3"])}{sel("align", "Align", ["left", "center", "right"])}</div>;
    case "text": return <div className="adm-grid">{t("text", "Text", true)}{sel("align", "Align", ["left", "center", "right"])}</div>;
    case "image": return <div className="adm-grid"><label className="adm-field"><span>Image</span><select value={b.url} onChange={(e) => up({ url: e.target.value })}><option value="">Choose from media…</option>{images.map((m) => <option key={m.url} value={m.url}>{m.name}</option>)}</select></label>{t("alt", "Alt text")}{t("caption", "Caption")}</div>;
    case "button": return <div className="adm-grid">{t("label", "Label")}{t("url", "Link")}</div>;
    case "products": return <div className="adm-grid">{t("title", "Title")}{t("handles", "Product handles (comma separated, empty = newest)")}{t("limit", "How many")}</div>;
    case "gallery": return <div className="adm-grid">{t("images", "Image links (one per line)", true)}{sel("columns", "Columns", ["2", "3", "4"])}</div>;
    case "spacer": return <div className="adm-grid">{sel("size", "Height", ["20", "40", "80", "120"])}</div>;
    case "faq": return <div>
      {b.items.map((it, i) => <div key={it.id} className="adm-grid" style={{ marginBottom: 8 }}>
        <label className="adm-field"><span>Question</span><input value={it.q} onChange={(e) => up({ items: b.items.map((x) => (x.id === it.id ? { ...x, q: e.target.value } : x)) })} /></label>
        <label className="adm-field"><span>Answer</span><input value={it.a} onChange={(e) => up({ items: b.items.map((x) => (x.id === it.id ? { ...x, a: e.target.value } : x)) })} /></label>
        <span className="adm-row"><OrderBtns i={i} n={b.items.length} onMove={(to) => up({ items: move(b.items, i, to) })} /><button className="adm-btn danger sm" onClick={() => up({ items: b.items.filter((x) => x.id !== it.id) })}>✕</button></span>
      </div>)}
      <button className="adm-btn ghost sm" onClick={() => up({ items: [...b.items, { id: uid(), q: "", a: "" }] })}>+ Question</button></div>;
  }
}
