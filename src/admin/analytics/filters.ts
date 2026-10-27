import { useEffect, useState } from "react";
import type { Source } from "./provider";

export type Filters = { preset: string; start: string; end: string; compare: boolean; interval: "day" | "week" | "month"; device: string; channel: string; page: string };
const KEY = "shihiko-analytics-filters", PRESETS_KEY = "shihiko-analytics-saved", SRC_KEY = "shihiko-analytics-source";
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function presetRange(p: string) {
  const end = new Date(); const start = new Date();
  start.setDate(end.getDate() - (p === "7d" ? 6 : p === "90d" ? 89 : p === "12m" ? 364 : 29));
  return { start: iso(start), end: iso(end) };
}
export const defaultFilters = (): Filters => ({ preset: "30d", ...presetRange("30d"), compare: true, interval: "day", device: "all", channel: "all", page: "all" });

// Shared across every analytics page, remembered in this browser.
export function useFilters() {
  const [f, setF] = useState<Filters>(defaultFilters);
  const [src, setSrc] = useState<Source>("demo");
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); setF(v.preset === "custom" ? v : { ...v, ...presetRange(v.preset) }); } } catch { /* ignore */ }
    setSrc((localStorage.getItem(SRC_KEY) as Source) || "demo");
  }, []);
  const update = (p: Partial<Filters>) => setF((cur) => { const n = { ...cur, ...p }; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const setSource = (s: Source) => { localStorage.setItem(SRC_KEY, s); setSrc(s); };
  return { f, update, src, setSource };
}
export function previousPeriod(f: Filters): Filters {
  const s = new Date(f.start), e = new Date(f.end); const len = +e - +s + 864e5;
  return { ...f, start: iso(new Date(+s - len)), end: iso(new Date(+s - 864e5)) };
}
export type Saved = { name: string; filters: Filters };
export const savedPresets = (): Saved[] => { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch { return []; } };
export const savePresets = (l: Saved[]) => localStorage.setItem(PRESETS_KEY, JSON.stringify(l));
