import { createFileRoute, Link } from "@tanstack/react-router";
import { setState, useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { Big, Chk, F, Obj, UrlF } from "../admin/site/fields";

export const Route = createFileRoute("/admin/seo")({ component: Seo });

type Row = { kind: "products" | "collections" | "pages"; handle: string; title: string; seoTitle: string; seoDescription: string };

function Seo() {
  const s = useAdmin();
  const rows: Row[] = [
    ...s.pages.map((p) => ({ kind: "pages" as const, ...p })),
    ...s.collections.map((c) => ({ kind: "collections" as const, ...c })),
    ...s.products.map((p) => ({ kind: "products" as const, ...p })),
  ];
  const up = (r: Row, k: "seoTitle" | "seoDescription", v: string) =>
    setState((x) => ({ ...x, [r.kind]: (x[r.kind] as any[]).map((y) => (y.handle === r.handle ? { ...y, [k]: v } : y)) }));
  return (
    <>
      <div className="adm-top"><h1>SEO & discoverability</h1></div>
      <Card title="Site defaults"><Obj k="seo">{(v, set) => <div className="adm-grid">
        <F label="Home page title" value={v.homeTitle} onChange={(homeTitle) => set({ homeTitle })} placeholder="Original title" />
        <F label="Title pattern" value={v.titlePattern} onChange={(titlePattern) => set({ titlePattern })} placeholder="{title} | AnnR" validate={(t) => (!t || t.includes("{title}") ? null : "Must include {title}")} />
        <UrlF label="Social sharing image" value={v.ogImage} onChange={(ogImage) => set({ ogImage })} />
        <UrlF label="Canonical domain" value={v.canonicalBase} onChange={(canonicalBase) => set({ canonicalBase })} />
        <Chk label="Hide whole site from search engines" value={v.noindex} onChange={(noindex) => set({ noindex })} />
        <Chk label="Product structured data" value={v.structuredData} onChange={(structuredData) => set({ structuredData })} />
        <Big label="Default description (pages without one)" value={v.defaultDescription} onChange={(defaultDescription) => set({ defaultDescription })} rows={2} />
        <Big label="robots.txt (saved for when the site has a server)" value={v.robots} onChange={(robots) => set({ robots })} rows={3} />
      </div>}</Obj></Card>
      <Card title={`Page SEO (${rows.length})`}>
        <table><thead><tr><th>Type</th><th>Page</th><th>Search title</th><th>Search description</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.kind + r.handle}>
            <td>{r.kind.slice(0, -1)}</td>
            <td>{r.kind === "products" ? <Link className="link" to="/admin/products/$handle" params={{ handle: r.handle }}>{r.title}</Link> : r.title}</td>
            <td><input value={r.seoTitle} onChange={(e) => up(r, "seoTitle", e.target.value)} />{r.seoTitle.length > 60 && <small className="adm-hint">{r.seoTitle.length}/60</small>}</td>
            <td><input value={r.seoDescription} onChange={(e) => up(r, "seoDescription", e.target.value)} />{!r.seoDescription && <small className="adm-err">Missing</small>}</td>
          </tr>)}
        </tbody></table>
      </Card>
    </>
  );
}
