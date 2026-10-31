import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Product } from "../admin/store";
import { BackBtn } from "../admin/ui";

export const Route = createFileRoute("/admin/products")({ component: Products });

function Products() {
  const s = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const list = s.products.filter(
    (p) => (status === "all" || p.status === status) && p.title.toLowerCase().includes(q.toLowerCase()),
  );

  const add = () => {
    const handle = "new-product-" + uid();
    const p: Product = {
      handle,
      title: "New product",
      description: "",
      price: "0.00",
      compareAt: "",
      currency: "BDT",
      status: "draft",
      vendor: "AnnR",
      type: "",
      tags: "",
      images: [],
      variants: [{ id: uid(), option: "M", sku: "", price: "0.00", stock: 10 }],
      collections: [],
      seoTitle: "",
      seoDescription: "",
      weight: "",
      badge: "",
      featured: false,
      trackStock: true,
      allowBackorder: false,
      sizeChart: "",
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
    nav({ to: "/admin/products/$handle", params: { handle } });
  };

  const duplicate = (orig: Product) => {
    const handle = `${orig.handle}-copy-${uid()}`;
    const p: Product = {
      ...orig,
      handle,
      title: `${orig.title} (Copy)`,
      status: "draft",
      variants: orig.variants.map((v) => ({ ...v, id: uid(), sku: `${v.sku}-COPY` })),
    };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
  };

  const toggleStatus = (p: Product) => {
    const nextStatus = p.status === "active" ? "draft" : "active";
    setState((x) => ({
      ...x,
      products: x.products.map((item) => (item.handle === p.handle ? { ...item, status: nextStatus } : item)),
    }));
  };

  const setAll = (st: Product["status"]) =>
    setState((x) => ({
      ...x,
      products: x.products.map((p) => (list.includes(p) ? { ...p, status: st } : p)),
    }));

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Products ({s.products.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              {s.products.filter((p) => p.status === "active").length} active · {s.products.filter((p) => p.status === "draft").length} drafts
            </p>
          </div>
        </div>
        <div className="adm-row">
          <button className="adm-btn" onClick={add} style={{ background: "var(--red)", borderColor: "var(--red)" }}>
            ➕ Add Product
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Controls */}
      <div className="adm-card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="adm-row" style={{ justifyContent: "space-between" }}>
          <div className="adm-row" style={{ flex: 1, minWidth: 260 }}>
            <input
              placeholder="🔍 Search product title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="all">All Statuses ({s.products.length})</option>
              <option value="active">Active Only ({s.products.filter((p) => p.status === "active").length})</option>
              <option value="draft">Drafts Only ({s.products.filter((p) => p.status === "draft").length})</option>
              <option value="archived">Archived Only ({s.products.filter((p) => p.status === "archived").length})</option>
            </select>
            {q && (
              <button className="adm-btn ghost sm" onClick={() => setQ("")}>
                Clear Filter
              </button>
            )}
          </div>
          <div className="adm-row">
            <button className="adm-btn ghost sm" onClick={() => setAll("active")}>
              ✓ Set Shown Active
            </button>
            <button className="adm-btn ghost sm" onClick={() => setAll("draft")}>
              ⏸️ Set Shown Draft
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }} />
              <th>Product Details</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock Level</th>
              <th>Sizes / Variants</th>
              <th style={{ textAlign: "right", paddingRight: 18 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const totalStock = p.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0);
              const isLow = totalStock <= 2;
              return (
                <tr key={p.handle}>
                  <td>
                    {p.images[0] ? (
                      <img src={p.images[0]} alt="" style={{ borderRadius: 6 }} />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          background: "var(--soft)",
                          borderRadius: 6,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 18,
                        }}
                      >
                        👕
                      </div>
                    )}
                  </td>
                  <td>
                    <Link
                      className="link"
                      to="/admin/products/$handle"
                      params={{ handle: p.handle }}
                      style={{ fontSize: 14, fontWeight: 700 }}
                    >
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      /{p.handle} {p.badge && <span className="adm-tag purple" style={{ fontSize: 9, padding: "2px 6px", marginLeft: 6 }}>{p.badge}</span>}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      title="Click to toggle Active / Draft"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`adm-tag ${p.status === "active" ? "active" : p.status === "draft" ? "draft" : "danger"}`}>
                        {p.status}
                      </span>
                    </button>
                  </td>
                  <td>
                    <b style={{ color: "var(--ink)", fontSize: 14 }}>৳{p.price}</b>
                  </td>
                  <td>
                    {isLow ? (
                      <span className="adm-tag danger" style={{ fontWeight: 800 }}>
                        ⚠️ {totalStock} LOW
                      </span>
                    ) : (
                      <span className="adm-tag active" style={{ fontWeight: 700 }}>
                        {totalStock} in stock
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{p.variants.map((v) => v.option).join(", ")}</span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 18 }}>
                    <div className="adm-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <Link className="adm-btn ghost sm" to="/admin/products/$handle" params={{ handle: p.handle }}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="adm-btn ghost sm"
                        onClick={() => duplicate(p)}
                        title="Duplicate this product"
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
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
