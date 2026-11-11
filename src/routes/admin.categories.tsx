import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { safeImageUrl } from "../admin/security/sanitize";
import { publish, setState, uid, useAdmin, type Category } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

async function syncCategoryDb(c: Category, oldSlug?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const cleanImg = c.imageUrl ? safeImageUrl(c.imageUrl) || null : null;
    if (oldSlug && oldSlug !== c.slug) {
      await supabase.from("categories").delete().eq("slug", oldSlug);
    }
    const payload: Record<string, unknown> = {
      slug: c.slug,
      name: c.name,
      description: c.description || "",
      image_url: cleanImg,
      sort_order: c.sortOrder || 0,
      is_visible: c.visible !== false,
    };
    let { error } = await supabase.from("categories").upsert(payload, { onConflict: "slug" });
    if (error && /image_url|column/i.test(error.message)) {
      const retryPayload = { ...payload };
      delete retryPayload["image_url"];
      const retry = await supabase.from("categories").upsert(retryPayload, { onConflict: "slug" });
      error = retry.error;
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to sync category" };
  }
}

function CategoriesPage() {
  const s = useAdmin();
  const categories = s.categories || [];
  const [editing, setEditing] = useState<Category | null>(null);
  const [syncError, setSyncError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const emitCategoryUpdate = () => {
    setTimeout(() => {
      try { publish(); } catch {}
      try { window.dispatchEvent(new CustomEvent("annr:categories:updated")); } catch {}
    }, 30);
  };

  const syncFromDb = async () => {
    if (!isSupabaseConfigured()) {
      setSyncError("Supabase not configured.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (error) {
        setSyncError(`DB load error: ${error.message}`);
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Category[] = data.map((r: any, idx: number) => ({
          id: String(r.id || uid()),
          slug: String(r.slug || ""),
          name: String(r.name || r.slug || "Category"),
          description: String(r.description || ""),
          imageUrl: r.image_url ? String(r.image_url) : "",
          sortOrder: Number(r.sort_order ?? idx + 1),
          visible: r.is_visible !== false,
        }));
        setState((x) => {
          const byHandle = new Map(x.collections.map((col) => [col.handle, col]));
          const nextCols = [...x.collections.filter((col) => col.handle === "all" || col.handle === "unique-campaign")];
          for (const cat of mapped) {
            const prevCol = byHandle.get(cat.slug);
            nextCols.push({
              handle: cat.slug,
              title: cat.name,
              description: cat.description || prevCol?.description || "",
              image: cat.imageUrl || prevCol?.image || "",
              visible: cat.visible,
              sort: prevCol?.sort || "manual",
              products: prevCol?.products || [],
              seoTitle: prevCol?.seoTitle || `${cat.name} | AnnR`,
              seoDescription: cat.description || prevCol?.seoDescription || "",
            });
          }
          return { ...x, categories: mapped, collections: nextCols };
        });
        emitCategoryUpdate();
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setSyncing(false);
    }
  };

  const addCategory = () => {
    setSyncError("");
    const slug = "new-category-" + uid();
    const newCat: Category = {
      id: uid(),
      slug,
      name: "New Category",
      description: "Archival category pieces.",
      sortOrder: categories.length + 1,
      visible: true,
    };
    setState((x) => ({
      ...x,
      categories: [...(x.categories || []), newCat],
      collections: [
        ...x.collections,
        {
          handle: slug,
          title: newCat.name,
          description: newCat.description || "",
          image: newCat.imageUrl || "",
          visible: true,
          sort: "manual",
          products: [],
          seoTitle: `${newCat.name} | AnnR`,
          seoDescription: newCat.description || "",
        },
      ],
    }));
    emitCategoryUpdate();
    void syncCategoryDb(newCat).then((r) => {
      if (!r.ok && r.error) setSyncError(`Saved locally; DB sync failed: ${r.error}`);
    });
    setEditing(newCat);
  };

  const updateCategory = (id: string, patch: Partial<Category>) => {
    setSyncError("");
    let nextObj: Category | null = null;
    let oldSlug: string | undefined;
    setState((x) => {
      const nextCats = (x.categories || []).map((c) => {
        if (c.id !== id) return c;
        oldSlug = c.slug;
        nextObj = { ...c, ...patch };
        return nextObj;
      });
      const updated = nextObj;
      const nextCols = updated
        ? x.collections.some((col) => col.handle === oldSlug)
          ? x.collections.map((col) =>
              col.handle === oldSlug
                ? {
                    ...col,
                    handle: updated.slug,
                    title: updated.name,
                    description: updated.description ?? col.description,
                    image: updated.imageUrl ?? col.image,
                  }
                : col,
            )
          : [
              ...x.collections,
              {
                handle: updated.slug,
                title: updated.name,
                description: updated.description || "",
                image: updated.imageUrl || "",
                visible: updated.visible,
                sort: "manual",
                products: [],
                seoTitle: `${updated.name} | AnnR`,
                seoDescription: updated.description || "",
              },
            ]
        : x.collections;
      return {
        ...x,
        categories: nextCats,
        collections: nextCols,
        products:
          oldSlug && nextObj && oldSlug !== nextObj.slug
            ? x.products.map((p) => (p.category === oldSlug ? { ...p, category: nextObj!.slug } : p))
            : x.products,
      };
    });
    if (editing && editing.id === id) {
      setEditing((prev) => (prev ? { ...prev, ...patch } : null));
    }
    emitCategoryUpdate();
    if (nextObj) {
      void syncCategoryDb(nextObj, oldSlug).then((r) => {
        if (!r.ok && r.error) setSyncError(`Saved locally; DB sync failed: ${r.error}`);
      });
    }
  };

  const moveCategory = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    setSyncError("");
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved!);
    const withOrder = reordered.map((c, idx) => ({ ...c, sortOrder: idx + 1 }));
    setState((x) => ({ ...x, categories: withOrder }));
    emitCategoryUpdate();
    withOrder.forEach((c) => {
      void syncCategoryDb(c).then((r) => {
        if (!r.ok && r.error) setSyncError(`Order saved locally; DB sync failed: ${r.error}`);
      });
    });
  };

  const deleteCategory = (id: string, name: string) => {
    const target = categories.find((c) => c.id === id);
    if (confirm(`Delete category "${name}"?`)) {
      setSyncError("");
      setState((x) => ({
        ...x,
        categories: (x.categories || []).filter((c) => c.id !== id),
        collections: target ? x.collections.filter((col) => col.handle !== target.slug) : x.collections,
      }));
      if (editing && editing.id === id) setEditing(null);
      emitCategoryUpdate();
      if (target && isSupabaseConfigured()) {
        void (async () => {
          try {
            const { error } = await supabase.from("categories").delete().eq("slug", target.slug);
            if (error) setSyncError(`Removed locally; DB delete failed: ${error.message}`);
          } catch (err) {
            setSyncError(err instanceof Error ? err.message : "DB delete failed");
          }
        })();
      }
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
        <div className="adm-row" style={{ gap: 8 }}>
          <button type="button" className="adm-btn ghost" disabled={syncing} onClick={() => void syncFromDb()}>
            {syncing ? "Syncing..." : "⚡ Sync from DB"}
          </button>
          <button className="adm-btn primary" onClick={addCategory}>
            + Add Category
          </button>
        </div>
      </div>

      {syncError && (
        <div className="adm-banner critical" style={{ marginBottom: 14 }}>
          <span style={{ flex: 1 }}>{syncError}</span>
          <button type="button" className="adm-btn ghost sm" onClick={() => setSyncError("")}>Dismiss</button>
        </div>
      )}

      <div className={editing ? "adm-two-col-wide" : undefined}>
        <div className="adm-card adm-table-wrap" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Category</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Visibility</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, idx) => (
                <tr key={c.id || c.slug} style={{ background: editing?.id === c.id ? "#f9fafb" : "transparent" }}>
                  <td>
                    <div className="adm-row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="adm-btn ghost sm"
                        disabled={idx === 0}
                        onClick={() => moveCategory(idx, -1)}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="adm-btn ghost sm"
                        disabled={idx === categories.length - 1}
                        onClick={() => moveCategory(idx, 1)}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
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
              <label className="adm-field">
                <span>Category Banner Photo URL (https:// or /...)</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editing.imageUrl || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateCategory(editing.id, { imageUrl: v ? safeImageUrl(v) || v : "" });
                  }}
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

