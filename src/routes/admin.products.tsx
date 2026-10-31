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
          <button className="adm-btn primary" onClick={add}>
            Add product
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Controls */}
      <div className="adm-card" style={{ padding: 14, marginBottom: 16 }}>
        <div className="adm-row" style={{ justifyContent: "space-between" }}>
          <div className="adm-row" style={{ flex: 1, minWidth: 260 }}>
            <input
              placeholder="Search products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 300 }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="all">All statuses ({s.products.length})</option>
              <option value="active">Active only ({s.products.filter((p) => p.status === "active").length})</option>
              <option value="draft">Drafts only ({s.products.filter((p) => p.status === "draft").length})</option>
              <option value="archived">Archived only ({s.products.filter((p) => p.status === "archived").length})</option>
            </select>
            {q && (
              <button className="adm-btn ghost sm" onClick={() => setQ("")}>
                Clear
              </button>
            )}
          </div>
          <div className="adm-row">
            <button className="adm-btn ghost sm" onClick={() => setAll("active")}>
              Set active
            </button>
            <button className="adm-btn ghost sm" onClick={() => setAll("draft")}>
              Set draft
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }} />
              <th>Product</th>
              <th>Status</th>
              <th>Price</th>
              <th>Inventory</th>
              <th>Variants</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
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
                      <img src={p.images[0]} alt="" style={{ borderRadius: 4 }} />
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
                    <Link
                      className="link"
                      to="/admin/products/$handle"
                      params={{ handle: p.handle }}
                      style={{ fontSize: 13.5, fontWeight: 500 }}
                    >
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--p-text-subdued)", marginTop: 2 }}>
                      /{p.handle} {p.badge && <span className="adm-tag" style={{ fontSize: 10, padding: "1px 5px", marginLeft: 4 }}>{p.badge}</span>}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      title="Click to toggle status"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`adm-tag ${p.status === "active" ? "active" : p.status === "draft" ? "draft" : "danger"}`}>
                        {p.status}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>৳{p.price}</span>
                  </td>
                  <td>
                    {isLow ? (
                      <span className="adm-tag danger">
                        {totalStock} in stock
                      </span>
                    ) : (
                      <span style={{ color: "var(--p-text)" }}>
                        {totalStock} in stock
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: "var(--p-text-subdued)", fontSize: 12.5 }}>{p.variants.map((v) => v.option).join(", ")}</span>
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
