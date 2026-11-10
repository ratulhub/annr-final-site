import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setState, publish, useAdmin, type Product, type Variant } from "../admin/store";
import { Area, BackBtn, Card, RowList, Select, Text, Toggle } from "../admin/ui";
import { storeFile } from "../admin/services/media";
import { safeImageUrl } from "../admin/security/sanitize";

export const Route = createFileRoute("/admin/products_/$handle")({ component: Edit });

interface SizeGuideRow {
  size: string;
  col1: string;
  col2: string;
  col3: string;
}

interface StructuredSizeGuide {
  fitType: string;
  headers: [string, string, string, string];
  rows: SizeGuideRow[];
  notes: string;
}

const SIZE_GUIDE_PRESETS: Record<string, StructuredSizeGuide> = {
  tee: {
    fitType: "oversized fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "57", col2: "70", col3: "21" },
      { size: "M", col1: "60", col2: "72", col3: "22" },
      { size: "L", col1: "63", col2: "75", col3: "23" },
      { size: "XL", col1: "66", col2: "77", col3: "24" },
      { size: "XXL", col1: "69", col2: "79", col3: "25" },
    ],
    notes: "Heavyweight 280 GSM combed cotton. Drop-shoulder oversized streetwear silhouette.",
  },
  hoodie: {
    fitType: "oversized fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "62", col2: "68", col3: "59" },
      { size: "M", col1: "65", col2: "71", col3: "61" },
      { size: "L", col1: "68", col2: "74", col3: "62" },
      { size: "XL", col1: "71", col2: "76", col3: "63" },
      { size: "XXL", col1: "74", col2: "79", col3: "64" },
    ],
    notes: "480 GSM heavyweight French terry fleece. Boxy drop-shoulder fit.",
  },
  longsleeve: {
    fitType: "relaxed fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "58", col2: "69", col3: "60" },
      { size: "M", col1: "61", col2: "72", col3: "62" },
      { size: "L", col1: "64", col2: "74", col3: "63" },
      { size: "XL", col1: "67", col2: "77", col3: "65" },
      { size: "XXL", col1: "70", col2: "79", col3: "66" },
    ],
    notes: "Relaxed silhouette with ribbed cuffs.",
  },
  jacket: {
    fitType: "boxy fit",
    headers: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    rows: [
      { size: "S", col1: "63", col2: "66", col3: "61" },
      { size: "M", col1: "66", col2: "68", col3: "62" },
      { size: "L", col1: "69", col2: "71", col3: "64" },
      { size: "XL", col1: "72", col2: "73", col3: "65" },
      { size: "XXL", col1: "75", col2: "75", col3: "67" },
    ],
    notes: "Cropped boxy outerwear cut. Size up for extra layering room.",
  },
  pants: {
    fitType: "relaxed fit",
    headers: ["SIZE", "WAIST", "LENGTH", "INSEAM"],
    rows: [
      { size: "S (30)", col1: "76", col2: "104", col3: "74" },
      { size: "M (32)", col1: "81", col2: "106", col3: "75" },
      { size: "L (34)", col1: "86", col2: "108", col3: "77" },
      { size: "XL (36)", col1: "91", col2: "110", col3: "78" },
      { size: "XXL (38)", col1: "96", col2: "112", col3: "79" },
    ],
    notes: "Wide-leg architectural cut. Waist measured flat × 2.",
  },
  shorts: {
    fitType: "relaxed fit",
    headers: ["SIZE", "WAIST", "LENGTH", "OPENING"],
    rows: [
      { size: "S", col1: "74", col2: "48", col3: "31" },
      { size: "M", col1: "79", col2: "50", col3: "32" },
      { size: "L", col1: "84", col2: "52", col3: "34" },
      { size: "XL", col1: "89", col2: "54", col3: "35" },
      { size: "XXL", col1: "94", col2: "56", col3: "36" },
    ],
    notes: "Elasticated drawstring waist with relaxed knee-length cut.",
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
  const [imgErr, setImgErr] = useState("");
  const [publishedToast, setPublishedToast] = useState(false);

  if (!p) return <p>Product not found. <Link className="link" to="/admin/products">Back</Link></p>;

  const up = (patch: Partial<Product>) => {
    setState((x) => ({
      ...x,
      products: x.products.map((y) => (y.handle === handle ? { ...y, ...patch } : y)),
    }));
    // Auto-publish product changes so storefront reflects updates immediately
    setTimeout(() => {
      try {
        publish();
      } catch {}
    }, 30);
  };

  const toggleCol = (h: string) =>
    up({ collections: p.collections.includes(h) ? p.collections.filter((c) => c !== h) : [...p.collections, h] });

  const sg = parseSizeChart(p.sizeChart, p.handle, p.title);
  const saveSg = (next: StructuredSizeGuide) => {
    up({ sizeChart: JSON.stringify(next) });
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn to="/admin/products" label="← Products" />
          <h1>{p.title}</h1>
        </div>
        <div className="adm-row">
          <span className="adm-saved">{publishedToast ? "✓ Published Live" : "Auto-saved & Synced"}</span>
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => {
              publish();
              setPublishedToast(true);
              setTimeout(() => setPublishedToast(false), 2500);
            }}
          >
            Publish to Storefront
          </button>
          <a className="adm-btn ghost" href={`/products/${p.handle}/index.html`} target="_blank" rel="noreferrer">View</a>
          <button className="adm-btn ghost" onClick={() => { const h = p.handle + "-copy"; setState((x) => ({ ...x, products: [{ ...p, handle: h, title: p.title + " (copy)", status: "draft" }, ...x.products] })); nav({ to: "/admin/products/$handle", params: { handle: h } }); }}>Duplicate</button>
          <button className="adm-btn danger" onClick={() => { if (confirm("Delete this product?")) { setState((x) => ({ ...x, products: x.products.filter((y) => y.handle !== handle) })); nav({ to: "/admin/products" }); } }}>Delete</button>
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
                <option value="unique-campaign">Unique Campaign (1-of-1 Drop)</option>
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

          <div className="adm-grid">
            <Text label="Exact Single Size (e.g. S, M, L, XL, Free Size)" value={p.size || "M"} onChange={(v) => up({ size: v.toUpperCase() })} />
            <Text label="Fabric Details (e.g. 480 GSM Heavy French Terry)" value={p.fabric || ""} onChange={(v) => up({ fabric: v })} />
            <Text label="Garment Condition (e.g. 10/10 Deadstock Archival)" value={p.condition || ""} onChange={(v) => up({ condition: v })} />
            <Text label="Care Instructions (e.g. Cold Hand Wash Only)" value={p.careInstructions || ""} onChange={(v) => up({ careInstructions: v })} />
          </div>

          <div style={{ background: "#f9fafb", border: "1px solid var(--p-border-subdued)", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              Garment Exact Flat Measurements (in Centimeters)
            </div>
            <p className="adm-hint" style={{ margin: "0 0 12px" }}>
              Measurements entered here are displayed on the storefront's luxury one-of-one specification table.
            </p>
            <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              <label className="adm-field">
                <span>Chest (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={p.measurements?.chest ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, chest: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Length (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  value={p.measurements?.length ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, length: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Shoulder (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={p.measurements?.shoulder ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, shoulder: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Sleeve (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 62"
                  value={p.measurements?.sleeve ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, sleeve: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Waist (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 82"
                  value={p.measurements?.waist ?? ""}
                  onChange={(e) => up({ measurements: { ...p.measurements, waist: e.target.value ? Number(e.target.value) : null } })}
                />
              </label>
              <label className="adm-field">
                <span>Inseam (cm)</span>
                <input
                  type="number"
                  placeholder="e.g. 76"
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
        <Select label="Status" value={p.status} options={["active", "reserved", "sold", "draft", "archived"]} onChange={(v) => up({ status: v as Product["status"] })} />
        <Text label="Vendor" value={p.vendor} onChange={(v) => up({ vendor: v })} />
        <Text label="Product type" value={p.type} onChange={(v) => up({ type: v })} />
        <Text label="Tags (comma separated)" value={p.tags} onChange={(v) => up({ tags: v })} />
        <Text label="Badge (e.g. NEW, SOLD OUT)" value={p.badge} onChange={(v) => up({ badge: v })} />
        <Area label="Description" value={p.description} onChange={(v) => up({ description: v })} />
      </div></Card>

      <Card
        title="Size Guide & Fit Table (Interactive Storefront Popup)"
        subtitle="Customize the Size Guide modal (#sizes-popup) for this product. Enter measurements in CM — INCHES are calculated automatically on the storefront."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1-Click Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--p-text-subdued)" }}>Load Garment Preset:</span>
            {[
              { key: "tee", label: "T-Shirt / Tee" },
              { key: "hoodie", label: "Hoodie / Zip" },
              { key: "longsleeve", label: "Longsleeve / Knit" },
              { key: "jacket", label: "Jacket / Outerwear" },
              { key: "pants", label: "Jeans / Pants" },
              { key: "shorts", label: "Shorts" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="adm-btn ghost sm"
                onClick={() => {
                  const preset = SIZE_GUIDE_PRESETS[item.key];
                  if (preset) saveSg({ ...preset, rows: preset.rows.map((r) => ({ ...r })) });
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

          {/* Measurement Table Editor (CM + Live IN preview) */}
          <div style={{ overflowX: "auto", border: "1px solid var(--p-border-subdued)", borderRadius: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid var(--p-border-subdued)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[0]}</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[1]} (CM)</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[2]} (CM)</th>
                  <th style={{ padding: "8px 10px" }}>{sg.headers[3]} (CM)</th>
                  <th style={{ padding: "8px 10px", color: "var(--p-text-subdued)", fontSize: 11 }}>Auto Inches Preview</th>
                  <th style={{ padding: "8px 10px", width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {sg.rows.map((row, idx) => {
                  const toIn = (v: string) => {
                    const n = parseFloat(v);
                    return Number.isFinite(n) ? (n / 2.54).toFixed(1) + '"' : "-";
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
                        {toIn(row.col1)} / {toIn(row.col2)} / {toIn(row.col3)}
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
                  rows: [...sg.rows, { size: "3XL", col1: "72", col2: "81", col3: "26" }],
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
      <Card title="Images">
        <div className="adm-thumbs">{p.images.map((src, i) => (
          <div key={src + i}><img src={src} alt="" /><button onClick={() => up({ images: p.images.filter((_, j) => j !== i) })}>✕</button>
            {i > 0 && <button style={{ left: 2, right: "auto" }} onClick={() => { const a = [...p.images]; const tmp = a[i - 1]!; a[i - 1] = a[i]!; a[i] = tmp; up({ images: a }); }}>←</button>}
          </div>))}
        </div>
        <div className="adm-row" style={{ marginTop: 12 }}>
          <input placeholder="Image URL" value={img} onChange={(e) => { setImg(e.target.value); setImgErr(""); }} style={{ maxWidth: 400 }} />
          <button className="adm-btn ghost" onClick={() => {
            const clean = safeImageUrl(img);
            if (!clean) { setImgErr("Enter a valid / or https:// image URL (SVG is not allowed)."); return; }
            setImgErr(""); up({ images: [...p.images, clean] }); setImg("");
          }}>Add URL</button>
          <label className="adm-btn ghost">Upload<input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setImgErr("");
            try { const url = await storeFile(f); up({ images: [...p.images, url] }); }
            catch (err) { setImgErr((err as Error).message); }
          }} /></label>
        </div>
        {imgErr && <div className="adm-err" style={{ marginTop: 8 }}>{imgErr}</div>}
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
        <Text label="URL handle" value={p.handle} onChange={(v) => { up({ handle: v }); nav({ to: "/admin/products/$handle", params: { handle: v }, replace: true }); }} />
        <Text label="SEO title" value={p.seoTitle} onChange={(v) => up({ seoTitle: v })} />
        <Area label="SEO description" value={p.seoDescription} onChange={(v) => up({ seoDescription: v })} />
      </div></Card>
    </>
  );
}
