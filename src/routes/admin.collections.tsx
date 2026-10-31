import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Collection } from "../admin/store";
import { Area, BackBtn, Card, Select, Text, Toggle } from "../admin/ui";

export const Route = createFileRoute("/admin/collections")({ component: Collections });

function Collections() {
  const s = useAdmin();
  const [open, setOpen] = useState<string | null>(null);

  const visibleCount = s.collections.filter((c) => c.visible).length;

  const up = (h: string, patch: Partial<Collection>) =>
    setState((x) => {
      let hidden = x.site.hiddenPages || [];
      if (patch.visible !== undefined) {
        const paths = [`/collections/${h}`, `/collections/${h}/index.html`, `/collections/${h}/`];
        if (patch.visible === false) {
          paths.forEach((p) => {
            if (!hidden.includes(p)) hidden = [...hidden, p];
          });
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

  const add = () => {
    const h = "new-collection-" + uid();
    setState((x) => ({
      ...x,
      collections: [
        {
          handle: h,
          title: "New collection",
          description: "",
          image: "",
          visible: true,
          sort: "manual",
          products: [],
          seoTitle: "",
          seoDescription: "",
        },
        ...x.collections,
      ],
    }));
    setOpen(h);
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Collections ({s.collections.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>Group products into catalog categories and lookbooks</p>
          </div>
        </div>
        <div className="adm-row">
          <button className="adm-btn" onClick={add} style={{ background: "var(--red)", borderColor: "var(--red)" }}>
            ➕ Add Collection
          </button>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat accent-emerald">
          <span>Active Collections</span>
          <b>{visibleCount}</b>
          <small>{s.collections.length - visibleCount} hidden from store</small>
        </div>
        <div className="adm-stat accent-indigo">
          <span>Total Products</span>
          <b>{s.products.length}</b>
          <small>Available to categorize</small>
        </div>
      </div>

      {s.collections.map((c) => (
        <Card
          key={c.handle}
          title={c.title}
          subtitle={`/${c.handle} · ${c.products.length} products assigned`}
          action={
            <div className="adm-row">
              <span className={`adm-tag ${c.visible ? "active" : "draft"}`}>
                {c.visible ? "Visible" : "Hidden"}
              </span>
              <button
                type="button"
                className={`adm-btn sm ${c.visible ? "ghost" : ""}`}
                onClick={() => up(c.handle, { visible: !c.visible })}
              >
                {c.visible ? "Hide" : "Make Visible"}
              </button>
              <button
                type="button"
                className="adm-btn ghost sm"
                onClick={() => setOpen(open === c.handle ? null : c.handle)}
              >
                {open === c.handle ? "Close Editor" : "Edit Details"}
              </button>
              <a
                href={`/collections/${c.handle}/index.html`}
                target="_blank"
                rel="noreferrer"
                className="adm-btn ghost sm"
              >
                Preview ↗
              </a>
              <button
                type="button"
                className="adm-btn danger sm"
                onClick={() =>
                  confirm(`Delete collection "${c.title}"?`) &&
                  setState((x) => ({
                    ...x,
                    collections: x.collections.filter((y) => y.handle !== c.handle),
                  }))
                }
              >
                Delete
              </button>
            </div>
          }
        >
          {open === c.handle && (
            <div style={{ marginTop: 14 }}>
              <div className="adm-grid">
                <Text label="Title" value={c.title} onChange={(v) => up(c.handle, { title: v })} />
                <Text label="Cover Image URL" value={c.image} onChange={(v) => up(c.handle, { image: v })} />
                <Select
                  label="Sort Products Order"
                  value={c.sort}
                  options={["manual", "best selling", "newest", "price low-high", "price high-low", "a-z"]}
                  onChange={(v) => up(c.handle, { sort: v })}
                />
                <Toggle label="Visible on Storefront" value={c.visible} onChange={(v) => up(c.handle, { visible: v })} />
                <Area label="Description" value={c.description} onChange={(v) => up(c.handle, { description: v })} />
                <Text label="SEO Meta Title" value={c.seoTitle} onChange={(v) => up(c.handle, { seoTitle: v })} />
                <Area label="SEO Meta Description" value={c.seoDescription} onChange={(v) => up(c.handle, { seoDescription: v })} />
              </div>
              <h3 style={{ margin: "20px 0 10px" }}>Assign Products to This Collection</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                  padding: 12,
                  background: "var(--soft)",
                  borderRadius: 6,
                }}
              >
                {s.products.map((p) => (
                  <Toggle
                    key={p.handle}
                    label={p.title}
                    value={c.products.includes(p.handle)}
                    onChange={(v) =>
                      up(c.handle, {
                        products: v ? [...c.products, p.handle] : c.products.filter((h) => h !== p.handle),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
