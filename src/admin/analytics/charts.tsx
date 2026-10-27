import { useMemo, useState } from "react";
import type { Card, Series, Table } from "./provider";

const COLORS = ["#000000", "#e10600", "#8a8a8a", "#4a4a4a"];

export function fmt(v: number | null | undefined, unit = "") {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Math.abs(v) >= 1000 ? v.toLocaleString() : String(v);
  return unit === "৳" ? `৳${n}` : `${n}${unit ? (unit === "%" ? "%" : " " + unit) : ""}`;
}

export function MetricCard({ c, onOpen }: { c: Card; onOpen?: (() => void) | undefined }) {
  const ch = c.value != null && c.prev ? ((c.value - c.prev) / c.prev) * 100 : null;
  const good = ch == null ? null : c.lowerIsBetter ? ch <= 0 : ch >= 0;
  return (
    <div className={`adm-stat${onOpen ? " click" : ""}`} title={c.help} onClick={onOpen}>
      <span>{c.label} <i className="adm-q" title={c.help}>?</i></span>
      <b>{c.value == null ? <small style={{ fontSize: 12 }}>Not available</small> : fmt(c.value, c.unit)}</b>
      {ch != null && <small style={{ color: good ? "#0a7d2c" : "#e10600" }}>{ch >= 0 ? "▲" : "▼"} {Math.abs(Math.round(ch))}% vs previous</small>}
    </div>
  );
}

export function LineChart({ series, height = 200 }: { series: Series[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = series[0]?.points || [];
  if (!pts.length) return <p>No data in this range.</p>;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const W = 800, H = height, pad = 30;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, pts.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <div>
      <div className="adm-row" style={{ gap: 14, fontSize: 10 }}>{series.map((s, i) => <span key={s.name}><i style={{ display: "inline-block", width: 10, height: 3, background: COLORS[i], verticalAlign: "middle", marginRight: 4 }} />{s.name}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => <g key={t}><line x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="#e5e5e5" /><text x={2} y={y(max * t) + 3} fontSize="9" fill="#6b6b6b">{Math.round(max * t)}</text></g>)}
        {series.map((s, si) => <polyline key={s.name} fill="none" stroke={COLORS[si]} strokeWidth="2" points={s.points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ")} />)}
        {pts.map((p, i) => <rect key={p.x} x={x(i) - (W / pts.length) / 2} y={0} width={W / pts.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
        {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={pad} y2={H - pad} stroke="#000" strokeDasharray="3 3" />
          <text x={Math.min(x(hover) + 6, W - 150)} y={pad + 4} fontSize="10">{pts[hover]!.x}: {series.map((s) => `${s.name} ${s.points[hover]?.y}`).join(" · ")}</text></g>}
        <text x={pad} y={H - 8} fontSize="9" fill="#6b6b6b">{pts[0]!.x}</text>
        <text x={W - pad} y={H - 8} fontSize="9" fill="#6b6b6b" textAnchor="end">{pts[pts.length - 1]!.x}</text>
      </svg>
    </div>
  );
}

export function BarList({ items, unit }: { items: { label: string; value: number }[]; unit?: string | undefined }) {
  if (!items.length) return <p>No data.</p>;
  const max = Math.max(1, ...items.map((i) => i.value)); const total = items.reduce((a, b) => a + b.value, 0);
  return <div>{items.map((i) => <div key={i.label} style={{ marginBottom: 8 }} title={`${i.value} (${Math.round((i.value / total) * 100)}%)`}>
    <div className="adm-row" style={{ justifyContent: "space-between", fontSize: 11 }}><span>{i.label}</span><span>{fmt(i.value, unit)} · {Math.round((i.value / total) * 100)}%</span></div>
    <div style={{ height: 8, background: "#f2f2f2" }}><div style={{ height: 8, width: `${(i.value / max) * 100}%`, background: "#000" }} /></div>
  </div>)}</div>;
}

export function Funnel({ steps }: { steps: { step: string; count: number }[] }) {
  const max = Math.max(1, steps[0]?.count || 1);
  return <div>{steps.map((s, i) => <div key={s.step + i} style={{ marginBottom: 6 }}>
    <div style={{ width: `${Math.max(4, (s.count / max) * 100)}%`, background: i ? "#333" : "#000", color: "#fff", padding: "10px 12px", fontSize: 11, textTransform: "uppercase" }}>{i + 1}. {s.step} — {s.count.toLocaleString()}</div>
  </div>)}</div>;
}

export function csv(name: string, columns: string[], rows: (string | number)[][]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([[columns, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = name.replace(/\W+/g, "-").toLowerCase() + ".csv"; a.click();
}

// Sortable, searchable, paginated table with CSV export.
export function DataTable({ t, onRowClick }: { t: Table; onRowClick?: ((row: (string | number)[]) => void) | undefined }) {
  const [q, setQ] = useState(""); const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null); const [page, setPage] = useState(0);
  const PER = 10;
  const rows = useMemo(() => {
    let r = t.rows.filter((row) => row.some((c) => String(c).toLowerCase().includes(q.toLowerCase())));
    if (sort) r = r.slice().sort((a, b) => { const x = a[sort.i]!, y = b[sort.i]!; return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir; });
    return r;
  }, [t, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PER)); const p = Math.min(page, pages - 1);
  return (
    <section className="adm-card">
      <div className="adm-top" style={{ marginBottom: 10, paddingBottom: 8 }}><h2>{t.title}</h2>
        <div className="adm-row"><input placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} style={{ width: 180 }} />
          <button className="adm-btn ghost sm" disabled={!rows.length} onClick={() => csv(t.title, t.columns, rows)}>Export CSV</button></div></div>
      {t.help && <p className="adm-hint">{t.help}</p>}
      {rows.length ? <table><thead><tr>{t.columns.map((c, i) => <th key={c} style={{ cursor: "pointer" }} onClick={() => setSort({ i, dir: sort?.i === i && sort.dir === -1 ? 1 : -1 })}>{c}{sort?.i === i ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>)}</tr></thead>
        <tbody>{rows.slice(p * PER, p * PER + PER).map((r, i) => <tr key={i} onClick={() => onRowClick?.(r)} style={onRowClick ? { cursor: "pointer" } : undefined}>{r.map((c, j) => <td key={j}>{typeof c === "number" ? c.toLocaleString() : c}</td>)}</tr>)}</tbody></table> : <p>No rows.</p>}
      {pages > 1 && <div className="adm-row" style={{ marginTop: 10 }}><button className="adm-btn ghost sm" disabled={p === 0} onClick={() => setPage(p - 1)}>Prev</button><span>{p + 1} / {pages}</span><button className="adm-btn ghost sm" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button></div>}
    </section>
  );
}
