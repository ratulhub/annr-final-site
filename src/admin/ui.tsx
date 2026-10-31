import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { uid } from "./store";

export function BackBtn({
  to = "/admin",
  label = "← Back",
}: {
  to?: string;
  label?: string;
}) {
  return (
    <Link
      to={to}
      className="adm-btn ghost sm"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
        cursor: "pointer",
        borderRadius: 6,
      }}
    >
      {label}
    </Link>
  );
}

export function StatusTag({
  status,
  label,
}: {
  status: "active" | "draft" | "danger" | "warning" | "paid" | "pending" | "info" | "purple" | "online" | "unfulfilled";
  label?: string;
}) {
  return <span className={`adm-tag ${status}`}>{label || status}</span>;
}

export function Card({
  title,
  children,
  action,
  subtitle,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <section className="adm-card">
      {(title || action || subtitle) && (
        <div className="adm-top" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="adm-hint" style={{ margin: "2px 0 0" }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Text({
  label,
  value,
  onChange,
  type = "text",
  hint,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  hint,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
      <span>{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label className="adm-check">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {description && <span className="adm-hint" style={{ marginLeft: 26 }}>{description}</span>}
    </div>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  );
}

// Generic editor for a list of flat records (used for variants, menus, discounts...).
export function RowList<T extends { id: string }>({
  rows,
  onChange,
  fields,
  blank,
}: {
  rows: T[];
  onChange: (r: T[]) => void;
  blank: Omit<T, "id">;
  fields: { key: keyof T; label: string; type?: "text" | "number" | "bool" | string[] }[];
}) {
  const set = (i: number, k: keyof T, v: unknown) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={String(f.key)}>{f.label}</th>
            ))}
            <th style={{ width: 50, textAlign: "center" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              {fields.map((f) => (
                <td key={String(f.key)}>
                  {f.type === "bool" ? (
                    <input
                      type="checkbox"
                      checked={!!r[f.key]}
                      onChange={(e) => set(i, f.key, e.target.checked)}
                    />
                  ) : Array.isArray(f.type) ? (
                    <select
                      value={String(r[f.key])}
                      onChange={(e) => set(i, f.key, e.target.value)}
                    >
                      {f.type.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(r[f.key] ?? "")}
                      onChange={(e) =>
                        set(i, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                      }
                    />
                  )}
                </td>
              ))}
              <td style={{ textAlign: "center" }}>
                <button
                  type="button"
                  className="adm-btn danger sm"
                  style={{ padding: "4px 8px" }}
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  title="Delete row"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="adm-row" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="adm-btn ghost sm"
          onClick={() => onChange([...rows, { ...blank, id: uid() } as T])}
        >
          ➕ Add New Row
        </button>
      </div>
    </div>
  );
}

export function KeyValueEditor({
  data,
  onChange,
  types = {},
}: {
  data: Record<string, string | boolean>;
  onChange: (k: string, v: string | boolean) => void;
  types?: Record<string, string>;
}) {
  const label = (k: string) => k.replace(/([A-Z])/g, " $1");
  return (
    <div className="adm-grid">
      {Object.entries(data).map(([k, v]) =>
        typeof v === "boolean" ? (
          <Toggle key={k} label={label(k)} value={v} onChange={(x) => onChange(k, x)} />
        ) : (
          <Text
            key={k}
            label={label(k)}
            type={
              types[k] ||
              (/color|primary|background|accent|^text$/i.test(k) && String(v).startsWith("#")
                ? "color"
                : "text")
            }
            value={v}
            onChange={(x) => onChange(k, x)}
          />
        ),
      )}
    </div>
  );
}
