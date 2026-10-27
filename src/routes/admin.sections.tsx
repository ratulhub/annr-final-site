import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid } from "../admin/store";
import { Card } from "../admin/ui";
import { TEMPLATES, SPACING } from "../admin/site/registry";
import { Chk, ColorF, DevicePreview, Pick, move, OrderBtns, useSite } from "../admin/site/fields";
import type { SectionCfg } from "../admin/site/types";

export const Route = createFileRoute("/admin/sections")({ component: Sections });

type Kind = NonNullable<SectionCfg["added"]>["kind"];
const KINDS: Record<Kind, string> = { text: "Text block", image: "Image banner", cta: "Call to action" };
const base = { visible: true, padTop: "", padBottom: "", background: "", align: "" as const, width: "" as const, device: "all" as const };
const okUrl = (u: string) => !u || /^(\/|https?:\/\/|mailto:|tel:|#)/.test(u);

function Sections() {
  const site = useSite();
  const [tpl, setTpl] = useState("home");
  const [drag, setDrag] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>("text");
  const T = TEMPLATES[tpl]!;
  const list = site.sections[tpl] || T.sections;
  const save = (l: SectionCfg[]) => setSite("sections", { ...site.sections, [tpl]: l });
  const up = (i: number, p: Partial<SectionCfg>) => save(list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const fixed = (s: SectionCfg) => /header|footer/.test(s.key) && !s.copyOf && !s.added;
  const duplicate = (i: number) => {
    const s = list[i]!; const key = `adm${uid()}`;
    const copy: SectionCfg = { ...s, key, label: `${s.label} (copy)`, copyOf: s.copyOf || (s.added ? undefined : s.key), added: s.added ? { ...s.added } : undefined };
    save([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
  };
  const add = () => {
    const key = `adm${uid()}`; const at = Math.max(1, list.findIndex((s) => /footer/.test(s.key)));
    const s: SectionCfg = { ...base, key, label: KINDS[kind], type: kind, added: { kind, heading: "New section", text: "", image: "", alt: "", button: kind === "cta" ? "Shop now" : "", url: kind === "cta" ? "/collections/all/index.html" : "" } };
    save([...list.slice(0, at), s, ...list.slice(at)]);
  };
  const remove = (i: number) => confirm(`Remove "${list[i]!.label}" from this page?`) && save(list.filter((_, j) => j !== i));
  return (
    <>
      <div className="adm-top"><h1>Page sections</h1>
        <div className="adm-row">
          <select value={tpl} onChange={(e) => setTpl(e.target.value)} style={{ width: 260 }}>{Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
          <button className="adm-btn ghost" onClick={() => confirm("Reset this page's sections to the original?") && save(T.sections.map((s) => ({ ...s })))}>Reset</button>
        </div>
      </div>
      <p className="adm-hint">These are the real sections of the store page, in order. Drag rows (or use the arrows) to reorder, copy them, or add new ones. Original sections can be hidden; copies and added sections can be removed.</p>
      {list.map((s, i) => (
        <div key={s.key} className="adm-card adm-sec" draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag !== null) save(move(list, drag, i)); setDrag(null); }} style={{ opacity: s.visible ? 1 : 0.5 }}>
          <div className="adm-row" style={{ justifyContent: "space-between" }}>
            <b>⋮⋮ <input value={s.label} onChange={(e) => up(i, { label: e.target.value })} style={{ width: 240, display: "inline-block" }} aria-label="Section name" /> <span className="adm-tag">{s.added ? `added · ${KINDS[s.added.kind]}` : s.copyOf ? "copy" : s.type}</span></b>
            <span className="adm-row">
              <Chk label="Visible" value={s.visible} onChange={(v) => up(i, { visible: v })} />
              {!fixed(s) && <button className="adm-btn ghost sm" onClick={() => duplicate(i)}>Duplicate</button>}
              {(s.copyOf || s.added) && <button className="adm-btn ghost sm" onClick={() => remove(i)}>Remove</button>}
              <OrderBtns i={i} n={list.length} onMove={(to) => save(move(list, i, to))} />
            </span>
          </div>
          {s.added && <AddedEditor s={s} onChange={(a) => up(i, { added: a })} />}
          <div className="adm-grid" style={{ marginTop: 12 }}>
            <Pick label="Space above" value={s.padTop} options={SPACING} onChange={(v) => up(i, { padTop: v })} />
            <Pick label="Space below" value={s.padBottom} options={SPACING} onChange={(v) => up(i, { padBottom: v })} />
            <ColorF label="Background" value={s.background} onChange={(v) => up(i, { background: v })} />
            <Pick label="Text alignment" value={s.align} options={["", "left", "center", "right"]} onChange={(v) => up(i, { align: v as SectionCfg["align"] })} />
            <Pick label="Width" value={s.width} options={["", "full", "contained"]} onChange={(v) => up(i, { width: v as SectionCfg["width"] })} />
            <Pick label="Show on" value={s.device} options={["all", "desktop", "mobile"]} onChange={(v) => up(i, { device: v as SectionCfg["device"] })} />
          </div>
        </div>
      ))}
      <Card title="Add a section">
        <div className="adm-row">
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} style={{ width: 200 }}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button className="adm-btn" onClick={add}>Add section</button>
        </div>
        <p className="adm-hint">New sections are placed above the footer; drag them where you want. They use the store's own fonts and colours.</p>
      </Card>
      <p className="adm-hint">To change words or pictures inside an original section, use Content → Text & image replacements.</p>
      <Card title="Preview"><DevicePreview url={T.sample} /></Card>
    </>
  );
}

function AddedEditor({ s, onChange }: { s: SectionCfg; onChange: (a: NonNullable<SectionCfg["added"]>) => void }) {
  const a = s.added!; const set = (p: Partial<typeof a>) => onChange({ ...a, ...p });
  const f = (label: string, k: keyof typeof a, area = false) => (
    <label className="adm-field"><span>{label}</span>{area ? <textarea value={a[k]} onChange={(e) => set({ [k]: e.target.value })} /> : <input value={a[k]} onChange={(e) => set({ [k]: e.target.value })} />}</label>
  );
  return (
    <div className="adm-grid" style={{ marginTop: 12 }}>
      {f("Heading", "heading")}
      {f("Text", "text", true)}
      {a.kind === "image" && <>{f("Image URL", "image")}{f("Image alt text", "alt")}</>}
      {a.kind !== "text" && <>{f("Button label", "button")}{f("Button link", "url")}</>}
      {!okUrl(a.url) && <div className="adm-err">Link must start with /, https://, mailto: or tel:</div>}
      {a.kind === "image" && a.image && !okUrl(a.image) && <div className="adm-err">Image URL must start with / or https://</div>}
    </div>
  );
}
