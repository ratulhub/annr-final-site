import { useState, type ReactNode } from "react";
import { setSite, useAdmin } from "../store";
import type { SiteConfig } from "./types";

// Controlled inputs for site settings with simple validation.
export function useSite() { return useAdmin().site; }

export function Obj<K extends keyof SiteConfig>({ k, children }: { k: K; children: (v: SiteConfig[K], set: (patch: Partial<SiteConfig[K]>) => void) => ReactNode }) {
  const site = useSite();
  const v = site[k];
  return <>{children(v, (patch) => setSite(k, { ...(v as object), ...(patch as object) } as SiteConfig[K]))}</>;
}

export const isUrl = (u: string) => !u || /^(\/|https?:\/\/|mailto:|tel:|#)/.test(u);
export const isColor = (c: string) => !c || /^#[0-9a-f]{3,8}$/i.test(c);

export function F({ label, value, onChange, hint, validate, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; validate?: (v: string) => string | null; type?: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const v = draft ?? value ?? "";
  const err = validate ? validate(v) : null;
  return (
    <label className="adm-field"><span>{label}</span>
      <input type={type} value={v} placeholder={placeholder} aria-invalid={!!err}
        onChange={(e) => { const nv = e.target.value; if (validate && validate(nv)) setDraft(nv); else { setDraft(null); onChange(nv); } }} />
      {err ? <small className="adm-err">{err}</small> : hint ? <small className="adm-hint">{hint}</small> : null}
    </label>
  );
}
export const UrlF = (p: { label: string; value: string; onChange: (v: string) => void; hint?: string }) =>
  <F {...p} validate={(v) => (isUrl(v) ? null : "Must start with /, https://, mailto: or tel:")} />;

export function ColorF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="adm-field"><span>{label}</span>
      <div className="adm-row" style={{ flexWrap: "nowrap" }}>
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} style={{ width: 46 }} />
        <input value={value} placeholder="Original" onChange={(e) => isColor(e.target.value) && onChange(e.target.value)} />
        {value && <button type="button" className="adm-btn ghost" onClick={() => onChange("")}>Reset</button>}
      </div>
    </label>
  );
}
export function Pick({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="adm-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o || "Original"}</option>)}</select></label>;
}
export function Big({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return <label className="adm-field" style={{ gridColumn: "1 / -1" }}><span>{label}</span><textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
export function Chk({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="adm-check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

// Move an item in a list (used for up/down and drag-and-drop ordering).
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const c = list.slice(); const [x] = c.splice(from, 1) as [T]; c.splice(to, 0, x); return c;
}
export function OrderBtns({ i, n, onMove }: { i: number; n: number; onMove: (to: number) => void }) {
  return <span className="adm-row" style={{ gap: 4 }}>
    <button type="button" className="adm-btn ghost sm" disabled={i === 0} onClick={() => onMove(i - 1)} aria-label="Move up">↑</button>
    <button type="button" className="adm-btn ghost sm" disabled={i === n - 1} onClick={() => onMove(i + 1)} aria-label="Move down">↓</button>
  </span>;
}

// Live preview of real store pages in a device-sized frame. Draft is shown via ?preview=1.
export function DevicePreview({ url }: { url: string }) {
  const [w, setW] = useState("100%");
  const [k, setK] = useState(0);
  const sep = url.includes("?") ? "&" : "?";
  return (
    <div>
      <div className="adm-row" style={{ marginBottom: 10 }}>
        {[["Desktop", "100%"], ["Tablet", "820px"], ["Mobile", "390px"]].map(([l, v]) => v && <button key={l} type="button" className={`adm-btn ${w === v ? "" : "ghost"} sm`} onClick={() => setW(v!)}>{l}</button>)}
        <button type="button" className="adm-btn ghost sm" onClick={() => setK(k + 1)}>Reload</button>
        <a className="link" href={`${url}${sep}preview=1`} target="_blank" rel="noreferrer">Open draft preview ↗</a>
      </div>
      <div style={{ border: "1px solid #000", background: "#f2f2f2", overflow: "auto" }}>
        <iframe key={k} title="Preview" src={`${url}${sep}preview=1`} style={{ width: w, height: 640, border: 0, display: "block", margin: "0 auto", background: "#fff" }} />
      </div>
    </div>
  );
}
