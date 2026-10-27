import type { ReactNode } from "react";
import { uid } from "./store";

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="adm-card">
      {(title || action) && <div className="adm-top" style={{ marginBottom: 14, paddingBottom: 10 }}>{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}
export function Text({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return <label className="adm-field"><span>{label}</span><input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
export function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="adm-field" style={{ gridColumn: "1 / -1" }}><span>{label}</span><textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="adm-check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="adm-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
}

// Generic editor for a list of flat records (used for variants, menus, discounts...).
export function RowList<T extends { id: string }>({ rows, onChange, fields, blank }: {
  rows: T[]; onChange: (r: T[]) => void; blank: Omit<T, "id">;
  fields: { key: keyof T; label: string; type?: "text" | "number" | "bool" | string[] }[];
}) {
  const set = (i: number, k: keyof T, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead><tr>{fields.map((f) => <th key={String(f.key)}>{f.label}</th>)}<th /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              {fields.map((f) => (
                <td key={String(f.key)}>
                  {f.type === "bool" ? <input type="checkbox" checked={!!r[f.key]} onChange={(e) => set(i, f.key, e.target.checked)} />
                    : Array.isArray(f.type) ? <select value={String(r[f.key])} onChange={(e) => set(i, f.key, e.target.value)}>{f.type.map((o) => <option key={o}>{o}</option>)}</select>
                    : <input type={f.type === "number" ? "number" : "text"} value={String(r[f.key] ?? "")} onChange={(e) => set(i, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} />}
                </td>
              ))}
              <td><button className="adm-btn danger" onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="adm-row" style={{ marginTop: 10 }}>
        <button className="adm-btn ghost" onClick={() => onChange([...rows, { ...blank, id: uid() } as T])}>+ Add</button>
      </div>
    </div>
  );
}

export function KeyValueEditor({ data, onChange, types = {} }: { data: Record<string, string | boolean>; onChange: (k: string, v: string | boolean) => void; types?: Record<string, string> }) {
  const label = (k: string) => k.replace(/([A-Z])/g, " $1");
  return (
    <div className="adm-grid">
      {Object.entries(data).map(([k, v]) =>
        typeof v === "boolean" ? <Toggle key={k} label={label(k)} value={v} onChange={(x) => onChange(k, x)} />
          : <Text key={k} label={label(k)} type={types[k] || (/color|primary|background|accent|^text$/i.test(k) && String(v).startsWith("#") ? "color" : "text")} value={v} onChange={(x) => onChange(k, x)} />,
      )}
    </div>
  );
}
