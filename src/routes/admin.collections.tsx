import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Collection } from "../admin/store";
import { Area, Card, Select, Text, Toggle } from "../admin/ui";

export const Route = createFileRoute("/admin/collections")({ component: Collections });

function Collections() {
  const s = useAdmin();
  const [open, setOpen] = useState<string | null>(null);
  const up = (h: string, patch: Partial<Collection>) =>
    setState((x) => {
      let hidden = x.site.hiddenPages || [];
      if (patch.visible !== undefined) {
        const paths = [`/collections/${h}`, `/collections/${h}/index.html`, `/collections/${h}/`];
        if (patch.visible === false) {
          paths.forEach((p) => { if (!hidden.includes(p)) hidden = [...hidden, p]; });
        } else {
          hidden = hidden.filter((p) => !paths.includes(p));
        }
      }
      return {
        ...x,
        site: { ...x.site, hiddenPages: hidden },
        collections: x.collections.map((c) => (c.handle === h ? { ...c, ...patch } : c)),
      };
    });
  const add = () => { const h = "new-collection-" + uid(); setState((x) => ({ ...x, collections: [{ handle: h, title: "New collection", description: "", image: "", visible: false, sort: "manual", products: [], seoTitle: "", seoDescription: "" }, ...x.collections] })); setOpen(h); };
  return (
    <>
      <div className="adm-top"><h1>Collections ({s.collections.length})</h1><button className="adm-btn" onClick={add}>+ Add collection</button></div>
      {s.collections.map((c) => (
        <Card key={c.handle} title={c.title} action={<div className="adm-row">
          <span className={"adm-tag" + (c.visible ? " on" : "")}>{c.visible ? "visible" : "hidden"}</span>
          <button className={"adm-btn" + (c.visible ? " ghost" : "")} onClick={() => up(c.handle, { visible: !c.visible })}>{c.visible ? "Hide" : "Show"}</button>
          <button className="adm-btn ghost" onClick={() => setOpen(open === c.handle ? null : c.handle)}>{open === c.handle ? "Close" : "Edit"}</button>
          <button className="adm-btn danger" onClick={() => confirm("Delete?") && setState((x) => ({ ...x, collections: x.collections.filter((y) => y.handle !== c.handle) }))}>Delete</button>
        </div>}>
          {open === c.handle && (
            <>
              <div className="adm-grid">
                <Text label="Title" value={c.title} onChange={(v) => up(c.handle, { title: v })} />
                <Text label="Image URL" value={c.image} onChange={(v) => up(c.handle, { image: v })} />
                <Select label="Sort products" value={c.sort} options={["manual", "best selling", "newest", "price low-high", "price high-low", "a-z"]} onChange={(v) => up(c.handle, { sort: v })} />
                <Toggle label="Visible on store" value={c.visible} onChange={(v) => up(c.handle, { visible: v })} />
                <Area label="Description" value={c.description} onChange={(v) => up(c.handle, { description: v })} />
                <Text label="SEO title" value={c.seoTitle} onChange={(v) => up(c.handle, { seoTitle: v })} />
                <Area label="SEO description" value={c.seoDescription} onChange={(v) => up(c.handle, { seoDescription: v })} />
              </div>
              <h3 style={{ margin: "16px 0 8px" }}>Products in this collection</h3>
              <div className="adm-row">{s.products.map((p) => (
                <Toggle key={p.handle} label={p.title} value={c.products.includes(p.handle)}
                  onChange={(v) => up(c.handle, { products: v ? [...c.products, p.handle] : c.products.filter((h) => h !== p.handle) })} />
              ))}</div>
            </>
          )}
        </Card>
      ))}
    </>
  );
}
