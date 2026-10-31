import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid } from "../admin/store";
import { Card } from "../admin/ui";
import { TEMPLATES, SPACING, SECTION_KINDS } from "../admin/site/registry";
import { Chk, ColorF, DevicePreview, Pick, move, OrderBtns, useSite } from "../admin/site/fields";
import type { SectionCfg, AddedSection } from "../admin/site/types";

export const Route = createFileRoute("/admin/sections")({ component: SectionsManager });

type Kind = AddedSection["kind"];
const base = { visible: true, padTop: "", padBottom: "", background: "", align: "" as const, width: "" as const, device: "all" as const };
const okUrl = (u: string) => !u || /^(\/|https?:\/\/|mailto:|tel:|#)/.test(u);

function SectionsManager() {
  const site = useSite();
  const [tpl, setTpl] = useState("home");
  const [drag, setDrag] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>("text");

  const T = TEMPLATES[tpl] || TEMPLATES["home"]!;
  const list = site.sections[tpl] || T.sections;

  const save = (l: SectionCfg[]) => setSite("sections", { ...site.sections, [tpl]: l });
  const up = (i: number, p: Partial<SectionCfg>) => save(list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const fixed = (s: SectionCfg) => /header|footer/.test(s.key) && !s.copyOf && !s.added;

  const duplicate = (i: number) => {
    const s = list[i]!;
    const key = `adm${uid()}`;
    const copy: SectionCfg = {
      ...s,
      key,
      label: `${s.label} (Copy)`,
      copyOf: s.copyOf || (s.added ? undefined : s.key),
      added: s.added ? { ...s.added } : undefined,
    };
    save([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
  };

  const add = () => {
    const key = `adm${uid()}`;
    const at = Math.max(1, list.findIndex((s) => /footer/.test(s.key)));
    const s: SectionCfg = {
      ...base,
      key,
      label: SECTION_KINDS[kind],
      type: kind,
      added: {
        kind,
        heading: kind === "gift_banner" ? "EXCLUSIVE GIFT DROP" : kind === "countdown" ? "LIMITED DROP COUNTDOWN" : "New section",
        text: kind === "gift_banner" ? "Claim your free gift with qualifying orders." : "",
        image: "",
        alt: "",
        button: "Shop now",
        url: "/collections/all/index.html",
        endDate: kind === "countdown" ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) : undefined,
        limit: "4",
      },
    };
    save([...list.slice(0, at), s, ...list.slice(at)]);
  };

  const remove = (i: number) => {
    if (confirm(`Remove "${list[i]!.label}" from this page?`)) {
      save(list.filter((_, j) => j !== i));
    }
  };

  const showAll = () => save(list.map((s) => ({ ...s, visible: true })));
  const hideAllOptional = () => save(list.map((s) => (fixed(s) ? s : { ...s, visible: false })));

  const visibleCount = list.filter((s) => s.visible).length;
  const hiddenCount = list.length - visibleCount;

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Page Sections & Layout</h1>
          <p className="adm-hint" style={{ marginTop: 4 }}>
            Control which full sections are shown or hidden on every page. Drag to reorder, duplicate, add custom banners, countdowns, and gift spotlights.
          </p>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          <select value={tpl} onChange={(e) => setTpl(e.target.value)} style={{ width: 220, fontWeight: 600 }}>
            {Object.entries(TEMPLATES).map(([k, t]) => {
              const count = (site.sections[k] || t.sections).filter((s) => s.visible).length;
              return (
                <option key={k} value={k}>
                  {t.label} ({count} visible)
                </option>
              );
            })}
          </select>
          <button className="adm-btn ghost" onClick={showAll}>
            Show all
          </button>
          <button className="adm-btn ghost" onClick={hideAllOptional}>
            Hide optional
          </button>
          <button
            className="adm-btn ghost"
            onClick={() => confirm("Reset this page's sections to original defaults?") && save(T.sections.map((s) => ({ ...s })))}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontFamily: "'FK Grotesk SemiMono', monospace" }}>
          Template: <strong>{T.label}</strong>
        </span>
        <span className="adm-tag" style={{ background: "#050505", color: "#fff" }}>
          {visibleCount} visible
        </span>
        {hiddenCount > 0 && (
          <span className="adm-tag" style={{ background: "#e5e5e5", color: "#666" }}>
            {hiddenCount} hidden
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((s, i) => {
          const isFixed = fixed(s);
          return (
            <div
              key={s.key}
              className="adm-card adm-sec"
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null) save(move(list, drag, i));
                setDrag(null);
              }}
              style={{
                opacity: s.visible ? 1 : 0.6,
                borderLeft: s.visible ? "4px solid #050505" : "4px solid #bbb",
                transition: "opacity 0.2s ease",
              }}
            >
              <div className="adm-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ cursor: "grab", opacity: 0.5 }}>⋮⋮</span>
                  <input
                    value={s.label}
                    onChange={(e) => up(i, { label: e.target.value })}
                    style={{ width: 260, fontWeight: 600, fontSize: 14 }}
                    aria-label="Section name"
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: "'FK Grotesk SemiMono', monospace",
                      padding: "2px 6px",
                      borderRadius: 2,
                      background: s.visible ? "#050505" : "#ddd",
                      color: s.visible ? "#fff" : "#444",
                    }}
                  >
                    {s.visible ? "VISIBLE" : "HIDDEN"}
                  </span>
                  <span className="adm-tag">
                    {s.added ? `added · ${SECTION_KINDS[s.added.kind]}` : s.copyOf ? "copy" : s.type}
                  </span>
                </div>

                <div className="adm-row" style={{ gap: 6 }}>
                  <button
                    className={`adm-btn sm ${s.visible ? "ghost" : ""}`}
                    onClick={() => up(i, { visible: !s.visible })}
                    style={{ minWidth: 70 }}
                  >
                    {s.visible ? "Hide" : "Show"}
                  </button>
                  {!isFixed && (
                    <button className="adm-btn ghost sm" onClick={() => duplicate(i)}>
                      Copy
                    </button>
                  )}
                  {(s.copyOf || s.added) && (
                    <button className="adm-btn ghost sm" style={{ color: "#c00" }} onClick={() => remove(i)}>
                      Remove
                    </button>
                  )}
                  <OrderBtns i={i} n={list.length} onMove={(to) => save(move(list, i, to))} />
                </div>
              </div>

              {s.added && <AddedSectionEditor s={s} onChange={(a) => up(i, { added: a })} />}

              <div className="adm-grid" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                <Pick label="Space above" value={s.padTop} options={SPACING} onChange={(v) => up(i, { padTop: v })} />
                <Pick label="Space below" value={s.padBottom} options={SPACING} onChange={(v) => up(i, { padBottom: v })} />
                <ColorF label="Background" value={s.background} onChange={(v) => up(i, { background: v })} />
                <Pick
                  label="Text alignment"
                  value={s.align}
                  options={["", "left", "center", "right"]}
                  onChange={(v) => up(i, { align: v as SectionCfg["align"] })}
                />
                <Pick
                  label="Container width"
                  value={s.width}
                  options={["", "full", "contained"]}
                  onChange={(v) => up(i, { width: v as SectionCfg["width"] })}
                />
                <Pick
                  label="Display on"
                  value={s.device}
                  options={["all", "desktop", "mobile"]}
                  onChange={(v) => up(i, { device: v as SectionCfg["device"] })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Add a New Section to this Page">
        <div className="adm-row" style={{ gap: 10 }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} style={{ width: 240, fontWeight: 600 }}>
            {Object.entries(SECTION_KINDS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <button className="adm-btn" onClick={add}>
            + Add to page
          </button>
        </div>
        <p className="adm-hint">
          Newly added sections are inserted above the footer. You can drag and drop them anywhere and configure text, buttons, images, countdown timers, or gift campaign banners.
        </p>
      </Card>

      <Card title="Live Page Preview">
        <DevicePreview url={T.sample} />
      </Card>
    </>
  );
}

function AddedSectionEditor({ s, onChange }: { s: SectionCfg; onChange: (a: NonNullable<SectionCfg["added"]>) => void }) {
  const a = s.added!;
  const set = (p: Partial<typeof a>) => onChange({ ...a, ...p });

  const field = (label: string, k: keyof typeof a, area = false) => (
    <label className="adm-field">
      <span>{label}</span>
      {area ? (
        <textarea rows={2} value={a[k] as string || ""} onChange={(e) => set({ [k]: e.target.value })} />
      ) : (
        <input value={a[k] as string || ""} onChange={(e) => set({ [k]: e.target.value })} />
      )}
    </label>
  );

  return (
    <div className="adm-grid" style={{ marginTop: 12 }}>
      {field("Heading", "heading")}
      {field("Text body", "text", true)}

      {(a.kind === "image" || a.kind === "gift_banner") && (
        <>
          {field("Image URL", "image")}
          {field("Image alt text", "alt")}
        </>
      )}

      {a.kind === "countdown" && (
        <label className="adm-field">
          <span>Countdown target (Date & time)</span>
          <input
            type="datetime-local"
            value={a.endDate || ""}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </label>
      )}

      {a.kind === "products" && (
        <>
          {field("Collection handle (e.g. all, hoodies, vault)", "collection")}
          {field("Number of products to show (e.g. 4)", "limit")}
        </>
      )}

      {field("Button label", "button")}
      {field("Button link URL", "url")}

      {!okUrl(a.url) && <div className="adm-err">Link must start with /, https://, mailto: or tel:</div>}
      {a.image && !okUrl(a.image) && <div className="adm-err">Image URL must start with / or https://</div>}
    </div>
  );
}
