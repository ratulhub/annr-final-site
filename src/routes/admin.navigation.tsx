import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { setSite, uid, useAdmin, setState, type Collection } from "../admin/store";
import { Card } from "../admin/ui";
import { Chk, F, Obj, UrlF, isUrl, move, OrderBtns, useSite } from "../admin/site/fields";
import { siteDefaults } from "../admin/site/defaults";
import type { FooterColumn, HeaderItem, Link } from "../admin/site/types";

export const Route = createFileRoute("/admin/navigation")({ component: Navigation });

const NAVBAR_HANDLES = ["bonsai", "golden-goal", "samurai", "clocked-out", "divine", "classics", "archived"];

function Navigation() {
  const site = useSite();
  const s = useAdmin();
  const h = site.header, f = site.footer;
  const setItems = (items: HeaderItem[]) => setSite("header", { ...h, items });
  const setCols = (columns: FooterColumn[]) => setSite("footer", { ...f, columns });

  const dropdownCollections = [
    ...(NAVBAR_HANDLES.map((h) => s.collections.find((c) => c.handle === h)).filter(Boolean) as Collection[]),
    ...s.collections.filter((c) => !NAVBAR_HANDLES.includes(c.handle)),
  ];

  const upCol = (handle: string, patch: Partial<Collection>) =>
    setState((x) => ({
      ...x,
      collections: x.collections.map((c) => (c.handle === handle ? { ...c, ...patch } : c)),
    }));
  return (
    <>
      <div className="adm-top"><h1>Navigation, header & footer</h1>
        <button className="adm-btn ghost" onClick={() => confirm("Reset header and footer to the original?") && (setSite("header", siteDefaults().header), setSite("footer", siteDefaults().footer))}>Reset to original</button></div>
      <Card title="Header menu" action={<button className="adm-btn" onClick={() => setItems([...h.items, { id: uid(), label: "New link", url: "/collections/all/index.html", newTab: false, visible: true, original: null, device: "all" }])}>+ Add link</button>}>
        <p className="adm-hint">“Shop” and “Collections” keep their original drop-down menus; you can rename, hide or move them.</p>
        <table><thead><tr><th /><th>Label</th><th>Link</th><th>New tab</th><th>Show on</th><th>Visible</th><th /></tr></thead><tbody>
          {h.items.map((it, i) => { const up = (p: Partial<HeaderItem>) => setItems(h.items.map((x) => (x.id === it.id ? { ...x, ...p } : x))); return <tr key={it.id}>
            <td><OrderBtns i={i} n={h.items.length} onMove={(to) => setItems(move(h.items, i, to))} /></td>
            <td><input value={it.label} onChange={(e) => up({ label: e.target.value })} /></td>
            <td>{it.original === 1 || it.original === 2 ? <span className="adm-hint">drop-down menu</span> : <input value={it.url} aria-invalid={!isUrl(it.url)} onChange={(e) => up({ url: e.target.value })} />}{!isUrl(it.url) && <small className="adm-err">Invalid link</small>}</td>
            <td><input type="checkbox" checked={it.newTab} onChange={(e) => up({ newTab: e.target.checked })} /></td>
            <td><select value={it.device} onChange={(e) => up({ device: e.target.value as HeaderItem["device"] })}>{["all", "desktop", "mobile"].map((o) => <option key={o}>{o}</option>)}</select></td>
            <td><input type="checkbox" checked={it.visible} onChange={(e) => up({ visible: e.target.checked })} /></td>
            <td><button className="adm-btn danger sm" onClick={() => confirm(`Remove “${it.label}”?`) && setItems(h.items.filter((x) => x.id !== it.id))}>✕</button></td></tr>; })}
        </tbody></table>
      </Card>
      <Card title="Collections Dropdown Menu (Navbar References)">
        <p className="adm-hint">
          These items appear directly under the “Collections” mega-menu and mobile navigation dropdown, as well as the collection category bar. They are live references to your collections in <strong>Collections</strong>. When you edit titles or visibility here or in Collections, changes sync everywhere immediately.
        </p>
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Handle / Link</th>
              <th>Navbar Display Title</th>
              <th>Visible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dropdownCollections.map((col) => (
              <tr key={col.handle}>
                <td><strong>{col.title}</strong></td>
                <td><code>/collections/{col.handle}/index.html</code></td>
                <td>
                  <input
                    value={col.title}
                    onChange={(e) => upCol(col.handle, { title: e.target.value })}
                    style={{ maxWidth: 220 }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={col.visible !== false}
                    onChange={(e) => upCol(col.handle, { visible: e.target.checked })}
                  />
                </td>
                <td>
                  <RouterLink
                    to="/admin/collections"
                    className="adm-btn ghost sm"
                    style={{ textDecoration: "none" }}
                  >
                    Edit Collection →
                  </RouterLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Header options"><Obj k="header">{(v, set) => <div className="adm-grid">
        <Chk label="Show VIP button" value={v.showVip} onChange={(showVip) => set({ showVip })} />
        <Chk label="Show cart button" value={v.showCart} onChange={(showCart) => set({ showCart })} />
        <Chk label="Sticky header" value={v.sticky} onChange={(sticky) => set({ sticky })} />
        <F label="Extra button label" value={v.ctaLabel} onChange={(ctaLabel) => set({ ctaLabel })} hint="Leave empty for none" />
        <UrlF label="Extra button link" value={v.ctaUrl} onChange={(ctaUrl) => set({ ctaUrl })} />
      </div>}</Obj></Card>
      <Card title="Footer columns" action={<button className="adm-btn" onClick={() => setCols([...f.columns, { id: uid(), title: "NEW:", visible: true, links: [] }])}>+ Add column</button>}>
        {f.columns.map((c, ci) => {
          const upC = (p: Partial<FooterColumn>) => setCols(f.columns.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
          const setL = (links: Link[]) => upC({ links });
          return <div key={c.id} className="adm-card">
            <div className="adm-row" style={{ justifyContent: "space-between" }}>
              <input value={c.title} onChange={(e) => upC({ title: e.target.value })} style={{ maxWidth: 240 }} />
              <span className="adm-row"><Chk label="Visible" value={c.visible} onChange={(visible) => upC({ visible })} /><OrderBtns i={ci} n={f.columns.length} onMove={(to) => setCols(move(f.columns, ci, to))} />
                <button className="adm-btn danger sm" onClick={() => confirm(`Delete column “${c.title}”?`) && setCols(f.columns.filter((x) => x.id !== c.id))}>Delete</button></span>
            </div>
            <table style={{ marginTop: 10 }}><tbody>{c.links.map((l, i) => { const up = (p: Partial<Link>) => setL(c.links.map((x) => (x.id === l.id ? { ...x, ...p } : x))); return <tr key={l.id}>
              <td><OrderBtns i={i} n={c.links.length} onMove={(to) => setL(move(c.links, i, to))} /></td>
              <td><input value={l.label} onChange={(e) => up({ label: e.target.value })} /></td>
              <td><input value={l.url} aria-invalid={!isUrl(l.url)} onChange={(e) => up({ url: e.target.value })} />{!isUrl(l.url) && <small className="adm-err">Invalid link</small>}</td>
              <td><label className="adm-check"><input type="checkbox" checked={l.newTab} onChange={(e) => up({ newTab: e.target.checked })} />new tab</label></td>
              <td><label className="adm-check"><input type="checkbox" checked={l.visible} onChange={(e) => up({ visible: e.target.checked })} />visible</label></td>
              <td><button className="adm-btn danger sm" onClick={() => setL(c.links.filter((x) => x.id !== l.id))}>✕</button></td></tr>; })}</tbody></table>
            <button className="adm-btn ghost sm" style={{ marginTop: 8 }} onClick={() => setL([...c.links, { id: uid(), label: "Link", url: "/home.html", newTab: false, visible: true }])}>+ Add link</button>
          </div>;
        })}
      </Card>
      <Card title="Footer options"><Obj k="footer">{(v, set) => <div className="adm-grid">
        <Chk label="Show newsletter signup" value={v.showSubscribe} onChange={(showSubscribe) => set({ showSubscribe })} />
        <Chk label="Show contact email" value={v.showEmail} onChange={(showEmail) => set({ showEmail })} />
        <Chk label="Show payment icons" value={v.showPayments} onChange={(showPayments) => set({ showPayments })} />
      </div>}</Obj>
        <Obj k="general">{(g, set) => <div className="adm-grid" style={{ marginTop: 14 }}>
          <F label="Contact label" value={g.contactLabel} onChange={(contactLabel) => set({ contactLabel })} />
          <F label="Contact email" type="email" value={g.contactEmail} onChange={(contactEmail) => set({ contactEmail })} validate={(v) => (/^\S+@\S+\.\S+$/.test(v) ? null : "Enter a valid email")} />
          <F label="Copyright line" value={g.copyright} onChange={(copyright) => set({ copyright })} />
        </div>}</Obj>
      </Card>
    </>
  );
}
