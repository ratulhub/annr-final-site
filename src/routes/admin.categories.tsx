import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Category } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const s = useAdmin();
  const categories = s.categories || [];
  const [editing, setEditing] = useState<Category | null>(null);

  const addCategory = () => {
    const newCat: Category = {
      id: uid(),
      slug: "new-category-" + uid(),
      name: "New Category",
      description: "Archival category pieces.",
      sortOrder: categories.length + 1,
      visible: true,
    };
    setState((x) => ({ ...x, categories: [...(x.categories || []), newCat] }));
    setEditing(newCat);
  };

  const updateCategory = (id: string, patch: Partial<Category>) => {
    setState((x) => ({
      ...x,
      categories: (x.categories || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    if (editing && editing.id === id) {
      setEditing((prev) => (prev ? { ...prev, ...patch } : null));
    }
  };

  const deleteCategory = (id: string, name: string) => {
    if (confirm(`Delete category "${name}"?`)) {
      setState((x) => ({
        ...x,
        categories: (x.categories || []).filter((c) => c.id !== id),
      }));
      if (editing && editing.id === id) setEditing(null);
    }
  };

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Categories ({categories.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              Manage Hoodies, Sweatshirts, Trousers, Sweaters, T-Shirts, Jackets, Knitwear, Accessories
            </p>
          </div>
        </div>
        <button className="adm-btn primary" onClick={addCategory}>
          + Add Category
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: editing ? "1.1fr 0.9fr" : "1fr", gap: 20 }}>
        <div className="adm-card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Visibility</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id || c.slug} style={{ background: editing?.id === c.id ? "#f9fafb" : "transparent" }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>
                      {s.products.filter((p) => p.category === c.slug).length} products linked
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>/{c.slug}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>{c.description || "—"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => updateCategory(c.id, { visible: !c.visible })}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`adm-tag ${c.visible ? "active" : "draft"}`}>
                        {c.visible ? "Visible" : "Hidden"}
                      </span>
                    </button>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <div className="adm-row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button
                        type="button"
                        className="adm-btn ghost sm"
                        onClick={() => setEditing(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn danger sm"
                        onClick={() => deleteCategory(c.id, c.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <Card
            title={`Edit Category: ${editing.name}`}
            subtitle="Configure category name, slug, and description."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="adm-field">
                <span>Category Name (e.g. Hoodies)</span>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => updateCategory(editing.id, { name: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>URL Slug (e.g. hoodies)</span>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => updateCategory(editing.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </label>
              <label className="adm-field">
                <span>Description / Subtitle</span>
                <textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => updateCategory(editing.id, { description: e.target.value })}
                />
              </label>
              <label className="adm-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editing.visible}
                  onChange={(e) => updateCategory(editing.id, { visible: e.target.checked })}
                />
                <span>Visible on storefront navigation</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="adm-btn primary sm"
                  onClick={() => setEditing(null)}
                >
                  Done Editing
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

