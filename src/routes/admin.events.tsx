import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";
import { Chk, ColorF, useSite } from "../admin/site/fields";
import type { CampaignEvent } from "../admin/site/types";

export const Route = createFileRoute("/admin/events")({ component: EventsManager });

const EVENT_TYPES: Record<CampaignEvent["type"], string> = {
  gift_with_purchase: "Gift with Purchase (GWP)",
  event: "Seasonal / Brand Event",
  flash_sale: "Flash Sale & Promotion",
  countdown: "Launch / Drop Countdown",
};

const blankEvent = (): CampaignEvent => ({
  id: `ev-${uid()}`,
  title: "New Gift Campaign",
  type: "gift_with_purchase",
  status: "active",
  tag: "FREE GIFT",
  badgeText: "GIFT WITH PURCHASE",
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  continuous: true,
  minSpend: "5000",
  targetCollection: "all",
  discountCode: "FREEGIFT",
  giftItem: "AnnR Classics White Socks Bundle",
  giftValue: "৳1,200",
  giftImage: "/cdn/shop/files/UWUSOCKS1.jpg",
  giftDescription: "Complimentary AnnR gift bundle automatically qualified on eligible orders.",
  showTopBar: false,
  topBarText: "🎁 FREE ANNR GIFT BUNDLE ON ALL ORDERS OVER ৳5,000 · LIMITED TIME",
  topBarUrl: "/collections/all/index.html",
  showTicker: false,
  tickerText: "ANNR GIFT CAMPAIGN · FREE GIFT WITH ORDERS OVER ৳5,000 · SHOP NOW",
  showFloatingGiftPill: true,
  pillText: "🎁 FREE GIFT WITH ৳5,000+",
  showCartReward: true,
  cartRewardMessage: "Add ৳{remaining} more to claim your FREE AnnR Gift!",
  bg: "#050505",
  textColor: "#ffffff",
  accentColor: "#e10600",
});

function EventsManager() {
  const site = useSite();
  const events = site.events || [];
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id || null);
  const [search, setSearch] = useState("");

  const saveEvents = (next: CampaignEvent[]) => setSite("events", next);

  const updateEvent = (id: string, patch: Partial<CampaignEvent>) => {
    saveEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const toggleEventStatus = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const nextStatus = ev.status === "active" ? "paused" : "active";
    updateEvent(id, { status: nextStatus });
  };

  const stopAllEvents = () => {
    if (confirm("Stop all currently running gift campaigns and events?")) {
      saveEvents(events.map((e) => ({ ...e, status: "paused" })));
    }
  };

  const startAllEvents = () => {
    if (confirm("Start all gift campaigns and events?")) {
      saveEvents(events.map((e) => ({ ...e, status: "active" })));
    }
  };

  const createEvent = () => {
    const nev = blankEvent();
    saveEvents([nev, ...events]);
    setSelectedId(nev.id);
  };

  const duplicateEvent = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const dup: CampaignEvent = {
      ...structuredClone(ev),
      id: `ev-${uid()}`,
      title: `${ev.title} (Copy)`,
      status: "paused",
    };
    saveEvents([...events, dup]);
    setSelectedId(dup.id);
  };

  const deleteEvent = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    if (confirm(`Delete campaign "${ev.title}"?`)) {
      const next = events.filter((e) => e.id !== id);
      saveEvents(next);
      if (selectedId === id) setSelectedId(next[0]?.id || null);
    }
  };

  const activeCount = events.filter((e) => e.status === "active").length;
  const filteredEvents = events.filter(
    (e) =>
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.tag.toLowerCase().includes(search.toLowerCase()) ||
      e.giftItem.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEvent = events.find((e) => e.id === selectedId);

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>Gift Campaigns & Events</h1>
            <p className="adm-hint" style={{ marginTop: 4 }}>
              Control live gift drops, seasonal promotions, flash sales, countdowns, and reward triggers across the entire storefront.
            </p>
          </div>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          {activeCount > 0 ? (
            <button className="adm-btn danger" onClick={stopAllEvents}>
              Stop all ({activeCount} live)
            </button>
          ) : (
            <button className="adm-btn ghost" onClick={startAllEvents}>
              Start all ({events.length})
            </button>
          )}
          <button className="adm-btn" onClick={createEvent}>
            + New Campaign
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
        {/* Left Column: Campaign List & Controls */}
        <div>
          <Card title={`All Campaigns (${events.length})`}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="search"
                placeholder="Search campaigns & gifts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEvents.map((ev) => {
                const isSelected = ev.id === selectedId;
                const isActive = ev.status === "active";
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    style={{
                      border: isSelected ? "2px solid #202223" : "1px solid var(--p-border-subdued)",
                      borderRadius: 8,
                      padding: "14px 16px",
                      cursor: "pointer",
                      background: isSelected ? "#f9fafb" : "#ffffff",
                      boxShadow: isSelected ? "0 0 0 1px #202223" : "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span className={`adm-tag ${isActive ? "active" : "draft"}`}>
                        {isActive ? "Active" : "Paused"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--p-text-subdued)" }}>
                        {EVENT_TYPES[ev.type].split(" ")[0]}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--p-text)", marginBottom: 4 }}>
                      {ev.title}
                    </div>

                    <div style={{ fontSize: 12.5, color: "var(--p-text-subdued)", marginBottom: 10, lineHeight: 1.4 }}>
                      {ev.type === "gift_with_purchase" ? (
                        <>Free gift: <strong>{ev.giftItem || "Gift item"}</strong> {ev.minSpend ? `(Orders over ৳${ev.minSpend})` : ""}</>
                      ) : (
                        <>{ev.badgeText || ev.tag} · {ev.continuous ? "Continuous" : `${ev.startsAt} to ${ev.endsAt}`}</>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`adm-btn sm ${isActive ? "danger" : ""}`}
                        style={{ padding: "4px 12px", fontSize: 11 }}
                        onClick={() => toggleEventStatus(ev.id)}
                      >
                        {isActive ? "Stop" : "Start"}
                      </button>
                      <div className="adm-row" style={{ gap: 4 }}>
                        <button className="adm-btn ghost sm" onClick={() => duplicateEvent(ev.id)}>
                          Copy
                        </button>
                        <button className="adm-btn ghost sm" style={{ color: "#c00" }} onClick={() => deleteEvent(ev.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!filteredEvents.length && (
                <div style={{ textAlign: "center", padding: "24px 12px", color: "#888", fontSize: 12 }}>
                  No campaigns match your search.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Full Campaign Editor & Live Preview */}
        <div>
          {selectedEvent ? (
            <>
              <Card
                title={`Editing: ${selectedEvent.title}`}
                action={
                  <div className="adm-row" style={{ gap: 8 }}>
                    <button
                      className={`adm-btn ${selectedEvent.status === "active" ? "danger" : ""}`}
                      onClick={() => toggleEventStatus(selectedEvent.id)}
                    >
                      {selectedEvent.status === "active" ? "■ Stop Campaign" : "▶ Start Campaign"}
                    </button>
                  </div>
                }
              >
                {/* 1. Status & Core Info */}
                <div className="adm-grid" style={{ marginBottom: 18 }}>
                  <label className="adm-field">
                    <span>Campaign title</span>
                    <input
                      value={selectedEvent.title}
                      onChange={(e) => updateEvent(selectedEvent.id, { title: e.target.value })}
                      placeholder="e.g. Winter Free Gift Drop"
                    />
                  </label>

                  <label className="adm-field">
                    <span>Campaign type</span>
                    <select
                      value={selectedEvent.type}
                      onChange={(e) => updateEvent(selectedEvent.id, { type: e.target.value as CampaignEvent["type"] })}
                    >
                      {Object.entries(EVENT_TYPES).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="adm-field">
                    <span>Current status</span>
                    <select
                      value={selectedEvent.status}
                      onChange={(e) => updateEvent(selectedEvent.id, { status: e.target.value as CampaignEvent["status"] })}
                    >
                      <option value="active">Active (Running on store)</option>
                      <option value="paused">Paused (Stopped)</option>
                      <option value="scheduled">Scheduled (Date range)</option>
                    </select>
                  </label>

                  <label className="adm-field">
                    <span>Badge / Tag</span>
                    <input
                      value={selectedEvent.tag}
                      onChange={(e) => updateEvent(selectedEvent.id, { tag: e.target.value.toUpperCase() })}
                      placeholder="e.g. FREE GIFT, LIMITED DROP"
                    />
                  </label>
                </div>

                {/* 2. Timing & Schedule */}
                <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", margin: "16px 0 8px" }}>
                  Schedule & Timing
                </h3>
                <div style={{ marginBottom: 12 }}>
                  <Chk
                    label="Run continuously (Never expires until manually stopped)"
                    value={selectedEvent.continuous}
                    onChange={(v) => updateEvent(selectedEvent.id, { continuous: v })}
                  />
                </div>

                {!selectedEvent.continuous && (
                  <div className="adm-grid" style={{ marginBottom: 18 }}>
                    <label className="adm-field">
                      <span>Start date</span>
                      <input
                        type="date"
                        value={selectedEvent.startsAt}
                        onChange={(e) => updateEvent(selectedEvent.id, { startsAt: e.target.value })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>End date</span>
                      <input
                        type="date"
                        value={selectedEvent.endsAt}
                        onChange={(e) => updateEvent(selectedEvent.id, { endsAt: e.target.value })}
                      />
                    </label>
                  </div>
                )}

                {/* 3. Gift Item & Trigger Conditions */}
                <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", margin: "18px 0 8px" }}>
                  Reward Gift & Conditions
                </h3>
                <div className="adm-grid" style={{ marginBottom: 18 }}>
                  <label className="adm-field">
                    <span>Free gift product / item name</span>
                    <input
                      value={selectedEvent.giftItem}
                      onChange={(e) => updateEvent(selectedEvent.id, { giftItem: e.target.value })}
                      placeholder="e.g. AnnR Classics White Socks Bundle"
                    />
                  </label>

                  <label className="adm-field">
                    <span>Gift perceived value</span>
                    <input
                      value={selectedEvent.giftValue}
                      onChange={(e) => updateEvent(selectedEvent.id, { giftValue: e.target.value })}
                      placeholder="e.g. ৳1,200"
                    />
                  </label>

                  <label className="adm-field">
                    <span>Minimum spend to qualify (BDT ৳)</span>
                    <input
                      type="number"
                      value={selectedEvent.minSpend}
                      onChange={(e) => updateEvent(selectedEvent.id, { minSpend: e.target.value })}
                      placeholder="e.g. 5000 (0 for all orders)"
                    />
                  </label>

                  <label className="adm-field">
                    <span>Promo / Discount code (optional)</span>
                    <input
                      value={selectedEvent.discountCode}
                      onChange={(e) => updateEvent(selectedEvent.id, { discountCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. FREEGIFT"
                    />
                  </label>

                  <label className="adm-field" style={{ gridColumn: "1/-1" }}>
                    <span>Gift image URL</span>
                    <input
                      value={selectedEvent.giftImage}
                      onChange={(e) => updateEvent(selectedEvent.id, { giftImage: e.target.value })}
                      placeholder="/cdn/shop/files/UWUSOCKS1.jpg"
                    />
                  </label>

                  <label className="adm-field" style={{ gridColumn: "1/-1" }}>
                    <span>Gift description / campaign copy</span>
                    <textarea
                      rows={2}
                      value={selectedEvent.giftDescription}
                      onChange={(e) => updateEvent(selectedEvent.id, { giftDescription: e.target.value })}
                      placeholder="Explain how customers qualify and claim their gift."
                    />
                  </label>
                </div>

                {/* 4. Storefront Placements */}
                <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", margin: "18px 0 8px" }}>
                  Storefront Placements & Display
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  {/* Recommended Modern Luxury Placements */}
                  <div style={{ border: "1px solid #10b981", borderRadius: 6, padding: "14px", background: "rgba(16, 185, 129, 0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                      <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#065f46" }}>
                        Luxury Floating HUD & PDP Perks (Recommended · Zero UI Glitches)
                      </strong>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Chk
                        label="Floating Screen HUD Capsule (Bottom-right luxury glass badge with glowing beacon)"
                        value={selectedEvent.showFloatingGiftPill}
                        onChange={(v) => updateEvent(selectedEvent.id, { showFloatingGiftPill: v })}
                      />
                      {selectedEvent.showFloatingGiftPill && (
                        <div style={{ marginTop: 4, marginLeft: 24 }}>
                          <label className="adm-field">
                            <span>HUD pill badge label</span>
                            <input
                              value={selectedEvent.pillText}
                              onChange={(e) => updateEvent(selectedEvent.id, { pillText: e.target.value })}
                              placeholder="e.g. FREE GIFT // ৳5,000+ ORDERS"
                            />
                          </label>
                        </div>
                      )}

                      <Chk
                        label="Product Page (PDP) Integrated Perk Chip (Directly above Add-to-Cart button)"
                        value={selectedEvent.showPdpPerk ?? true}
                        onChange={(v) => updateEvent(selectedEvent.id, { showPdpPerk: v })}
                      />

                      <Chk
                        label="Cart Drawer Progress & Reward Prompt"
                        value={selectedEvent.showCartReward}
                        onChange={(v) => updateEvent(selectedEvent.id, { showCartReward: v })}
                      />
                      {selectedEvent.showCartReward && (
                        <div style={{ marginTop: 4, marginLeft: 24 }}>
                          <label className="adm-field">
                            <span>Cart incentive message (Use {'{remaining}'} for remaining ৳)</span>
                            <input
                              value={selectedEvent.cartRewardMessage}
                              onChange={(e) => updateEvent(selectedEvent.id, { cartRewardMessage: e.target.value })}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legacy Header Bars (Optional) */}
                  <details style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "10px 14px" }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--p-text-subdued)" }}>
                      Legacy Header Bars (Disabled by default to preserve clean floating header)
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                      <div>
                        <Chk
                          label="Show Top Announcement Bar (Header Bar)"
                          value={selectedEvent.showTopBar}
                          onChange={(v) => updateEvent(selectedEvent.id, { showTopBar: v })}
                        />
                        {selectedEvent.showTopBar && (
                          <div className="adm-grid" style={{ marginTop: 8 }}>
                            <label className="adm-field" style={{ gridColumn: "1/-1" }}>
                              <span>Top bar message text</span>
                              <input
                                value={selectedEvent.topBarText}
                                onChange={(e) => updateEvent(selectedEvent.id, { topBarText: e.target.value })}
                              />
                            </label>
                            <label className="adm-field" style={{ gridColumn: "1/-1" }}>
                              <span>Top bar link URL</span>
                              <input
                                value={selectedEvent.topBarUrl}
                                onChange={(e) => updateEvent(selectedEvent.id, { topBarUrl: e.target.value })}
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div>
                        <Chk
                          label="Show Infinite Marquee Ticker Banner (Sub-Header Bar)"
                          value={selectedEvent.showTicker}
                          onChange={(v) => updateEvent(selectedEvent.id, { showTicker: v })}
                        />
                        {selectedEvent.showTicker && (
                          <div style={{ marginTop: 8 }}>
                            <label className="adm-field">
                              <span>Marquee scrolling text</span>
                              <input
                                value={selectedEvent.tickerText}
                                onChange={(e) => updateEvent(selectedEvent.id, { tickerText: e.target.value })}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>

                {/* 5. Banner Colors */}
                <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", margin: "18px 0 8px" }}>
                  Campaign Theme Colors
                </h3>
                <div className="adm-grid">
                  <ColorF
                    label="Banner background"
                    value={selectedEvent.bg}
                    onChange={(v) => updateEvent(selectedEvent.id, { bg: v })}
                  />
                  <ColorF
                    label="Text color"
                    value={selectedEvent.textColor}
                    onChange={(v) => updateEvent(selectedEvent.id, { textColor: v })}
                  />
                  <ColorF
                    label="Accent highlight color"
                    value={selectedEvent.accentColor}
                    onChange={(v) => updateEvent(selectedEvent.id, { accentColor: v })}
                  />
                </div>
              </Card>

              {/* Live Storefront Component Preview */}
              <Card title="Live Storefront Component Preview">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Floating HUD Capsule Preview */}
                  {selectedEvent.showFloatingGiftPill && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", color: "var(--p-text-subdued)" }}>
                        1. Floating Screen HUD Badge (Bottom-Right Capsule):
                      </div>
                      <div style={{ display: "inline-flex", background: "#1a1a1a", padding: 16, borderRadius: 8, width: "100%", justifyContent: "center" }}>
                        <div
                          style={{
                            background: "rgba(10, 10, 14, 0.95)",
                            border: "1px solid rgba(255, 255, 255, 0.22)",
                            borderRadius: 999,
                            padding: "7px 14px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#00e676",
                              display: "inline-block",
                              boxShadow: "0 0 8px #00e676",
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "'NB Architekt Std', sans-serif",
                              fontSize: 10.5,
                              letterSpacing: 1,
                              textTransform: "uppercase",
                              color: "#ffffff",
                              fontWeight: 700,
                            }}
                          >
                            {selectedEvent.tag || "FREE GIFT"} // {Number(selectedEvent.minSpend) > 0 ? `৳${selectedEvent.minSpend}+` : "ALL"} ORDERS
                          </span>
                          <span
                            style={{
                              background: "#ffffff",
                              color: "#000000",
                              padding: "3px 8px",
                              borderRadius: 999,
                              fontFamily: "'NB Architekt Std', sans-serif",
                              fontSize: 9,
                              fontWeight: 800,
                              letterSpacing: 1,
                              textTransform: "uppercase",
                            }}
                          >
                            VIEW
                          </span>
                          <span style={{ color: "#ffffff", opacity: 0.5, fontSize: 12, marginLeft: 2 }}>✕</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PDP Integrated Perk Preview */}
                  {(selectedEvent.showPdpPerk ?? true) && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", color: "var(--p-text-subdued)" }}>
                        2. Product Page (PDP) Integrated Perk Chip:
                      </div>
                      <div
                        style={{
                          background: "rgba(0, 230, 118, 0.08)",
                          border: "1px solid rgba(0, 230, 118, 0.4)",
                          borderRadius: 4,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontFamily: "'NB Architekt Std', sans-serif",
                          fontSize: 11,
                          letterSpacing: 0.8,
                          color: "#111",
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>
                          🎁 FREE GIFT: {Number(selectedEvent.minSpend) > 0 ? `ORDERS OVER ৳${selectedEvent.minSpend}` : "ALL ORDERS"} RECEIVE {selectedEvent.giftItem || "EXCLUSIVE GIFT"}
                        </span>
                        <span style={{ textDecoration: "underline", fontWeight: 700, marginLeft: 8, fontSize: 10, cursor: "pointer" }}>
                          DETAILS →
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Bar Preview (If explicitly enabled) */}
                  {selectedEvent.showTopBar && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                        Legacy Top Bar:
                      </div>
                      <div
                        style={{
                          background: selectedEvent.bg || "#050505",
                          color: selectedEvent.textColor || "#ffffff",
                          padding: "10px 14px",
                          textAlign: "center",
                          fontFamily: "'NB Architekt Std', sans-serif",
                          fontSize: 11,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          borderRadius: 2,
                        }}
                      >
                        {selectedEvent.topBarText || "Campaign Top Announcement Bar"}
                      </div>
                    </div>
                  )}

                  {/* Ticker Preview (If explicitly enabled) */}
                  {selectedEvent.showTicker && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                        Legacy Marquee Ticker:
                      </div>
                      <div
                        style={{
                          background: selectedEvent.bg || "#111",
                          color: selectedEvent.textColor || "#fff",
                          padding: "8px 12px",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          fontFamily: "'Druk Wide', sans-serif",
                          fontSize: 12,
                          letterSpacing: 1.5,
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 4,
                        }}
                      >
                        {selectedEvent.tickerText || "ANNR EVENT MARQUEE TICKER"}
                      </div>
                    </div>
                  )}

                  {/* Gift Card Showcase Preview */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                      Gift Modal / Showcase Preview:
                    </div>
                    <div
                      style={{
                        background: "#000",
                        color: "#fff",
                        padding: 16,
                        borderRadius: 4,
                        maxWidth: 420,
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {selectedEvent.giftImage && (
                          <img
                            src={selectedEvent.giftImage}
                            alt={selectedEvent.giftItem}
                            style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, background: "#222" }}
                          />
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: 9,
                              color: selectedEvent.accentColor || "#e10600",
                              fontFamily: "'FK Grotesk SemiMono', monospace",
                              letterSpacing: 1,
                            }}
                          >
                            {selectedEvent.tag || "FREE GIFT"} · {selectedEvent.giftValue || "FREE"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                            {selectedEvent.giftItem || "Gift Reward Item"}
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                            {selectedEvent.minSpend
                              ? `Complimentary when your order total exceeds ৳${selectedEvent.minSpend}`
                              : "Complimentary on all orders"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <p style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
                Select a campaign on the left or click "+ New Campaign" to create one.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
