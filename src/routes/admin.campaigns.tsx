import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setState, uid, useAdmin, type Campaign } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";

export const Route = createFileRoute("/admin/campaigns")({ component: CampaignsPage });

function CampaignsPage() {
  const s = useAdmin();
  const campaigns = s.campaigns || [];
  const [editing, setEditing] = useState<Campaign | null>(null);

  const addCampaign = () => {
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
    setEditing(newCamp);
  };

  const updateCampaign = (id: string, patch: Partial<Campaign>) => {
    setState((x) => ({
      ...x,
      campaigns: (x.campaigns || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    if (editing && editing.id === id) {
      setEditing((prev) => (prev ? { ...prev, ...patch } : null));
    }
  };

  const deleteCampaign = (id: string, name: string) => {
    if (confirm(`Delete campaign "${name}"?`)) {
      setState((x) => ({
        ...x,
        campaigns: (x.campaigns || []).filter((c) => c.id !== id),
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
            <h1>Campaigns & Drops ({campaigns.length})</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              Manage Unique Campaign, archival drop banners, hero typography, and schedules
            </p>
          </div>
        </div>
        <button className="adm-btn primary" onClick={addCampaign}>
          + Add Campaign Drop
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: editing ? "1.1fr 0.9fr" : "1fr", gap: 20 }}>
        <div className="adm-card" style={{ padding: 0 }}>
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

