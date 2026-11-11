import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { safeImageUrl } from "../admin/security/sanitize";
import { publish, setState, uid, useAdmin, type Campaign } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin/campaigns")({ component: CampaignsPage });

async function syncCampaignDb(c: Campaign, oldSlug?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const cleanImg = c.heroImageUrl ? safeImageUrl(c.heroImageUrl) || null : null;
    if (oldSlug && oldSlug !== c.slug) {
      await supabase.from("campaigns").delete().eq("slug", oldSlug);
    }
    const { error } = await supabase.from("campaigns").upsert(
      {
        slug: c.slug,
        name: c.name,
        description: c.description || "",
        hero_image_url: cleanImg,
        hero_title: c.heroTitle || c.name,
        hero_subtitle: c.heroSubtitle || "",
        status: c.status || "active",
        sort_order: c.sortOrder || 0,
      },
      { onConflict: "slug" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to sync campaign" };
  }
}

function CampaignsPage() {
  const s = useAdmin();
  const campaigns = s.campaigns || [];
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [syncError, setSyncError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const syncFromDb = async () => {
    if (!isSupabaseConfigured()) {
      setSyncError("Supabase not configured.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      const { data, error } = await supabase.from("campaigns").select("*").order("sort_order", { ascending: true });
      if (error) {
        setSyncError(`DB load error: ${error.message}`);
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Campaign[] = data.map((r: any, idx: number) => ({
          id: String(r.id || uid()),
          slug: String(r.slug || ""),
          name: String(r.name || r.slug || "Campaign"),
          description: String(r.description || ""),
          heroImageUrl: r.hero_image_url ? String(r.hero_image_url) : "",
          heroTitle: String(r.hero_title || r.name || ""),
          heroSubtitle: String(r.hero_subtitle || ""),
          status: (r.status as Campaign["status"]) || "active",
          sortOrder: Number(r.sort_order ?? idx + 1),
        }));
        setState((x) => ({ ...x, campaigns: mapped }));
        setTimeout(() => { try { publish(); } catch {} }, 30);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to sync campaigns");
    } finally {
      setSyncing(false);
    }
  };

  const addCampaign = () => {
    setSyncError("");
    const newCamp: Campaign = {
      id: uid(),
      slug: "new-campaign-" + uid(),
      name: "New Archival Campaign",
      description: "Collector one-of-one drop.",
      heroTitle: "New Drop Collection",
      heroSubtitle: "Limited archival release.",
      status: "active",
      sortOrder: campaigns.length + 1,
    };
    setState((x) => ({ ...x, campaigns: [...(x.campaigns || []), newCamp] }));
    setTimeout(() => { try { publish(); } catch {} }, 30);
    void syncCampaignDb(newCamp).then((r) => {
      if (!r.ok && r.error) setSyncError(`Saved locally; DB sync failed: ${r.error}`);
    });
    setEditing(newCamp);
  };

  const updateCampaign = (id: string, patch: Partial<Campaign>) => {
    setSyncError("");
    let nextObj: Campaign | null = null;
    let oldSlug: string | undefined;
    setState((x) => ({
      ...x,
      campaigns: (x.campaigns || []).map((c) => {
        if (c.id !== id) return c;
        oldSlug = c.slug;
        nextObj = { ...c, ...patch };
        return nextObj;
      }),
    }));
    if (editing && editing.id === id) {
      setEditing((prev) => (prev ? { ...prev, ...patch } : null));
    }
    setTimeout(() => { try { publish(); } catch {} }, 30);
    if (nextObj) {
      void syncCampaignDb(nextObj, oldSlug).then((r) => {
        if (!r.ok && r.error) setSyncError(`Saved locally; DB sync failed: ${r.error}`);
      });
    }
  };

  const deleteCampaign = (id: string, name: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (confirm(`Delete campaign "${name}"?`)) {
      setSyncError("");
      setState((x) => ({
        ...x,
        campaigns: (x.campaigns || []).filter((c) => c.id !== id),
      }));
      if (editing && editing.id === id) setEditing(null);
      setTimeout(() => { try { publish(); } catch {} }, 30);
      if (target && isSupabaseConfigured()) {
        void (async () => {
          try {
            const { error } = await supabase.from("campaigns").delete().eq("slug", target.slug);
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
            <h1>Campaigns & Drops ({campaigns.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              Manage Unique Campaign, archival drop banners, hero typography, and schedules
            </p>
          </div>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          <button type="button" className="adm-btn ghost" disabled={syncing} onClick={() => void syncFromDb()}>
            {syncing ? "Syncing..." : "⚡ Sync from DB"}
          </button>
          <button className="adm-btn primary" onClick={addCampaign}>
            + Add Campaign Drop
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
                <th>Campaign Drop</th>
                <th>Slug</th>
                <th>Hero Headline</th>
                <th>Status</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id || c.slug} style={{ background: editing?.id === c.id ? "#f9fafb" : "transparent" }}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>
                      {s.products.filter((p) => p.campaign === c.slug).length} products linked
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{c.slug}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, color: "var(--p-text)" }}>{c.heroTitle || c.name}</span>
                  </td>
                  <td>
                    <span className={`adm-tag ${c.status === "active" ? "active" : "draft"}`}>
                      {c.status}
                    </span>
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
                        onClick={() => deleteCampaign(c.id, c.name)}
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
            title={`Edit Campaign: ${editing.name}`}
            subtitle="Configure campaign presentation on the storefront."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="adm-field">
                <span>Campaign Name</span>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => updateCampaign(editing.id, { name: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>URL Slug (e.g. unique-campaign)</span>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => updateCampaign(editing.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </label>
              <label className="adm-field">
                <span>Hero Title (Displayed in Large Architectural Font)</span>
                <input
                  type="text"
                  value={editing.heroTitle || ""}
                  onChange={(e) => updateCampaign(editing.id, { heroTitle: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>Hero Subtitle</span>
                <input
                  type="text"
                  value={editing.heroSubtitle || ""}
                  onChange={(e) => updateCampaign(editing.id, { heroSubtitle: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>Hero Banner Image URL (https:// or /...)</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editing.heroImageUrl || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateCampaign(editing.id, { heroImageUrl: v ? safeImageUrl(v) || v : "" });
                  }}
                />
              </label>
              <label className="adm-field">
                <span>Campaign Story / Editorial Description</span>
                <textarea
                  rows={4}
                  value={editing.description || ""}
                  onChange={(e) => updateCampaign(editing.id, { description: e.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>Status</span>
                <select
                  value={editing.status}
                  onChange={(e) => updateCampaign(editing.id, { status: e.target.value as Campaign["status"] })}
                >
                  <option value="active">Active (Visible)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="ended">Ended</option>
                  <option value="archived">Archived</option>
                </select>
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

