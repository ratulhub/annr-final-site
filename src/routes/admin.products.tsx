import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { setState, uid, useAdmin, type Product } from "../admin/store";
import { BackBtn } from "../admin/ui";

export const Route = createFileRoute("/admin/products")({ component: Products });

const PAGE_SIZE = 25;

function Products() {
  const s = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [page, setPage] = useState(1);

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

  const add = () => {
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
      status: "draft",
      vendor: "AnnR",
      type: "Hoodie",
      category: "hoodies",
      campaign: "unique-campaign",
      tags: "1-of-1, archival, unique",
      images: [],
      variants: [{ id: uid(), option: "M", sku: code, price: "0.00", stock: 1 }],
      collections: ["unique-campaign", "hoodies"],
      seoTitle: "",
      seoDescription: "",
      weight: "0.6",
      badge: "1 OF 1",
      featured: false,
      trackStock: true,
      allowBackorder: false,
      sizeChart: "",
      isOneOfOne: true,
      size: "M",
      measurements: { chest: 60, length: 72, shoulder: 50, sleeve: 62 },
      fabric: "480 GSM French Terry",
      condition: "10/10 Deadstock Archival",
      stock: 1,
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
    nav({ to: "/admin/products/$handle", params: { handle } });
  };

  const duplicate = (orig: Product) => {
    const handle = `${orig.handle}-piece-${uid()}`;
    const code = "ANNR-U" + Math.floor(100 + Math.random() * 900);
    const p: Product = {
      ...orig,
      handle,
      code,
      title: `${orig.title} (New 1-of-1 Piece)`,
      status: "draft",
      stock: 1,
      variants: orig.variants.map((v) => ({ ...v, id: uid(), sku: code, stock: 1 })),
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
  };

  const toggleStatus = (p: Product) => {
    const nextStatus = p.status === "active" ? "draft" : p.status === "draft" ? "active" : p.status;
    setState((x) => ({
      ...x,
      products: x.products.map((item) => (item.handle === p.handle ? { ...item, status: nextStatus } : item)),
    }));
  };

  const setAllStatus = (st: Product["status"]) =>
    setState((x) => ({
      ...x,
      products: x.products.map((p) => (filtered.includes(p) ? { ...p, status: st } : p)),
    }));

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
        <div className="adm-row">
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
              style={{ flex: "1 1 180px", minWidth: 160 }}
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
              <option value="unique-campaign">Unique Campaign</option>
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
                        <img src={p.images[0]} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4 }} />
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
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{p.size || "M"}</span>
                      {p.condition && (
                        <div style={{ fontSize: 10, color: "var(--p-text-subdued)" }}>{p.condition}</div>
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
                      <span style={{ fontWeight: 600 }}>৳{Number(p.price || 0).toLocaleString()}</span>
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
