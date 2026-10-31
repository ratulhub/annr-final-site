import { createFileRoute } from "@tanstack/react-router";
import { setState, uid, useAdmin, type Page } from "../admin/store";
import { Area, Card, Text, Toggle } from "../admin/ui";

export const Route = createFileRoute("/admin/pages")({ component: Pages });

function Pages() {
  const s = useAdmin();
  const up = (h: string, patch: Partial<Page>) =>
    setState((x) => {
      let hidden = x.site.hiddenPages || [];
      if (patch.visible !== undefined) {
        const paths = [`/pages/${h}`, `/pages/${h}/index.html`, `/pages/${h}/`];
        if (patch.visible === false) {
          paths.forEach((p) => { if (!hidden.includes(p)) hidden = [...hidden, p]; });
        } else {
          hidden = hidden.filter((p) => !paths.includes(p));
        }
      }
      return {
        ...x,
        site: { ...x.site, hiddenPages: hidden },
        pages: x.pages.map((p) => (p.handle === h ? { ...p, ...patch } : p)),
      };
    });
  return (
    <>
      <div className="adm-top"><h1>Pages</h1>
        <button className="adm-btn" onClick={() => setState((x) => ({ ...x, pages: [{ handle: "page-" + uid(), title: "New page", body: "", visible: false, seoTitle: "", seoDescription: "" }, ...x.pages] }))}>+ Add page</button></div>
      {s.pages.map((p) => (
        <Card key={p.handle} title={p.title} action={<div className="adm-row">
          <span className={"adm-tag" + (p.visible ? " on" : "")}>{p.visible ? "visible" : "hidden"}</span>
          <button className={"adm-btn" + (p.visible ? " ghost" : "")} onClick={() => up(p.handle, { visible: !p.visible })}>{p.visible ? "Hide" : "Show"}</button>
          <button className="adm-btn danger" onClick={() => confirm("Delete?") && setState((x) => ({ ...x, pages: x.pages.filter((y) => y.handle !== p.handle) }))}>Delete</button>
        </div>}>
          <div className="adm-grid">
            <Text label="Title" value={p.title} onChange={(v) => up(p.handle, { title: v })} />
            <Text label="SEO title" value={p.seoTitle} onChange={(v) => up(p.handle, { seoTitle: v })} />
            <Toggle label="Visible" value={p.visible} onChange={(v) => up(p.handle, { visible: v })} />
            <Area label="Content" value={p.body} onChange={(v) => up(p.handle, { body: v })} />
            <Area label="SEO description" value={p.seoDescription} onChange={(v) => up(p.handle, { seoDescription: v })} />
          </div>
        </Card>
      ))}
    </>
  );
}
