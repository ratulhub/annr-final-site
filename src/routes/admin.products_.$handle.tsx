import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  deleteProductFromSupabase,
  publish,
  setState,
  syncProductToSupabase,
  uid,
  useAdmin,
  type Product,
  type Variant,
} from "../admin/store";
import { Area, BackBtn, Card, RowList, Select, Text, Toggle } from "../admin/ui";
import { storeFile } from "../admin/services/media";
import { normalizeDbImageUrl, safeImageUrl } from "../admin/security/sanitize";
import { isSupabaseConfigured } from "../lib/supabase";

export const Route = createFileRoute("/admin/products_/$handle")({ component: Edit });

interface SizeGuideRow {
  size: string;
  col1: string;
  col2: string;
  col3: string;
}

interface StructuredSizeGuide {
  unit: "in";
  fitType: string;
  headers: [string, string, string, string];
  rows: SizeGuideRow[];
  notes: string;
}

const SIZE_GUIDE_PRESETS: Record<string, StructuredSizeGuide> = {
  tee: {
    unit: "in",
    fitType: "oversized fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "22.5", col2: "27.5", col3: "8.5" },
      { size: "M", col1: "23.5", col2: "28.5", col3: "9.0" },
      { size: "L", col1: "24.5", col2: "29.5", col3: "9.5" },
      { size: "XL", col1: "26.0", col2: "30.5", col3: "10.0" },
      { size: "XXL", col1: "27.0", col2: "31.0", col3: "10.5" },
    ],
    notes: "Heavyweight 280 GSM combed cotton. Drop-shoulder oversized silhouette (flat inches ″).",
  },
  hoodie: {
    unit: "in",
    fitType: "oversized fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "24.0", col2: "26.5", col3: "23.0" },
      { size: "M", col1: "25.5", col2: "28.0", col3: "24.0" },
      { size: "L", col1: "26.5", col2: "29.0", col3: "24.5" },
      { size: "XL", col1: "28.0", col2: "30.0", col3: "25.0" },
      { size: "XXL", col1: "29.0", col2: "31.0", col3: "25.5" },
    ],
    notes: "480 GSM heavyweight French terry fleece. Boxy drop-shoulder fit (flat inches ″).",
  },
  longsleeve: {
    unit: "in",
    fitType: "relaxed fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "22.5", col2: "27.0", col3: "23.5" },
      { size: "M", col1: "24.0", col2: "28.0", col3: "24.5" },
      { size: "L", col1: "25.0", col2: "29.0", col3: "25.0" },
      { size: "XL", col1: "26.5", col2: "30.0", col3: "25.5" },
      { size: "XXL", col1: "27.5", col2: "31.0", col3: "26.0" },
    ],
    notes: "Relaxed silhouette with ribbed cuffs (flat inches ″).",
  },
  jacket: {
    unit: "in",
    fitType: "boxy fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "24.5", col2: "26.0", col3: "24.0" },
      { size: "M", col1: "26.0", col2: "27.0", col3: "24.5" },
      { size: "L", col1: "27.0", col2: "28.0", col3: "25.0" },
      { size: "XL", col1: "28.5", col2: "29.0", col3: "25.5" },
      { size: "XXL", col1: "29.5", col2: "29.5", col3: "26.0" },
    ],
    notes: "Cropped boxy outerwear cut. Measured flat in inches (″).",
  },
  pants: {
    unit: "in",
    fitType: "relaxed fit",
    headers: ["SIZE", "WAIST", "LENGTH", "INSEAM"],
    rows: [
      { size: "S (30)", col1: "30.0", col2: "41.0", col3: "29.0" },
      { size: "M (32)", col1: "32.0", col2: "41.5", col3: "29.5" },
      { size: "L (34)", col1: "34.0", col2: "42.5", col3: "30.0" },
      { size: "XL (36)", col1: "36.0", col2: "43.5", col3: "31.0" },
      { size: "XXL (38)", col1: "38.0", col2: "44.0", col3: "31.5" },
    ],
    notes: "Wide-leg architectural cut. All measurements in inches (″).",
  },
  shorts: {
    unit: "in",
    fitType: "relaxed fit",
    headers: ["SIZE", "WAIST", "LENGTH", "OPENING"],
    rows: [
      { size: "S", col1: "29.0", col2: "19.0", col3: "12.0" },
      { size: "M", col1: "31.0", col2: "19.5", col3: "12.5" },
      { size: "L", col1: "33.0", col2: "20.5", col3: "13.5" },
      { size: "XL", col1: "35.0", col2: "21.5", col3: "14.0" },
      { size: "XXL", col1: "37.0", col2: "22.0", col3: "14.5" },
    ],
    notes: "Elasticated drawstring waist with relaxed knee-length cut (inches ″).",
  },
};

function detectDefaultPreset(handle: string, title: string): StructuredSizeGuide {
  const s = `${handle} ${title}`.toLowerCase();
  if (/jean|pant|trouser|cargo|jogger|sweatpant/.test(s)) return SIZE_GUIDE_PRESETS["pants"]!;
  if (/short/.test(s)) return SIZE_GUIDE_PRESETS["shorts"]!;
  if (/jacket|coat|bomber|vest|workwear|windbreaker/.test(s)) return SIZE_GUIDE_PRESETS["jacket"]!;
  if (/hoodie|zip|sweatshirt|fleece/.test(s)) return SIZE_GUIDE_PRESETS["hoodie"]!;
  if (/longsleeve|long-sleeve|knit|sweater|crewneck|thermal/.test(s)) return SIZE_GUIDE_PRESETS["longsleeve"]!;
  return SIZE_GUIDE_PRESETS["tee"]!;
}

function parseSizeChart(raw: string | undefined, handle: string, title: string): StructuredSizeGuide {
  if (raw && raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rows)) {
        return {
          unit: "in",
          fitType: parsed.fitType || "oversized fit",
          headers: parsed.headers || ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
          rows: parsed.rows,
          notes: parsed.notes || "",
        };
      }
    } catch {}
  }
  const base = detectDefaultPreset(handle, title);
  return {
    ...base,
    rows: base.rows.map((r) => ({ ...r })),
    notes: raw && !raw.trim().startsWith("{") ? raw : base.notes,
  };
}

function Edit() {
  const { handle } = Route.useParams();
  const s = useAdmin();
  const nav = useNavigate();
  const p = s.products.find((x) => x.handle === handle);
  const [img, setImg] = useState("");
  const [bulkImg, setBulkImg] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [imgErr, setImgErr] = useState("");
  const [publishedToast, setPublishedToast] = useState(false);
  const [dbStatus, setDbStatus] = useState<string>("Auto-saved & Published");
  const [handleDraft, setHandleDraft] = useState<string>(p?.handle || handle);
  const latestProductRef = useRef<Product | null>(p || null);
  latestProductRef.current = p || null;
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHandleDraft(p?.handle || handle);
    try {
      const prevErr = sessionStorage.getItem("annr_last_product_sync_err");
      if (prevErr && prevErr.startsWith(`${handle}:`)) {
        sessionStorage.removeItem("annr_last_product_sync_err");
        setDbStatus(`⚠ Saved locally (DB sync failed: ${prevErr.slice(handle.length + 1)})`);
      }
    } catch {}
  }, [p?.handle, handle]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (pubTimerRef.current) clearTimeout(pubTimerRef.current);
    };
  }, []);

  if (!p) return <p>Product not found. <Link className="link" to="/admin/products">Back</Link></p>;

  const runDbSync = async (product: Product) => {
    if (!isSupabaseConfigured()) {
      setDbStatus("✓ Saved locally");
      return;
    }
    setDbStatus("Saving to live DB...");
    const res = await syncProductToSupabase(product);
    if (res.ok) {
      const notes: string[] = [];
      if (res.skippedLocalImages && res.skippedLocalImages > 0) {
        notes.push(`${res.skippedLocalImages} local upload(s) need an https:// link for live storefront`);
      }
      if (res.rejectedHttpImages && res.rejectedHttpImages > 0) {
        notes.push(`${res.rejectedHttpImages} image link(s) skipped (live DB requires https:// or / path)`);
      }
      if (notes.length > 0) {
        setDbStatus(`✓ Live in DB (⚠ ${notes.join("; ")})`);
      } else {
        setDbStatus("✓ Live in DB & Storefront");
      }
    } else {
      console.warn("Supabase products upsert notice:", res.error);
      setDbStatus(`⚠ Saved locally (DB sync failed: ${res.error || "check auth/RLS"})`);
    }
  };

  const up = (patchOrFn: Partial<Product> | ((cur: Product) => Partial<Product>)) => {
    const campaignSlugs = new Set((s.campaigns || []).map((c) => c.slug));
    setState((x) => {
      const cur = x.products.find((y) => y.handle === handle);
      if (!cur) return x;
      const patch = typeof patchOrFn === "function" ? patchOrFn(cur) : patchOrFn;
      const nextProduct: Product = { ...cur, ...patch, measurementUnit: "in", isOneOfOne: true };

      if (patch.category !== undefined || patch.campaign !== undefined) {
        const nextCat = patch.category ?? cur.category ?? "hoodies";
        const nextCamp = patch.campaign ?? cur.campaign ?? "unique-campaign";
        const cols = (nextProduct.collections || []).filter(
          (c) => c !== cur.category && !campaignSlugs.has(c) && c !== "unique-campaign",
        );
        if (nextCamp && nextCamp !== "none" && !cols.includes(nextCamp)) cols.unshift(nextCamp);
        if (nextCat && !cols.includes(nextCat)) cols.push(nextCat);
        if (!cols.includes("all")) cols.push("all");
        nextProduct.collections = Array.from(new Set(cols));
      }

      if (!patch.variants && (patch.size !== undefined || patch.price !== undefined || patch.code !== undefined || patch.status !== undefined)) {
        const first = nextProduct.variants?.[0] || { id: uid(), option: "L", sku: "ANNR-U001", price: "0.00", stock: 1 };
        const nextStock = nextProduct.status === "sold" ? 0 : (nextProduct.stock ?? 1);
        nextProduct.variants = [
          {
            ...first,
            option: nextProduct.size || first.option || "L",
            sku: nextProduct.code || first.sku || "ANNR-U001",
            price: nextProduct.price || first.price || "0.00",
            stock: nextStock,
          },
          ...(nextProduct.variants?.slice(1) || []),
        ];
      }

      latestProductRef.current = nextProduct;
      return {
        ...x,
        products: x.products.map((y) => (y.handle === handle ? nextProduct : y)),
      };
    });

    if (pubTimerRef.current) clearTimeout(pubTimerRef.current);
    pubTimerRef.current = setTimeout(() => {
      try { publish(); } catch {}
    }, 60);

    if (isSupabaseConfigured()) {
      setDbStatus("Pending save...");
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        if (latestProductRef.current) {
          void runDbSync(latestProductRef.current);
        }
      }, 350);
    }
  };

  const toggleCol = (h: string) =>
    up((cur) => ({
      collections: cur.collections.includes(h) ? cur.collections.filter((c) => c !== h) : [...cur.collections, h],
    }));

  const applyHandleRename = async () => {
    const clean = handleDraft
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!clean || clean === p.handle) {
      setHandleDraft(p.handle);
      return;
    }
    if (s.products.some((other) => other.handle === clean)) {
      setImgErr(`Another product already uses handle "${clean}".`);
      setHandleDraft(p.handle);
      return;
    }
    const oldHandle = p.handle;
    const renamed: Product = { ...p, handle: clean };
    latestProductRef.current = renamed;
    setState((x) => ({
      ...x,
      products: x.products.map((y) => (y.handle === oldHandle ? renamed : y)),
    }));
    try { publish(); } catch {}
    if (isSupabaseConfigured()) {
      await deleteProductFromSupabase(oldHandle);
      await runDbSync(renamed);
    }
    nav({ to: "/admin/products/$handle", params: { handle: clean }, replace: true });
  };

  const sg = parseSizeChart(p.sizeChart, p.handle, p.title);
  const saveSg = (next: StructuredSizeGuide) => {
    up({ sizeChart: JSON.stringify({ ...next, unit: "in" }) });
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn to="/admin/products" label="← Products" />
          <h1>{p.title}</h1>
        </div>
        <div className="adm-row">
          <span className="adm-saved">{publishedToast ? "✓ Published to Storefront" : dbStatus}</span>
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => {
              if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
              publish();
              void runDbSync(p);
              setPublishedToast(true);
              setTimeout(() => setPublishedToast(false), 2500);
            }}
          >
            Publish to Storefront
          </button>
          <a className="adm-btn ghost" href={`/products/${p.handle}/index.html`} target="_blank" rel="noreferrer">View</a>
          <button
            type="button"
            className="adm-btn ghost"
            onClick={() => {
              const h = `${p.handle}-piece-${uid()}`;
              const code = "ANNR-U" + Math.floor(100 + Math.random() * 900);
              const { id: _dropId, ...restP } = p;
              const copy: Product = { ...restP, handle: h, code, title: `${p.title} (New 1-of-1)`, status: "draft", stock: 1 };
              setState((x) => ({ ...x, products: [copy, ...x.products] }));
              setTimeout(() => { try { publish(); } catch {} }, 30);
              void syncProductToSupabase(copy);
              nav({ to: "/admin/products/$handle", params: { handle: h } });
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="adm-btn danger"
            onClick={() => {
              if (confirm("Delete this product?")) {
                setState((x) => ({ ...x, products: x.products.filter((y) => y.handle !== handle) }));
                setTimeout(() => { try { publish(); } catch {} }, 30);
                void deleteProductFromSupabase(handle);
                nav({ to: "/admin/products" });
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <Card title="One-of-One Archival Garment Configuration" subtitle="Configure unique piece code, exact size, hand measurements, campaign and collector status.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-grid">
            <Text label="Piece Code / SKU (e.g. ANNR-U001)" value={p.code || ""} onChange={(v) => up({ code: v.toUpperCase() })} />
            <label className="adm-field">
              <span>Category</span>
              <select
                value={p.category || "hoodies"}
                onChange={(e) => up({ category: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--p-border-subdued)" }}
              >
                {(s.categories || [
                  { slug: "hoodies", name: "Hoodies" },
                  { slug: "sweatshirts", name: "Sweatshirts" },
                  { slug: "trousers", name: "Trousers" },
                  { slug: "sweaters", name: "Sweaters" },
                  { slug: "t-shirts", name: "T-Shirts" },
                  { slug: "jackets", name: "Jackets" },
                  { slug: "knitwear", name: "Knitwear" },
                  { slug: "accessories", name: "Accessories" },
                ]).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Campaign Drop</span>
              <select
                value={p.campaign || "unique-campaign"}
                onChange={(e) => up({ campaign: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--p-border-subdued)" }}
              >
                {(s.campaigns && s.campaigns.length
                  ? s.campaigns
                  : [{ slug: "unique-campaign", name: "Unique Campaign (1-of-1 Drop)" }]
                ).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
                <option value="none">Standard Category Only</option>
              </select>
            </label>
            <Select
              label="Archival Status"
              value={p.status}
              options={["active", "reserved", "sold", "draft", "archived"]}
              onChange={(v) => up({ status: v as Product["status"], stock: v === "sold" ? 0 : 1 })}
            />
          </div>

          {/* Size Tag Selection & Visibility Configuration */}
          <div style={{ background: "#ffffff", border: "1px solid var(--p-border-subdued)", borderRadius: 6, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: "#111" }}>Garment Size Selection & Tag Visibility</span>
                <p className="adm-hint" style={{ margin: "2px 0 0" }}>
                  Select the size (S, M, L, XL, etc.) and choose whether to display or hide the size badge on the storefront.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.showSize !== false ? "#16a34a" : "#d97706" }}>
                  {p.showSize !== false ? "● Size Tag Visible" : "○ Size Tag Hidden (Measurements Only)"}
                </span>
              </div>
            </div>

            <div className="adm-grid" style={{ gap: 14 }}>
              <label className="adm-field">
                <span>Display Size Tag (M, L, XL, etc.) on Storefront?</span>
                <select
                  value={p.showSize !== false ? "show" : "hide"}
                  onChange={(e) => up({ showSize: e.target.value === "show" })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--p-border-subdued)" }}
                >
                  <option value="show">✓ Show Size Tag (e.g. "SIZE {p.size || 'L'}")</option>
                  <option value="hide">✕ Hide Size Tag (Do not show M/L/XL — show flat measurements only)</option>
                </select>
              </label>

              <div>
                <label className="adm-field">
                  <span>Selected Size</span>
                  <input
                    type="text"
                    value={p.size || ""}
                    placeholder="e.g. S, M, L, XL, FREE SIZE"
                    onChange={(e) => up({ size: e.target.value.toUpperCase() })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--p-border-subdued)" }}
                  />
                </label>
                {/* Quick Size Selection Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {["XS", "S", "M", "L", "XL", "XXL", "3XL", "FREE SIZE"].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => up({ size: sz })}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 3,
                        border: p.size === sz ? "1.5px solid #111" : "1px solid #d1d5db",
                        background: p.size === sz ? "#111" : "#f3f4f6",
                        color: p.size === sz ? "#fff" : "#374151",
                        cursor: "pointer",
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="adm-grid">
            <Text label="Fabric Details (e.g. 480 GSM Heavy French Terry)" value={p.fabric || ""} onChange={(v) => up({ fabric: v })} />
            <Text label="Garment Condition (e.g. 10/10 Deadstock Archival)" value={p.condition || ""} onChange={(v) => up({ condition: v })} />
            <Text label="Care Instructions (e.g. Cold Hand Wash Only)" value={p.careInstructions || ""} onChange={(v) => up({ careInstructions: v })} />
          </div>

          <div style={{ background: "#f9fafb", border: "1px solid var(--p-border-subdued)", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>
                Garment Exact Flat Measurements (in Inches ″)
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, background: "#111", color: "#fff", padding: "2px 8px", borderRadius: 3, fontFamily: "monospace" }}>
                UNIT: INCHES (″)
              </span>
            </div>
            <p className="adm-hint" style={{ margin: "0 0 12px" }}>
              Measurements entered here are in inches (1″ = 2.54 cm). Displayed on the storefront's luxury one-of-one specification table.
            </p>
            <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              <label className="adm-field">
                <span>Chest (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 24.5"
                  value={p.measurements?.chest ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, chest: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Length (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 29"
                  value={p.measurements?.length ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, length: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Shoulder (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 20.5"
                  value={p.measurements?.shoulder ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, shoulder: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Sleeve (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 25"
                  value={p.measurements?.sleeve ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, sleeve: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Waist (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 32"
                  value={p.measurements?.waist ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, waist: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Inseam (inches)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 30"
                  value={p.measurements?.inseam ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, inseam: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Details"><div className="adm-grid">
        <Text label="Title" value={p.title} onChange={(v) => up({ title: v })} />
        <Text label="Vendor" value={p.vendor} onChange={(v) => up({ vendor: v })} />
        <Text label="Product type" value={p.type} onChange={(v) => up({ type: v })} />
        <Text label="Tags (comma separated)" value={p.tags} onChange={(v) => up({ tags: v })} />
        <Text label="Badge (e.g. 1 OF 1, SOLD)" value={p.badge} onChange={(v) => up({ badge: v })} />
        <Area label="Description" value={p.description} onChange={(v) => up({ description: v })} />
      </div></Card>

      <Card
        title="Size Guide & Fit Table (Interactive Storefront Popup · Inches ″)"
        subtitle="Customize the Size Guide modal (#sizes-popup) for this product in INCHES (″). CM equivalents calculate automatically on the storefront."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1-Click Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--p-text-subdued)" }}>Load Garment Preset (Inches):</span>
            {[
              { key: "tee", label: "T-Shirt / Tee" },
              { key: "hoodie", label: "Hoodie / Sweatshirt" },
              { key: "longsleeve", label: "Sweater / Knitwear" },
              { key: "jacket", label: "Jacket / Outerwear" },
              { key: "pants", label: "Trousers / Pants" },
              { key: "shorts", label: "Shorts" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="adm-btn ghost sm"
                onClick={() => {
                  const preset = SIZE_GUIDE_PRESETS[item.key];
                  if (preset) saveSg({ ...preset, unit: "in", rows: preset.rows.map((r) => ({ ...r })) });
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Fit Type & Column Headers */}
          <div className="adm-grid">
            <label className="adm-field">
              <span>Garment Fit Type Badge</span>
              <input
                type="text"
                value={sg.fitType}
                placeholder="e.g. oversized fit, boxy fit, relaxed fit"
                onChange={(e) => saveSg({ ...sg, fitType: e.target.value })}
              />
            </label>
            <label className="adm-field">
              <span>Column 2 Header (e.g. CHEST or WAIST)</span>
              <input
                type="text"
                value={sg.headers[1]}
                onChange={(e) =>
                  saveSg({ ...sg, headers: [sg.headers[0], e.target.value.toUpperCase(), sg.headers[2], sg.headers[3]] })
                }
              />
            </label>
            <label className="adm-field">
              <span>Column 3 Header (e.g. LENGTH)</span>
              <input
                type="text"
                value={sg.headers[2]}
                onChange={(e) =>
                  saveSg({ ...sg, headers: [sg.headers[0], sg.headers[1], e.target.value.toUpperCase(), sg.headers[3]] })
                }
              />
            </label>
            <label className="adm-field">
              <span>Column 4 Header (e.g. SLEEVE or INSEAM)</span>
              <input
                type="text"
                value={sg.headers[3]}
                onChange={(e) =>
                  saveSg({ ...sg, headers: [sg.headers[0], sg.headers[1], sg.headers[2], e.target.value.toUpperCase()] })
                }
              />
            </label>
          </div>

          {/* Measurement Table Editor (IN + Live CM preview) */}
          <div className="adm-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--p-border-subdued)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[0]}</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[1]} (IN ″)</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[2]} (IN ″)</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[3]} (IN ″)</th>
                  <th style={{ padding: "8px 10px", color: "var(--p-text-subdued)", fontSize: 11 }}>Auto CM Preview</th>
                  <th style={{ padding: "8px 10px", width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {sg.rows.map((row, idx) => {
                  const toCm = (v: string) => {
                    const n = parseFloat(v);
                    return Number.isFinite(n) ? (n * 2.54).toFixed(1) + " cm" : "-";
                  };
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="text"
                          value={row.size}
                          style={{ width: 80, fontWeight: 700 }}
                          onChange={(e) => {
                            const nextRows = sg.rows.map((r, i) => (i === idx ? { ...r, size: e.target.value } : r));
                            saveSg({ ...sg, rows: nextRows });
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="text"
                          value={row.col1}
                          style={{ width: 90 }}
                          onChange={(e) => {
                            const nextRows = sg.rows.map((r, i) => (i === idx ? { ...r, col1: e.target.value } : r));
                            saveSg({ ...sg, rows: nextRows });
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="text"
                          value={row.col2}
                          style={{ width: 90 }}
                          onChange={(e) => {
                            const nextRows = sg.rows.map((r, i) => (i === idx ? { ...r, col2: e.target.value } : r));
                            saveSg({ ...sg, rows: nextRows });
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input
                          type="text"
                          value={row.col3}
                          style={{ width: 90 }}
                          onChange={(e) => {
                            const nextRows = sg.rows.map((r, i) => (i === idx ? { ...r, col3: e.target.value } : r));
                            saveSg({ ...sg, rows: nextRows });
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11, color: "var(--p-text-subdued)" }}>
                        {toCm(row.col1)} / {toCm(row.col2)} / {toCm(row.col3)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        {sg.rows.length > 1 && (
                          <button
                            type="button"
                            className="adm-btn danger plain sm"
                            onClick={() => saveSg({ ...sg, rows: sg.rows.filter((_, i) => i !== idx) })}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="adm-btn ghost sm"
              onClick={() =>
                saveSg({
                  ...sg,
                  rows: [...sg.rows, { size: "3XL", col1: "29.5", col2: "31.5", col3: "26.0" }],
                })
              }
            >
              + Add Size Row
            </button>
          </div>

          <Area
            label="Fit Notes / Model Sizing Info (displayed in Size Guide popup & product details)"
            value={sg.notes}
            onChange={(v) => saveSg({ ...sg, notes: v })}
          />
        </div>
      </Card>
      <Card title="Pricing"><div className="adm-grid">
        <Text label="Price" value={p.price} onChange={(v) => up({ price: v })} />
        <Text label="Compare-at price" value={p.compareAt} onChange={(v) => up({ compareAt: v })} />
        <Select label="Currency" value={p.currency} options={["BDT", "USD", "EUR", "INR"]} onChange={(v) => up({ currency: v })} />
        <Text label="Weight (kg)" value={p.weight} onChange={(v) => up({ weight: v })} />
      </div></Card>
      <Card
        title={`Product Photography & Gallery (${p.images.length})`}
        subtitle="Manage 1-of-1 archival piece photos. The primary cover photo is shown on cards and first in the detail page carousel."
      >
        {p.images.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", border: "1px dashed #d1d5db", borderRadius: 6, color: "#6b7280" }}>
            No photos added yet. Paste image URLs below or upload photos.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {p.images.map((src, i) => (
              <div
                key={src + i}
                style={{
                  position: "relative",
                  borderRadius: 6,
                  overflow: "hidden",
                  border: i === 0 ? "2px solid #111" : "1px solid #e5e7eb",
                  background: "#fafafa",
                  boxShadow: i === 0 ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                }}
              >
                <div style={{ aspectRatio: "1/1", width: "100%", overflow: "hidden", position: "relative" }}>
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/_ext/annr-template-001.png";
                    }}
                  />
                  {i === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        background: "#111",
                        color: "#fff",
                        fontFamily: "'FK Grotesk SemiMono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 3,
                        letterSpacing: "0.5px",
                      }}
                    >
                      ★ COVER
                    </div>
                  )}
                  <button
                    type="button"
                    title="Remove Photo"
                    onClick={() => up({ images: p.images.filter((_, j) => j !== i) })}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#fff",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    {i > 0 && (
                      <button
                        type="button"
                        title="Move left"
                        className="adm-btn ghost sm"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={() => {
                          const a = [...p.images];
                          const tmp = a[i - 1]!;
                          a[i - 1] = a[i]!;
                          a[i] = tmp;
                          up({ images: a });
                        }}
                      >
                        ←
                      </button>
                    )}
                    {i < p.images.length - 1 && (
                      <button
                        type="button"
                        title="Move right"
                        className="adm-btn ghost sm"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={() => {
                          const a = [...p.images];
                          const tmp = a[i + 1]!;
                          a[i + 1] = a[i]!;
                          a[i] = tmp;
                          up({ images: a });
                        }}
                      >
                        →
                      </button>
                    )}
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      className="adm-btn ghost sm"
                      style={{ padding: "2px 6px", fontSize: 10, fontWeight: 600, color: "#e05a2b" }}
                      onClick={() => {
                        const target = p.images[i]!;
                        const rest = p.images.filter((_, j) => j !== i);
                        up({ images: [target, ...rest] });
                      }}
                    >
                      Make Cover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {/* Single URL or Upload */}
          <div className="adm-row" style={{ flexWrap: "wrap", gap: 8 }}>
            <input
              placeholder="Paste Photo URL (e.g. Supabase Storage link or HTTPS URL)"
              value={img}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setImg(e.target.value);
                setImgErr("");
              }}
              style={{ flex: 1, minWidth: 220 }}
            />
            <button
              type="button"
              className="adm-btn primary sm"
              onClick={() => {
                const raw = img.trim();
                const dbReady = normalizeDbImageUrl(raw);
                const clean = dbReady || safeImageUrl(raw);
                if (!clean) {
                  setImgErr("Enter a valid https:// or / image URL (SVG is not allowed).");
                  return;
                }
                if (!dbReady && /^http:\/\//i.test(clean)) {
                  setImgErr("Use https:// instead of http:// so the photo URL syncs cleanly to Supabase.");
                  return;
                }
                setImgErr("");
                up({ images: [...p.images, clean] });
                setImg("");
              }}
            >
              + Add URL
            </button>
            <label className="adm-btn ghost sm">
              Upload File
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const f = input.files?.[0];
                  if (!f) return;
                  setImgErr("");
                  try {
                    const url = await storeFile(f);
                    up((cur) => ({ images: [...cur.images, url] }));
                  } catch (err) {
                    setImgErr((err as Error).message);
                  } finally {
                    input.value = "";
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="adm-btn ghost sm"
              onClick={() => setShowBulk(!showBulk)}
            >
              {showBulk ? "Hide Bulk Input" : "📂 Bulk Add Photo Links"}
            </button>
          </div>

          {/* Bulk Paste Area */}
          {showBulk && (
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Bulk Photo Link Ingestion (Paste multiple Supabase DB URLs)
              </div>
              <p className="adm-hint" style={{ margin: 0 }}>
                Paste one URL per line or separated by commas. Each valid image link will be added to the gallery.
              </p>
              <textarea
                rows={4}
                placeholder="https://aooydxydkyjtulhduexa.supabase.co/storage/v1/object/public/...&#10;https://..."
                value={bulkImg}
                onChange={(e) => setBulkImg(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: 12,
                  padding: 8,
                  borderRadius: 4,
                  border: "1px solid #d1d5db",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="adm-btn primary sm"
                  onClick={() => {
                    const lines = bulkImg
                      .split(/[\n,;]+/)
                      .map((x) => x.trim())
                      .filter(Boolean);
                    const validUrls: string[] = [];
                    let httpBlocked = 0;
                    for (const l of lines) {
                      const dbReady = normalizeDbImageUrl(l);
                      if (dbReady) {
                        if (!p.images.includes(dbReady) && !validUrls.includes(dbReady)) {
                          validUrls.push(dbReady);
                        }
                        continue;
                      }
                      const fallback = safeImageUrl(l);
                      if (fallback && /^http:\/\//i.test(fallback)) httpBlocked++;
                    }
                    if (validUrls.length === 0) {
                      setImgErr(
                        httpBlocked > 0
                          ? "Photo URLs must start with https:// (not http://) to sync with the live Supabase database."
                          : "No valid new image URLs found to add.",
                      );
                      return;
                    }
                    setImgErr(
                      httpBlocked > 0
                        ? `Added ${validUrls.length} URL(s); skipped ${httpBlocked} http:// link(s) (must use https://).`
                        : "",
                    );
                    up({ images: [...p.images, ...validUrls] });
                    setBulkImg("");
                    setShowBulk(false);
                  }}
                >
                  Add All Photo URLs ({bulkImg.split(/[\n,;]+/).filter((x) => x.trim()).length})
                </button>
                <button
                  type="button"
                  className="adm-btn ghost sm"
                  onClick={() => setBulkImg("")}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {imgErr && <div className="adm-err">{imgErr}</div>}
        </div>
      </Card>
      <Card title="Variants & inventory">
        <div className="adm-row" style={{ marginBottom: 12 }}>
          <Toggle label="Track stock" value={p.trackStock} onChange={(v) => up({ trackStock: v })} />
          <Toggle label="Sell when out of stock" value={p.allowBackorder} onChange={(v) => up({ allowBackorder: v })} />
          <Toggle label="Featured" value={p.featured} onChange={(v) => up({ featured: v })} />
        </div>
        <RowList<Variant> rows={p.variants} onChange={(v) => up({ variants: v })} blank={{ option: "", sku: "", price: p.price, stock: 0 }}
          fields={[{ key: "option", label: "Option / size" }, { key: "sku", label: "SKU" }, { key: "price", label: "Price" }, { key: "stock", label: "Stock", type: "number" }]} />
      </Card>
      <Card title="Collections"><div className="adm-row">
        {s.collections.map((c) => <Toggle key={c.handle} label={c.title} value={p.collections.includes(c.handle)} onChange={() => toggleCol(c.handle)} />)}
      </div></Card>
      <Card title="Search engine listing"><div className="adm-grid">
        <div className="adm-field">
          <span>URL handle</span>
          <div className="adm-row" style={{ gap: 6 }}>
            <input
              value={handleDraft}
              onChange={(e) => setHandleDraft(e.target.value)}
              onBlur={() => void applyHandleRename()}
              style={{ flex: 1, minWidth: 0 }}
            />
            {handleDraft.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") !== p.handle && (
              <button type="button" className="adm-btn ghost sm" onClick={() => void applyHandleRename()}>
                Apply
              </button>
            )}
          </div>
        </div>
        <Text label="SEO title" value={p.seoTitle} onChange={(v) => up({ seoTitle: v })} />
        <Area label="SEO description" value={p.seoDescription} onChange={(v) => up({ seoDescription: v })} />
      </div></Card>
    </>
  );
}
