import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProductFromSupabase,
  LEGACY_PRODUCT_HANDLES,
  publish,
  setState,
  syncProductToSupabase,
  uid,
  useAdmin,
  wipeAllDemoData,
  type Product,
} from "../admin/store";
import { BackBtn } from "../admin/ui";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin/products")({ component: Products });

const PAGE_SIZE = 25;
const CATEGORY_SLUGS = new Set([
  "hoodies",
  "sweatshirts",
  "trousers",
  "sweaters",
  "t-shirts",
  "jackets",
  "knitwear",
  "accessories",
]);

const parsePriceNum = (v?: string | number | null) =>
  parseFloat(String(v ?? "0").replace(/[^0-9.-]/g, "")) || 0;

function Products() {
  const s = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const syncFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      let { data, error } = await supabase
        .from("products")
        .select("*, categories(id,slug,name), campaigns(id,slug,name)")
        .order("created_at", { ascending: false });

      if (error && /relationship|schema cache|categories|campaigns/i.test(error.message)) {
        const retry = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        data = retry.data as typeof data;
        error = retry.error;
      }

      if (error) {
        console.warn("Could not sync products from Supabase:", error);
        setSyncMsg("Sync notice: " + error.message);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const remoteRows = data.filter((sp: any) => sp && sp.handle && !LEGACY_PRODUCT_HANDLES.has(sp.handle));
        setState((current) => {
          const map = new Map<string, Product>();
          for (const lp of current.products) {
            if (!LEGACY_PRODUCT_HANDLES.has(lp.handle)) {
              map.set(lp.handle, lp);
            }
          }
          for (const sp of remoteRows as any[]) {
            const existing = map.get(sp.handle);
            const spTags: string[] = Array.isArray(sp.tags) ? sp.tags.map((t: unknown) => String(t)) : [];
            const catTag = spTags.find((t) => t.startsWith("cat:"))?.slice(4);
            const campTag = spTags.find((t) => t.startsWith("camp:"))?.slice(5);
            const hideSizeTag = spTags.includes("__hide_size");
            const cleanDisplayTags = spTags
              .filter((t) => t && !t.startsWith("cat:") && !t.startsWith("camp:") && t !== "__hide_size" && !t.startsWith("__unit:"))
              .join(", ");

            const typeLower = String(sp.product_type || "").toLowerCase();
            const resolvedCategory =
              sp.categories?.slug ||
              catTag ||
              (CATEGORY_SLUGS.has(typeLower) ? typeLower : existing?.category || "hoodies");
            const resolvedCampaign =
              sp.campaigns?.slug ||
              campTag ||
              (sp.campaign_id ? "unique-campaign" : existing?.campaign || "unique-campaign");
            const resolvedShowSize =
              typeof sp.show_size === "boolean"
                ? sp.show_size
                : hideSizeTag
                  ? false
                  : (existing?.showSize ?? true);
            const resolvedCols = Array.from(
              new Set([
                ...(existing?.collections || []),
                ...(resolvedCampaign === "unique-campaign" ? ["unique-campaign"] : []),
                resolvedCategory,
                "all",
              ].filter(Boolean)),
            );

            const merged: Product = {
              id: sp.id || existing?.id,
              handle: sp.handle,
              code: sp.code || existing?.code || "ANNR-U001",
              title: sp.title || existing?.title || "1-of-1 Piece",
              description: sp.description || existing?.description || "",
              price: sp.price != null ? String(sp.price) : existing?.price || "0.00",
              compareAt: sp.compare_at_price != null ? String(sp.compare_at_price) : existing?.compareAt || "",
              currency: sp.currency || existing?.currency || "BDT",
              status: sp.status || existing?.status || "active",
              vendor: sp.vendor || existing?.vendor || "AnnR",
              type: sp.product_type || existing?.type || resolvedCategory,
              category: resolvedCategory,
              campaign: resolvedCampaign,
              tags: cleanDisplayTags || existing?.tags || "1-of-1, archival",
              images: Array.isArray(sp.images) && sp.images.length > 0 ? sp.images : existing?.images || [],
              variants: existing?.variants || [
                {
                  id: uid(),
                  option: sp.size || "L",
                  sku: sp.code || "ANNR-U",
                  price: String(sp.price || "0.00"),
                  stock: sp.status === "sold" ? 0 : (sp.stock ?? 1),
                },
              ],
              collections: resolvedCols,
              seoTitle: sp.seo_title || existing?.seoTitle || "",
              seoDescription: sp.seo_description || existing?.seoDescription || "",
              weight: existing?.weight || "0.6",
              badge: existing?.badge || "1 OF 1",
              featured: existing?.featured || false,
              trackStock: true,
              allowBackorder: false,
              sizeChart: existing?.sizeChart || "",
              isOneOfOne: true,
              size: sp.size || existing?.size || "L",
              showSize: resolvedShowSize,
              measurementUnit: "in",
              measurements: sp.measurements || existing?.measurements || { chest: 24, length: 28.5, shoulder: 20, sleeve: 24.5 },
              fabric: sp.fabric || existing?.fabric || "480 GSM French Terry",
              condition: sp.condition || existing?.condition || "10/10 Deadstock Archival",
              careInstructions: sp.care_instructions || existing?.careInstructions || "Cold Hand Wash Only",
              stock: sp.status === "sold" ? 0 : (sp.stock ?? 1),
            };
            map.set(sp.handle, merged);
          }
          return { ...current, products: Array.from(map.values()) };
        });
        setSyncMsg(`✓ Synced ${remoteRows.length} products from Supabase`);
        setTimeout(() => setSyncMsg(""), 3000);
        try { publish(); } catch {}
      } else {
        setSyncMsg("✓ Connected to Supabase (0 products in remote DB)");
        setTimeout(() => setSyncMsg(""), 3000);
      }
    } catch (err) {
      console.warn("Supabase products sync error:", err);
      setSyncMsg("Sync error");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void syncFromSupabase();
  }, [syncFromSupabase]);

  const categories = s.categories || [
    { slug: "hoodies", name: "Hoodies" },
    { slug: "sweatshirts", name: "Sweatshirts" },
    { slug: "trousers", name: "Trousers" },
    { slug: "sweaters", name: "Sweaters" },
    { slug: "t-shirts", name: "T-Shirts" },
    { slug: "jackets", name: "Jackets" },
    { slug: "knitwear", name: "Knitwear" },
    { slug: "accessories", name: "Accessories" },
  ];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return s.products.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && p.category !== category) return false;
      if (campaign !== "all" && p.campaign !== campaign) return false;
      if (!query) return true;
      const haystack = `${p.title} ${p.code || ""} ${p.handle} ${p.size || ""} ${p.category || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [s.products, q, status, category, campaign]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const add = async () => {
    const handle = "annr-unique-" + uid();
    const code = "ANNR-U" + Math.floor(100 + Math.random() * 900);
    const p: Product = {
      handle,
      code,
      title: "New One-of-One Garment",
      description: "Archival piece. Exactly one piece crafted.",
      price: "0.00",
      compareAt: "",
      currency: "BDT",
      status: "active",
      vendor: "AnnR",
      type: "Hoodie",
      category: "hoodies",
      campaign: "unique-campaign",
      tags: "1-of-1, archival, unique",
      images: [],
      variants: [{ id: uid(), option: "L", sku: code, price: "0.00", stock: 1 }],
      collections: ["unique-campaign", "hoodies", "all"],
      seoTitle: "",
      seoDescription: "",
      weight: "0.6",
      badge: "1 OF 1",
      featured: false,
      trackStock: true,
      allowBackorder: false,
      sizeChart: "",
      isOneOfOne: true,
      size: "L",
      showSize: true,
      measurementUnit: "in",
      measurements: { chest: 24, length: 28.5, shoulder: 20, sleeve: 24.5 },
      fabric: "480 GSM French Terry",
      condition: "10/10 Deadstock Archival",
      careInstructions: "Cold Hand Wash Only",
      stock: 1,
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
    setTimeout(() => { try { publish(); } catch {} }, 30);
    const syncRes = await syncProductToSupabase(p);
    if (!syncRes.ok && syncRes.error) {
      try {
        sessionStorage.setItem("annr_last_product_sync_err", `${handle}:${syncRes.error}`);
      } catch {}
    }
    nav({ to: "/admin/products/$handle", params: { handle } });
  };

  const duplicate = (orig: Product) => {
    const handle = `${orig.handle}-piece-${uid()}`;
    const code = "ANNR-U" + Math.floor(100 + Math.random() * 900);
    const { id: _dropId, ...restOrig } = orig;
    const p: Product = {
      ...restOrig,
      handle,
      code,
      title: `${orig.title} (New 1-of-1 Piece)`,
      status: "draft",
      stock: 1,
      variants: orig.variants.map((v) => ({ ...v, id: uid(), sku: code, stock: 1 })),
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
    setTimeout(() => { try { publish(); } catch {} }, 30);
    void syncProductToSupabase(p).then((r) => {
      if (!r.ok && r.error) setSyncMsg(`Error: ${r.error}`);
    });
  };

  const toggleStatus = (p: Product) => {
    const nextStatus = p.status === "active" ? "draft" : p.status === "draft" ? "active" : p.status;
    const updated: Product = { ...p, status: nextStatus, stock: nextStatus === "sold" ? 0 : (p.stock ?? 1) };
    setState((x) => ({
      ...x,
      products: x.products.map((item) => (item.handle === p.handle ? updated : item)),
    }));
    setTimeout(() => { try { publish(); } catch {} }, 30);
    void syncProductToSupabase(updated).then((r) => {
      if (!r.ok && r.error) setSyncMsg(`Error: ${r.error}`);
    });
  };

  const setAllStatus = (st: Product["status"]) => {
    const handles = new Set(filtered.map((f) => f.handle));
    const updatedList: Product[] = [];
    setState((x) => ({
      ...x,
      products: x.products.map((p) => {
        if (!handles.has(p.handle)) return p;
        const u: Product = { ...p, status: st, stock: st === "sold" ? 0 : 1 };
        updatedList.push(u);
        return u;
      }),
    }));
    setTimeout(() => { try { publish(); } catch {} }, 30);
    void Promise.all(updatedList.map((u) => syncProductToSupabase(u))).then((results) => {
      const failed = results.find((r) => !r.ok);
      if (failed?.error) setSyncMsg(`Error: ${failed.error}`);
    });
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Products ({s.products.length})
              <span className="adm-tag" style={{ background: "#111", color: "#fff", fontSize: 10 }}>1-OF-1 SYSTEM</span>
            </h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              {s.products.filter((p) => p.status === "active").length} available ·{" "}
              {s.products.filter((p) => p.status === "sold").length} sold / archive ·{" "}
              {s.products.filter((p) => p.status === "reserved").length} reserved ·{" "}
              {s.products.filter((p) => p.status === "draft").length} drafts
            </p>
          </div>
        </div>
        <div className="adm-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {syncMsg && (
            <span
              style={{
                fontSize: 12,
                color: /error|⚠/i.test(syncMsg) ? "#dc2626" : "#16a34a",
                fontWeight: 600,
              }}
            >
              {syncMsg}
            </span>
          )}
          <button
            type="button"
            className="adm-btn ghost"
            onClick={() => {
              if (window.confirm("Are you sure you want to wipe all demo products and orders? This leaves 1 clean template product so you can add your real products.")) {
                wipeAllDemoData();
              }
            }}
            title="Clean out all demo items and keep 1 clean template product"
            style={{ color: "#d97706" }}
          >
            🧹 Wipe Demo (Keep 1 Template)
          </button>
          <button
            type="button"
            className="adm-btn ghost"
            disabled={syncing}
            onClick={() => void syncFromSupabase()}
            title="Fetch latest products directly from Supabase database"
          >
            {syncing ? "Syncing..." : "⚡ Sync from Database"}
          </button>
          <button
            type="button"
            className="adm-btn ghost"
            disabled={syncing}
            onClick={async () => {
              if (!isSupabaseConfigured()) {
                alert("Supabase is not configured yet.");
                return;
              }
              setSyncing(true);
              setSyncMsg("Pushing products to Supabase...");
              try {
                let successCount = 0;
                let skippedImgs = 0;
                let lastError = "";
                for (const prod of s.products) {
                  const res = await syncProductToSupabase(prod);
                  if (res.ok) successCount++;
                  else if (res.error) lastError = res.error;
                  if (res.skippedLocalImages) skippedImgs += res.skippedLocalImages;
                }
                if (lastError) {
                  setSyncMsg(`Error: Pushed ${successCount}/${s.products.length} (${lastError})`);
                } else if (skippedImgs > 0) {
                  setSyncMsg(`⚠ Pushed ${successCount}/${s.products.length}; ${skippedImgs} local file upload(s) require https:// URL or Storage`);
                } else {
                  setSyncMsg(`✓ Pushed ${successCount}/${s.products.length} products to database`);
                }
                setTimeout(() => setSyncMsg(""), 5000);
              } catch (e: any) {
                setSyncMsg("Error: " + (e?.message || "failed"));
              } finally {
                setSyncing(false);
              }
            }}
            title="Push all products from admin into Supabase"
          >
            ⬆ Push to Database
          </button>
          <button className="adm-btn primary" onClick={add}>
            + Add 1-of-1 Product
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Controls */}
      <div className="adm-card" style={{ padding: 14, marginBottom: 16 }}>
        <div className="adm-row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="adm-row" style={{ flex: "1 1 500px", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Search by Code (e.g. ANNR-U001), Title, Size..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ flex: "1 1 180px", minWidth: 0 }}
            />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{ flex: "0 1 140px", minWidth: 120 }}
            >
              <option value="all">All statuses ({s.products.length})</option>
              <option value="active">Active (Available)</option>
              <option value="reserved">Reserved (In Checkout)</option>
              <option value="sold">Sold / Archived</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              style={{ flex: "0 1 140px", minWidth: 120 }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select
              value={campaign}
              onChange={(e) => { setCampaign(e.target.value); setPage(1); }}
              style={{ flex: "0 1 150px", minWidth: 130 }}
            >
              <option value="all">All campaigns</option>
              {(s.campaigns && s.campaigns.length
                ? s.campaigns
                : [{ slug: "unique-campaign", name: "Unique Campaign" }]
              ).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            {q && (
              <button className="adm-btn ghost sm" onClick={() => { setQ(""); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
          <div className="adm-row" style={{ gap: 6 }}>
            <button className="adm-btn ghost sm" onClick={() => setAllStatus("active")}>
              Mark Active
            </button>
            <button className="adm-btn ghost sm" onClick={() => setAllStatus("draft")}>
              Mark Draft
            </button>
            <button className="adm-btn ghost sm" onClick={() => setAllStatus("sold")}>
              Mark Sold
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="adm-table-scroll-hint">↔ Swipe horizontally to view full table</div>
      <div className="adm-card adm-table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }} />
              <th>Piece Code / Title</th>
              <th>Category & Campaign</th>
              <th>Size & Fit</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--p-text-subdued)" }}>
                  No products found matching filters. Click "+ Add 1-of-1 Product" to add your first piece.
                </td>
              </tr>
            ) : (
              pagedList.map((p) => {
                const isSold = p.status === "sold";
                const isReserved = p.status === "reserved";
                return (
                  <tr key={p.handle} style={{ opacity: isSold ? 0.75 : 1 }}>
                    <td>
                      {p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/_ext/annr-template-001.png";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            background: "var(--p-background)",
                            borderRadius: 4,
                            border: "1px solid var(--p-border-subdued)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 10,
                            color: "var(--p-text-subdued)",
                          }}
                        >
                          No img
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#e05a2b", fontSize: 11 }}>
                          {p.code || "ANNR-U"}
                        </span>
                        <Link
                          className="link"
                          to="/admin/products/$handle"
                          params={{ handle: p.handle }}
                          style={{ fontSize: 13.5, fontWeight: 600 }}
                        >
                          {p.title}
                        </Link>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--p-text-subdued)", marginTop: 2 }}>
                        /{p.handle}
                      </div>
                    </td>
                    <td>
                      <span className="adm-tag" style={{ textTransform: "uppercase", fontSize: 10 }}>
                        {p.category || "General"}
                      </span>
                      {p.campaign === "unique-campaign" && (
                        <span className="adm-tag" style={{ background: "#111", color: "#fff", fontSize: 9, marginLeft: 4 }}>
                          UNIQUE
                        </span>
                      )}
                    </td>
                    <td>
                      {p.showSize === false ? (
                        <span className="adm-tag draft" style={{ fontSize: 10 }}>Size hidden (″ only)</span>
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: 12 }}>SIZE {p.size || "L"}</span>
                      )}
                      {p.condition && (
                        <div style={{ fontSize: 10, color: "var(--p-text-subdued)", marginTop: 2 }}>{p.condition}</div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleStatus(p)}
                        title="Click to toggle status"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <span
                          className={`adm-tag ${
                            p.status === "active"
                              ? "active"
                              : isReserved
                              ? "warning"
                              : isSold
                              ? "danger"
                              : "draft"
                          }`}
                        >
                          {p.status}
                        </span>
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>৳{parsePriceNum(p.price).toLocaleString()}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: isSold ? "var(--p-text-subdued)" : "#10b981" }}>
                        {isSold ? "0 (Sold)" : "1 (1-of-1)"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 16 }}>
                      <div className="adm-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <Link className="adm-btn ghost sm" to="/admin/products/$handle" params={{ handle: p.handle }}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="adm-btn ghost sm"
                          onClick={() => duplicate(p)}
                          title="Duplicate this piece into a new 1-of-1"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="adm-btn danger sm"
                          onClick={() => {
                            if (confirm(`Delete product "${p.title}"?`)) {
                              setState((x) => ({ ...x, products: x.products.filter((y) => y.handle !== p.handle) }));
                              setTimeout(() => { try { publish(); } catch {} }, 30);
                              void deleteProductFromSupabase(p.handle).then((r) => {
                                if (!r.ok && r.error) setSyncMsg(`Error deleting in DB: ${r.error}`);
                              });
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 4px" }}>
          <div style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} products
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="adm-btn ghost sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 12 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="adm-btn ghost sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
