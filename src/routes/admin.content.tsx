import { createFileRoute } from "@tanstack/react-router";
import { setSite, uid } from "../admin/store";
import { Card } from "../admin/ui";
import { SCOPES } from "../admin/site/registry";
import { Big, Chk, ColorF, F, Obj, Pick, UrlF, move, OrderBtns, useSite } from "../admin/site/fields";
import type { ImageRule, TextRule } from "../admin/site/types";

export const Route = createFileRoute("/admin/content")({ component: Content });

function Content() {
  const site = useSite();
  const setT = (l: TextRule[]) => setSite("texts", l);
  const setI = (l: ImageRule[]) => setSite("images", l);
  return (
    <>
      <div className="adm-top"><h1>Content</h1></div>
      <Card title="Announcement bar"><Obj k="announcement">{(a, set) => <div className="adm-grid">
        <Chk label="Show announcement" value={a.on} onChange={(on) => set({ on })} />
        <F label="Text" value={a.text} onChange={(text) => set({ text })} validate={(v) => (a.on && !v.trim() ? "Text is required when shown" : null)} />
        <UrlF label="Link (optional)" value={a.url} onChange={(url) => set({ url })} />
        <ColorF label="Background" value={a.background} onChange={(background) => set({ background })} />
        <ColorF label="Text colour" value={a.color} onChange={(color) => set({ color })} />
        <Pick label="Show on" value={a.device} options={["all", "desktop", "mobile"]} onChange={(device) => set({ device: device as typeof a.device })} />
      </div>}</Obj></Card>
      <Card title="Popup"><Obj k="popup">{(p, set) => <div className="adm-grid">
        <Chk label="Show popup" value={p.on} onChange={(on) => set({ on })} />
        <F label="Title" value={p.title} onChange={(title) => set({ title })} />
        <F label="Button label" value={p.button} onChange={(button) => set({ button })} />
        <UrlF label="Button link" value={p.url} onChange={(url) => set({ url })} />
        <F label="Delay (seconds)" type="number" value={p.delaySec} onChange={(delaySec) => set({ delaySec })} validate={(v) => (Number(v) >= 0 && Number(v) <= 60 ? null : "0–60 seconds")} />
        <Chk label="Show once per visitor" value={p.showOnce} onChange={(showOnce) => set({ showOnce })} />
        <Big label="Message" value={p.text} onChange={(text) => set({ text })} />
      </div>}</Obj></Card>
      <Card title="Text replacements" action={<button className="adm-btn" onClick={() => setT([...site.texts, { id: uid(), find: "", replace: "", scope: "all", enabled: true }])}>+ Add</button>}>
        <p className="adm-hint">Change any wording on the store: type the exact original text and what it should say. Scope limits it to a page type or a path like /pages/faq.</p>
        {site.texts.length ? <table><thead><tr><th /><th>Original text</th><th>New text</th><th>Where</th><th>On</th><th /></tr></thead><tbody>
          {site.texts.map((r, i) => { const up = (p: Partial<TextRule>) => setT(site.texts.map((x) => (x.id === r.id ? { ...x, ...p } : x))); return <tr key={r.id}>
            <td><OrderBtns i={i} n={site.texts.length} onMove={(to) => setT(move(site.texts, i, to))} /></td>
            <td><input value={r.find} onChange={(e) => up({ find: e.target.value })} /></td>
            <td><input value={r.replace} onChange={(e) => up({ replace: e.target.value })} /></td>
            <td><input list="scopes" value={r.scope} onChange={(e) => up({ scope: e.target.value })} /></td>
            <td><input type="checkbox" checked={r.enabled} onChange={(e) => up({ enabled: e.target.checked })} /></td>
            <td><button className="adm-btn danger sm" onClick={() => confirm("Delete this replacement?") && setT(site.texts.filter((x) => x.id !== r.id))}>✕</button></td></tr>; })}
        </tbody></table> : <p>No text changes yet.</p>}
        <datalist id="scopes">{SCOPES.map((s) => <option key={s} value={s} />)}</datalist>
      </Card>
      <Card title="Image replacements" action={<button className="adm-btn" onClick={() => setI([...site.images, { id: uid(), from: "", to: "", alt: "", position: "", scope: "all", enabled: true }])}>+ Add</button>}>
        <p className="adm-hint">Swap any picture or video on the store. Paste part of the original file name (e.g. hero_1.jpg) and choose a new one from the Media library.</p>
        {site.images.length ? <table><thead><tr><th>Original file</th><th>New image</th><th>Alt text</th><th>Focus</th><th>Where</th><th>On</th><th /></tr></thead><tbody>
          {site.images.map((r) => { const up = (p: Partial<ImageRule>) => setI(site.images.map((x) => (x.id === r.id ? { ...x, ...p } : x))); return <tr key={r.id}>
            <td><input value={r.from} onChange={(e) => up({ from: e.target.value })} /></td>
            <td><select value={r.to} onChange={(e) => up({ to: e.target.value })}><option value="">Choose…</option>{site.media.map((m) => <option key={m.id} value={m.url}>{m.name}</option>)}</select></td>
            <td><input value={r.alt} onChange={(e) => up({ alt: e.target.value })} /></td>
            <td><select value={r.position} onChange={(e) => up({ position: e.target.value as ImageRule["position"] })}>{["", "top", "center", "bottom"].map((o) => <option key={o} value={o}>{o || "Original"}</option>)}</select></td>
            <td><input list="scopes" value={r.scope} onChange={(e) => up({ scope: e.target.value })} /></td>
            <td><input type="checkbox" checked={r.enabled} onChange={(e) => up({ enabled: e.target.checked })} /></td>
            <td><button className="adm-btn danger sm" onClick={() => confirm("Delete this replacement?") && setI(site.images.filter((x) => x.id !== r.id))}>✕</button></td></tr>; })}
        </tbody></table> : <p>No image changes yet.</p>}
      </Card>
    </>
  );
}
