import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Product } from "../admin/store";

export const Route = createFileRoute("/admin/products")({ component: Products });

function Products() {
  const s = useAdmin();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const list = s.products.filter((p) => (status === "all" || p.status === status) && p.title.toLowerCase().includes(q.toLowerCase()));
  const add = () => {
    const handle = "new-product-" + uid();
    const p: Product = { handle, title: "New product", description: "", price: "0.00", compareAt: "", currency: "BDT", status: "draft", vendor: "AnnR", type: "", tags: "", images: [], variants: [{ id: uid(), option: "M", sku: "", price: "0.00", stock: 0 }], collections: [], seoTitle: "", seoDescription: "", weight: "", badge: "", featured: false, trackStock: true, allowBackorder: false, sizeChart: "" };
    setState((x) => ({ ...x, products: [p, ...x.products] }));
    nav({ to: "/admin/products/$handle", params: { handle } });
  };
  const setAll = (st: Product["status"]) => setState((x) => ({ ...x, products: x.products.map((p) => (list.includes(p) ? { ...p, status: st } : p)) }));
  return (
    <>
      <div className="adm-top"><h1>Products ({s.products.length})</h1><button className="adm-btn" onClick={add}>+ Add product</button></div>
      <div className="adm-row" style={{ marginBottom: 14 }}>
        <input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>{["all", "active", "draft", "archived"].map((o) => <option key={o}>{o}</option>)}</select>
        <button className="adm-btn ghost" onClick={() => setAll("active")}>Set shown active</button>
        <button className="adm-btn ghost" onClick={() => setAll("draft")}>Set shown draft</button>
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th /><th>Product</th><th>Status</th><th>Price</th><th>Stock</th><th>Variants</th><th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.handle}>
                <td>{p.images[0] && <img src={p.images[0]} alt="" />}</td>
                <td><Link className="link" to="/admin/products/$handle" params={{ handle: p.handle }}>{p.title}</Link></td>
                <td><span className={"adm-tag" + (p.status === "active" ? " on" : "")}>{p.status}</span></td>
                <td>৳{p.price}</td>
                <td>{p.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0)}</td>
                <td>{p.variants.length}</td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  <div className="adm-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                    <Link className="adm-btn ghost sm" to="/admin/products/$handle" params={{ handle: p.handle }}>Edit</Link>
                    <button className="adm-btn danger sm" onClick={() => { if (confirm(`Delete product "${p.title}"?`)) setState((x) => ({ ...x, products: x.products.filter((y) => y.handle !== p.handle) })); }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
