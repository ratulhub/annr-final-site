import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setSite, uid, publish } from "../admin/store";
import { BackBtn, Card } from "../admin/ui";
import { Chk, ColorF, useSite } from "../admin/site/fields";
import type { CampaignEvent } from "../admin/site/types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  getLoyaltySettings,
  saveLoyaltySettings,
  type LoyaltySettings,
  DEFAULT_LOYALTY_SETTINGS,
} from "../lib/loyalty";

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
  showFloatingGiftPill: false,
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
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [ballDropLoading, setBallDropLoading] = useState(false);
  const [ballDropSaved, setBallDropSaved] = useState(false);
  const [isEditingBallDrop, setIsEditingBallDrop] = useState(false);

  useEffect(() => {
    getLoyaltySettings().then((s) => {
      setLoyaltySettings(s);
    });
  }, []);

  const handleToggleBallDrop = async () => {
    const nextEnabled = !loyaltySettings.ball_drop_enabled;
    const updated: LoyaltySettings = {
      ...loyaltySettings,
      ball_drop_enabled: nextEnabled,
      ball_drop_config: {
        ...loyaltySettings.ball_drop_config,
        autoPopup: nextEnabled ? Boolean(loyaltySettings.ball_drop_config?.autoPopup) : false,
      },
    };
    setLoyaltySettings(updated);
    setBallDropLoading(true);
    await saveLoyaltySettings(updated);
    try {
      setSite("ballDrop", {
        ...updated.ball_drop_config,
        enabled: nextEnabled,
      } as any);
      publish();
    } catch {}
    setBallDropLoading(false);
    setBallDropSaved(true);
    setTimeout(() => setBallDropSaved(false), 3500);
  };

  const handleSaveBallDropConfig = async () => {
    setBallDropLoading(true);
    await saveLoyaltySettings(loyaltySettings);
    try {
      setSite("ballDrop", {
        ...loyaltySettings.ball_drop_config,
        enabled: loyaltySettings.ball_drop_enabled,
      } as any);
      publish();
    } catch {}
    setBallDropLoading(false);
    setBallDropSaved(true);
    setTimeout(() => setBallDropSaved(false), 3500);
  };

  const saveEvents = (next: CampaignEvent[]) => {
    setSite("events", next);
    publish();
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          for (const ev of next) {
            await supabase.from("campaign_events").upsert({
              slug: ev.id.replace(/^ev-/, "").toLowerCase(),
              title: ev.title,
              tag: ev.tag || "",
              badge_text: ev.badgeText || "",
              status: ev.status,
              starts_at: ev.startsAt ? new Date(ev.startsAt).toISOString() : null,
              ends_at: ev.endsAt ? new Date(ev.endsAt).toISOString() : null,
              min_spend: Number(ev.minSpend) || 0,
              discount_code: ev.discountCode || "",
              gift_item: ev.giftItem || "",
              gift_value: ev.giftValue || "",
              gift_image: ev.giftImage || "",
              gift_description: ev.giftDescription || "",
              show_top_bar: false,
              show_ticker: false,
              show_floating_gift_pill: false,
              bg: ev.bg || "#050505",
              text_color: ev.textColor || "#ffffff",
              accent_color: ev.accentColor || "#e10600",
              updated_at: new Date().toISOString(),
            }, { onConflict: "slug" });
          }
        } catch (e) {
          console.warn("campaign_events background sync error:", e);
        }
      })();
    }
  };

  const updateEvent = (id: string, patch: Partial<CampaignEvent>) => {
    saveEvents(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const toggleEventStatus = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const nextStatus = ev.status === "active" ? "paused" : "active";
    updateEvent(id, { status: nextStatus });
  };

  const stopAllEvents = async () => {
    if (confirm("Stop all currently running campaigns (including Ball Drop and all gift events)?")) {
      saveEvents(events.map((e) => ({ ...e, status: "paused" })));
      if (loyaltySettings.ball_drop_enabled) {
        const stopped: LoyaltySettings = {
          ...loyaltySettings,
          ball_drop_enabled: false,
          ball_drop_config: {
            ...loyaltySettings.ball_drop_config,
            autoPopup: false,
          },
        };
        setLoyaltySettings(stopped);
        setBallDropLoading(true);
        await saveLoyaltySettings(stopped);
        try {
          setSite("ballDrop", { ...stopped.ball_drop_config, enabled: false } as any);
          publish();
        } catch {}
        setBallDropLoading(false);
      }
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
          {activeCount > 0 || loyaltySettings.ball_drop_enabled ? (
            <button className="adm-btn danger" onClick={stopAllEvents}>
              Stop all ({activeCount + (loyaltySettings.ball_drop_enabled ? 1 : 0)} live)
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

      {ballDropSaved && (
        <div
          style={{
            background: "#22c55e",
            color: "#052e16",
            padding: "12px 18px",
            borderRadius: 8,
            marginBottom: 20,
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)",
          }}
        >
          <span>✓ Ball Drop Campaign settings successfully saved & synced to live store!</span>
          <button
            type="button"
            onClick={() => setBallDropSaved(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* FEATURED: Interactive Ball Drop / Lucky Sphere Campaign Controller */}
      <div
        style={{
          marginBottom: 24,
          background: "#111113",
          border: `2px solid ${loyaltySettings.ball_drop_enabled ? "#22c55e" : "#3f3f46"}`,
          borderRadius: 12,
          padding: "20px 24px",
          color: "#ffffff",
          boxShadow: loyaltySettings.ball_drop_enabled
            ? "0 8px 30px rgba(34, 197, 94, 0.15)"
            : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 0.5, color: "#ffffff" }}>
                Interactive Ball Drop Campaign
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1,
                  padding: "4px 10px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  background: loyaltySettings.ball_drop_enabled ? "#166534" : "#7f1d1d",
                  color: loyaltySettings.ball_drop_enabled ? "#86efac" : "#fca5a5",
                }}
              >
                {loyaltySettings.ball_drop_enabled ? "● LIVE ON SITE" : "● STOPPED / OFF"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#a1a1aa", maxWidth: 680, lineHeight: 1.5 }}>
              {loyaltySettings.ball_drop_enabled
                ? "The interactive split-screen TAP TO DROP mini-game is currently visible on the live storefront."
                : "The Ball Drop mini-game popup is COMPLETELY STOPPED and will NOT trigger or appear to any visitors."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={ballDropLoading}
              onClick={handleToggleBallDrop}
              style={{
                background: loyaltySettings.ball_drop_enabled ? "#ef4444" : "#22c55e",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: loyaltySettings.ball_drop_enabled
                  ? "0 4px 14px rgba(239, 68, 68, 0.4)"
                  : "0 4px 14px rgba(34, 197, 94, 0.4)",
                transition: "transform 0.15s ease",
              }}
            >
              {loyaltySettings.ball_drop_enabled ? "🛑 STOP CAMPAIGN NOW" : "⚡ TURN ON CAMPAIGN"}
            </button>

            <button
              type="button"
              onClick={() => setIsEditingBallDrop(!isEditingBallDrop)}
              style={{
                background: "#27272a",
                color: "#ffffff",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {isEditingBallDrop ? "▲ Hide Options" : "⚙️ Edit Campaign Options & Prizes"}
            </button>
          </div>
        </div>

        {/* Expandable Options Editor */}
        {isEditingBallDrop && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid #27272a",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#d4d4d8" }}>
                  Campaign Headline Title
                </label>
                <input
                  type="text"
                  value={loyaltySettings.ball_drop_config?.title || ""}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        title: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  placeholder="e.g. TAP TO DROP"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#d4d4d8" }}>
                  Drop Button Text
                </label>
                <input
                  type="text"
                  value={loyaltySettings.ball_drop_config?.buttonText || ""}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        buttonText: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  placeholder="e.g. TRY YOUR LUCK"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#d4d4d8" }}>
                  Model Banner Image URL
                </label>
                <input
                  type="text"
                  value={loyaltySettings.ball_drop_config?.modelImage || ""}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        modelImage: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                  placeholder="/cdn/shop/files/ball-drop-model.jpg"
                />
              </div>
            </div>

            {/* Triggers & Popup Settings */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                background: "#18181b",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #27272a",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(loyaltySettings.ball_drop_config?.autoPopup)}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        autoPopup: e.target.checked,
                      },
                    })
                  }
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Auto-popup on visitor page load</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                    Default: OFF. When enabled, modal opens automatically after delay.
                  </div>
                </div>
              </label>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#d4d4d8" }}>
                  Auto-popup Delay (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={loyaltySettings.ball_drop_config?.autoPopupDelay || 5}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        autoPopupDelay: Number(e.target.value) || 5,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#09090b",
                    border: "1px solid #3f3f46",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(loyaltySettings.ball_drop_config?.showFloatingTrigger)}
                  onChange={(e) =>
                    setLoyaltySettings({
                      ...loyaltySettings,
                      ball_drop_config: {
                        ...loyaltySettings.ball_drop_config,
                        showFloatingTrigger: e.target.checked,
                      },
                    })
                  }
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Floating Trigger Badge</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                    Shows floating '⚡ BALL DROP' button at bottom corner of the site.
                  </div>
                </div>
              </label>
            </div>

            {/* Multiple Prize Options (5 Slots) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#e4e4e7" }}>
                  Prize Landing Slots & Coupons (5 Slots)
                </h3>
                <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                  Configure what prizes and discount coupons visitors can win
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(loyaltySettings.ball_drop_config?.prizes || []).map((prize, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1.5fr 1fr 100px",
                      gap: 12,
                      alignItems: "center",
                      background: "#18181b",
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: "1px solid #27272a",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 12, color: "#f3795b" }}>Slot #{idx + 1}</span>
                    <input
                      type="text"
                      value={prize.label}
                      onChange={(e) => {
                        const newPrizes = [...(loyaltySettings.ball_drop_config?.prizes || [])];
                        const cur = newPrizes[idx] || { label: "", weight: 10 };
                        newPrizes[idx] = { ...cur, label: e.target.value, weight: cur.weight ?? 10 };
                        setLoyaltySettings({
                          ...loyaltySettings,
                          ball_drop_config: { ...loyaltySettings.ball_drop_config, prizes: newPrizes },
                        });
                      }}
                      placeholder="Prize label"
                      style={{
                        padding: "6px 10px",
                        background: "#09090b",
                        border: "1px solid #3f3f46",
                        color: "#ffffff",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    />
                    <input
                      type="text"
                      value={prize.code || ""}
                      onChange={(e) => {
                        const newPrizes = [...(loyaltySettings.ball_drop_config?.prizes || [])];
                        const cur = newPrizes[idx] || { label: "", weight: 10 };
                        newPrizes[idx] = { ...cur, label: cur.label || "", weight: cur.weight ?? 10, code: e.target.value };
                        setLoyaltySettings({
                          ...loyaltySettings,
                          ball_drop_config: { ...loyaltySettings.ball_drop_config, prizes: newPrizes },
                        });
                      }}
                      placeholder="Coupon Code"
                      style={{
                        padding: "6px 10px",
                        background: "#09090b",
                        border: "1px solid #3f3f46",
                        color: "#ffffff",
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={prize.weight}
                        onChange={(e) => {
                          const newPrizes = [...(loyaltySettings.ball_drop_config?.prizes || [])];
                          const cur = newPrizes[idx] || { label: "", weight: 10 };
                          newPrizes[idx] = { ...cur, label: cur.label || "", weight: Number(e.target.value) || 10 };
                          setLoyaltySettings({
                            ...loyaltySettings,
                            ball_drop_config: { ...loyaltySettings.ball_drop_config, prizes: newPrizes },
                          });
                        }}
                        style={{
                          width: "60px",
                          padding: "6px 8px",
                          background: "#09090b",
                          border: "1px solid #3f3f46",
                          color: "#ffffff",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#a1a1aa" }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 10 }}>
              <button
                type="button"
                disabled={ballDropLoading}
                onClick={handleSaveBallDropConfig}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 24px",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  letterSpacing: 0.5,
                  boxShadow: "0 4px 14px rgba(255,255,255,0.2)",
                }}
              >
                {ballDropLoading ? "Saving to Live Store..." : "💾 Save & Apply to Live Store"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="adm-events-layout">
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
                  Storefront Placements & Display (Non-Interruptive)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  {/* Authentic Streetwear Placements */}
                  <div style={{ border: "1px solid #111827", borderRadius: 6, padding: "14px", background: "#f9fafb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111827", display: "inline-block" }} />
                      <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#111827" }}>
                        Non-Interruptive Placements (Cart Drawer &amp; Product Specs)
                      </strong>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Chk
                        label="Cart Drawer Reward Perk (Displays sleek luxury gift notice inside shopping bag when viewing cart)"
                        value={selectedEvent.showCartReward !== false}
                        onChange={(v) => updateEvent(selectedEvent.id, { showCartReward: v })}
                      />

                      <Chk
                        label="Native Product Page (PDP) Feature Bullet (Blends cleanly into the product info feature list)"
                        value={selectedEvent.showPdpPerk ?? true}
                        onChange={(v) => updateEvent(selectedEvent.id, { showPdpPerk: v })}
                      />
                    </div>
                  </div>
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
                  {/* Cart Drawer Perk Preview */}
                  {selectedEvent.showCartReward !== false && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", color: "var(--p-text-subdued)" }}>
                        1. Cart Drawer Reward Perk (Appears exclusively inside customer shopping bag):
                      </div>
                      <div
                        style={{
                          background: "#0a0a0a",
                          color: "#ffffff",
                          border: "1px solid #222222",
                          borderRadius: 4,
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontFamily: "'NB Architekt Std', sans-serif",
                          fontSize: 11,
                          letterSpacing: 0.5,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🎁</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#fff" }}>
                            {selectedEvent.giftItem ? `COMPLIMENTARY ${selectedEvent.giftItem.toUpperCase()}` : "COMPLIMENTARY GIFT DROP"}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                            {Number(selectedEvent.minSpend) > 0 ? `Qualified on orders over ৳${selectedEvent.minSpend}` : "Complimentary with your order"}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>DETAILS →</span>
                      </div>
                    </div>
                  )}

                  {/* PDP Feature Bullet Preview */}
                  {(selectedEvent.showPdpPerk ?? true) && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", color: "var(--p-text-subdued)" }}>
                        2. Native Product Page Feature List Bullet:
                      </div>
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                          fontSize: 13,
                          color: "#111827",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🎁</span>
                        <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 12 }}>
                          {selectedEvent.giftItem ? `FREE ${selectedEvent.giftItem.toUpperCase()}${Number(selectedEvent.minSpend) > 0 ? ` ON ORDERS OVER ৳${selectedEvent.minSpend}` : ""}` : "FREE GIFT WITH PURCHASE"}
                        </span>
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
