import { createFileRoute, Link } from "@tanstack/react-router";
import { setSite, setState, uid, useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { move, OrderBtns } from "../admin/site/fields";
import type { CustomPage } from "../admin/site/types";

export const Route = createFileRoute("/admin/website")({ component: Website });

function Website() {
  const s = useAdmin();
  const cps = s.site.customPages;
  const hidden = s.site.hiddenPages;
  const setCps = (l: CustomPage[]) => setSite("customPages", l);
  const toggleHidden = (p: string) => setSite("hiddenPages", hidden.includes(p) ? hidden.filter((x) => x !== p) : [...hidden, p]);
  const slugOk = (slug: string, id: string) => /^[a-z0-9-]+$/.test(slug) && !cps.some((c) => c.slug === slug && c.id !== id);
  const add = () => { const n = cps.length + 1; setCps([...cps, { id: uid(), slug: `new-page-${uid()}`, title: `New page ${n}`, status: "draft", showInNav: false, seoTitle: "", seoDescription: "", blocks: [{ id: uid(), type: "heading", text: `New page ${n}`, level: "h1", align: "left" }] }]); };
  const store: [string, string, string][] = [
    ["Home", "/home.html", "home"],
    ...s.pages.map((p) => [p.title, `/pages/${p.handle}/index.html`, p.handle] as [string, string, string]),
    ["All collections (22)", "/collections/all/index.html", "collections"],
    ["All products (93)", "/products/aka-manto-longsleeve/index.html", "products"],
    ["VIP login", "/account/login/index.html", "account-login"],
    ["VIP signup", "/account/register/index.html", "account-register"],
  ];
  return (
    <>
      <div className="adm-top"><h1>Website pages</h1><button className="adm-btn" onClick={add}>+ New page</button></div>
      <Card title="Original store pages">
        <table><thead><tr><th>Page</th><th>Address</th><th>Visible</th><th /></tr></thead><tbody>
          {store.map(([t, url, k]) => {
            const pg = s.pages.find((p) => p.handle === k);
            const vis = pg ? pg.visible : !hidden.includes(url);
            const canHide = k !== "home" && k !== "collections" && k !== "products";
            return <tr key={url}><td>{t}</td><td><a className="link" href={url} target="_blank" rel="noreferrer">{url}</a></td>
              <td>{canHide ? <input type="checkbox" checked={vis} onChange={() => pg ? setState((x) => ({ ...x, pages: x.pages.map((p) => (p.handle === k ? { ...p, visible: !p.visible } : p)) })) : toggleHidden(url)} /> : "always"}</td>
              <td>{pg ? <Link className="link" to="/admin/pages">Edit text & SEO</Link> : k === "products" ? <Link className="link" to="/admin/products">Products</Link> : k === "collections" ? <Link className="link" to="/admin/collections">Collections</Link> : k.startsWith("account-") ? <Link className="link" to="/admin/forms">Edit form wording</Link> : <Link className="link" to="/admin/sections">Sections</Link>}</td></tr>;
          })}
        </tbody></table>
        <p className="adm-hint">Hidden pages show a “Page not found” screen after you publish.</p>
      </Card>
      <Card title={`Your pages (${cps.length})`}>
        {cps.length ? <table><thead><tr><th /><th>Title</th><th>Address</th><th>Status</th><th>In menu</th><th /></tr></thead><tbody>
          {cps.map((c, i) => { const up = (p: Partial<CustomPage>) => setCps(cps.map((x) => (x.id === c.id ? { ...x, ...p } : x))); return <tr key={c.id}>
            <td><OrderBtns i={i} n={cps.length} onMove={(to) => setCps(move(cps, i, to))} /></td>
            <td><input value={c.title} onChange={(e) => up({ title: e.target.value })} /></td>
            <td><input value={c.slug} aria-invalid={!slugOk(c.slug, c.id)} onChange={(e) => up({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />{!slugOk(c.slug, c.id) && <small className="adm-err">Already used</small>}<small className="adm-hint">/p/{c.slug}</small></td>
            <td><select value={c.status} onChange={(e) => up({ status: e.target.value as CustomPage["status"] })}><option value="draft">draft</option><option value="published">published</option></select></td>
            <td><input type="checkbox" checked={c.showInNav} onChange={(e) => up({ showInNav: e.target.checked })} /></td>
            <td className="adm-row" style={{ gap: 4 }}>
              <Link className="adm-btn sm" to="/admin/website/$id" params={{ id: c.id }}>Edit</Link>
              <button className="adm-btn ghost sm" onClick={() => setCps([...cps.slice(0, i + 1), { ...structuredClone(c), id: uid(), slug: c.slug + "-copy", title: c.title + " (copy)", status: "draft" }, ...cps.slice(i + 1)])}>Duplicate</button>
              <button className="adm-btn danger sm" onClick={() => confirm(`Delete “${c.title}”? This can't be undone after publishing.`) && setCps(cps.filter((x) => x.id !== c.id))}>Delete</button>
            </td></tr>; })}
        </tbody></table> : <p>No extra pages yet. Make one with “+ New page”.</p>}
        <p className="adm-hint">Published pages go live at /p/&lt;address&gt; after you publish the website. “In menu” adds them to the header.</p>
      </Card>
    </>
  );
}
