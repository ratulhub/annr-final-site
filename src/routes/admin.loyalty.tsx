import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackBtn, Card } from "../admin/ui";
import { setSite, publish } from "../admin/store";
import {
  getLoyaltySettings,
  saveLoyaltySettings,
  getAdminWithdrawalRequests,
  processAdminWithdrawal,
  getAllLocalVipMembers,
  syncMemberAcrossLocalStores,
  getVipTiers,
  saveVipTiers,
  getLoyaltyCampaigns,
  saveLoyaltyCampaigns,
  getPointsLedger,
  getReferralRecords,
  adminReviewReferralRecord,
  adminAdjustMemberPoints,
  getLoyaltyAdminLogs,
  getLoyaltyNotifications,
  pushLoyaltyNotification,
  type LoyaltySettings,
  type WithdrawalRequest,
  type VipMember,
  type VipTierConfig,
  type LoyaltyCampaign,
  type CampaignType,
  type PointsLedgerEntry,
  type ReferralRecord,
  type LoyaltyAdminLog,
  type LoyaltyNotification,
  DEFAULT_LOYALTY_SETTINGS,
} from "../lib/loyalty";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { BD_DIVISIONS } from "../lib/bangladesh-geo";

export const Route = createFileRoute("/admin/loyalty")({ component: LoyaltyAdmin });

const DEFAULT_DEMO_MEMBERS: VipMember[] = [
  {
    id: "m-1",
    email: "ratul@example.com",
    full_name: "Ratul Ahmed",
    phone: "01712345678",
    is_whatsapp: true,
    division: "Dhaka",
    district: "Dhaka",
    upazila: "Dhanmondi",
    full_address: "House 12, Road 5, Dhanmondi",
    tier: "Gold",
    tier_multiplier: 1.25,
    available_points: 450,
    pending_points: 100,
    redeemed_points: 50,
    withdrawn_points: 200,
    total_earned_points: 800,
    referral_points_earned: 400,
    campaign_points_earned: 300,
    welcome_points_earned: 100,
    friends_referred: 4,
    lifetime_spend_bdt: 14500,
    lifetime_orders: 3,
    referral_code: "VIP-RATUL88",
    status: "active",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "m-2",
    email: "tanvir@example.com",
    full_name: "Tanvir Hossain",
    phone: "01898765432",
    is_whatsapp: true,
    division: "Chattogram",
    district: "Chattogram",
    upazila: "Agrabad",
    full_address: "CDA Ave, Agrabad",
    tier: "Silver",
    tier_multiplier: 1.0,
    available_points: 200,
    pending_points: 0,
    redeemed_points: 0,
    withdrawn_points: 0,
    total_earned_points: 200,
    referral_points_earned: 100,
    campaign_points_earned: 0,
    welcome_points_earned: 100,
    friends_referred: 1,
    lifetime_spend_bdt: 4800,
    lifetime_orders: 1,
    referral_code: "VIP-TANVIR12",
    status: "active",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

const CAMPAIGN_TYPE_LABELS: { value: CampaignType; label: string }[] = [
  { value: "registration_bonus", label: "1. Registration Bonus Campaign" },
  { value: "referral_bonus", label: "2. Referral Bonus Campaign" },
  { value: "multiplier_points", label: "3. Double / Triple Points Multiplier" },
  { value: "seasonal_festival", label: "4. Seasonal & Festival Campaign (Eid / Winter Drop)" },
  { value: "birthday_reward", label: "5. Birthday Reward Campaign" },
  { value: "first_purchase", label: "6. First Purchase Bonus Reward" },
  { value: "min_order_value", label: "7. Minimum Order Spend Reward (e.g. Spend ৳5,000+)" },
  { value: "product_specific", label: "8. Product-Specific Point Reward" },
  { value: "category_specific", label: "9. Category / Collection Point Reward" },
  { value: "repeat_purchase", label: "10. Repeat Purchase Loyalty Reward" },
  { value: "vip_discount", label: "11. Limited-Time VIP Tier Discount" },
  { value: "custom_manual", label: "12. Custom Manual Reward Campaign" },
];

type AdminLoyaltyTab =
  | "dashboard"
  | "settings"
  | "members"
  | "referrals"
  | "ledger"
  | "campaigns"
  | "tiers"
  | "withdrawals"
  | "balldrop"
  | "reports";

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function LoyaltyAdmin() {
  const [activeTab, setActiveTab] = useState<AdminLoyaltyTab>("dashboard");
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [members, setMembers] = useState<VipMember[]>([]);
  const [tiers, setTiers] = useState<VipTierConfig[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [adminLogs, setAdminLogs] = useState<LoyaltyAdminLog[]>([]);
  const [notifications, setNotifications] = useState<LoyaltyNotification[]>([]);

  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [editingMember, setEditingMember] = useState<VipMember | null>(null);
  const [adjDelta, setAdjDelta] = useState<number>(100);
  const [adjReason, setAdjReason] = useState<string>("");
  const [adjMessage, setAdjMessage] = useState<string>("");

  const [editingCampaign, setEditingCampaign] = useState<LoyaltyCampaign | null>(null);
  const [editingTier, setEditingTier] = useState<VipTierConfig | null>(null);

  const [trxId, setTrxId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [ledgerFilterType, setLedgerFilterType] = useState("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [referralStatusFilter, setReferralStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await getLoyaltySettings();
      setSettings(s);

      const w = await getAdminWithdrawalRequests();
      setWithdrawals(w);

      setTiers(getVipTiers());
      setCampaigns(getLoyaltyCampaigns());
      setReferrals(getReferralRecords());
      setLedger(getPointsLedger());
      setAdminLogs(getLoyaltyAdminLogs());
      setNotifications(getLoyaltyNotifications());

      const memberMap = new Map<string, VipMember>();
      for (const dm of DEFAULT_DEMO_MEMBERS) {
        memberMap.set(dm.email.toLowerCase(), dm);
      }

      if (isSupabaseConfigured()) {
        try {
          const { data: mData } = await supabase
            .from("vip_members")
            .select("*")
            .order("created_at", { ascending: false });
          if (Array.isArray(mData)) {
            for (const m of mData) {
              if (m && m.email) {
                memberMap.set(m.email.toLowerCase().trim(), m as VipMember);
              }
            }
          }
        } catch {}
      }

      const localList = getAllLocalVipMembers();
      for (const lm of localList) {
        if (lm && lm.email) {
          const key = lm.email.toLowerCase().trim();
          const prev = memberMap.get(key);
          if (!prev || (lm.available_points ?? 0) >= (prev.available_points ?? 0)) {
            memberMap.set(key, {
              ...prev,
              ...lm,
              tier: lm.tier || prev?.tier || "Silver",
              tier_multiplier: lm.tier_multiplier || prev?.tier_multiplier || 1.0,
              pending_points: lm.pending_points ?? prev?.pending_points ?? 0,
              redeemed_points: lm.redeemed_points ?? prev?.redeemed_points ?? 0,
              withdrawn_points: lm.withdrawn_points ?? prev?.withdrawn_points ?? 0,
              total_earned_points:
                lm.total_earned_points ?? prev?.total_earned_points ?? lm.available_points ?? 100,
              status: lm.status || prev?.status || "active",
              created_at: lm.created_at || prev?.created_at || new Date().toISOString(),
            });
          }
        }
      }

      const finalMembers = Array.from(memberMap.values());
      setMembers(finalMembers);
      try {
        localStorage.setItem("annr-vip-members", JSON.stringify(finalMembers));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemberEdit = async (updatedMember: VipMember) => {
    syncMemberAcrossLocalStores(updatedMember);
    if (
      isSupabaseConfigured() &&
      updatedMember.id &&
      !updatedMember.id.startsWith("m-") &&
      !updatedMember.id.startsWith("vip-")
    ) {
      try {
        await supabase
          .from("vip_members")
          .update({
            available_points: updatedMember.available_points,
            pending_points: updatedMember.pending_points,
            tier: updatedMember.tier,
            status: updatedMember.status,
            referral_code: updatedMember.referral_code,
          })
          .eq("id", updatedMember.id);
      } catch {}
    }
    await loadData();
    setEditingMember(null);
  };

  const handleManualPointAdjustment = async () => {
    if (!editingMember) return;
    setAdjMessage("");
    const res = await adminAdjustMemberPoints({
      memberEmail: editingMember.email,
      pointsDelta: adjDelta,
      reason: adjReason,
    });
    if (!res.ok) {
      setAdjMessage("Error: " + (res.error || "Adjustment failed"));
      return;
    }
    setAdjReason("");
    setAdjMessage(`✓ Adjusted ${adjDelta > 0 ? `+${adjDelta}` : adjDelta} PTS and recorded in immutable ledger.`);
    if (res.updatedMember) {
      setEditingMember({ ...res.updatedMember });
    }
    await loadData();
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    const res = await saveLoyaltySettings(settings);
    try {
      setSite("ballDrop", {
        ...settings.ball_drop_config,
        enabled: settings.ball_drop_enabled,
      } as any);
      publish();
    } catch {}
    setLoading(false);
    if (res.ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      await loadData();
    } else {
      alert("Error saving settings: " + (res.error || "Unknown error"));
    }
  };

  const handleProcessWithdrawal = async (req: WithdrawalRequest, action: "paid" | "approved" | "rejected") => {
    if (action === "paid" && !trxId.trim()) {
      alert("Please enter the transaction reference / TrxID before marking as paid.");
      return;
    }
    setProcessingId(req.id);
    const res = await processAdminWithdrawal(req.id, action, trxId, adminNote);
    setProcessingId(null);
    if (res.ok) {
      setSelectedRequest(null);
      setTrxId("");
      setAdminNote("");
      await loadData();
    } else {
      alert("Error: " + (res.error || "Failed to process withdrawal"));
    }
  };

  // Campaign Builder Handlers
  const handleSaveCampaign = (camp: LoyaltyCampaign) => {
    if (!camp.name.trim()) {
      alert("Please enter a campaign name.");
      return;
    }
    const exists = campaigns.some((c) => c.id === camp.id);
    const next = exists ? campaigns.map((c) => (c.id === camp.id ? camp : c)) : [camp, ...campaigns];
    setCampaigns(next);
    saveLoyaltyCampaigns(next);
    setEditingCampaign(null);
    setAdminLogs(getLoyaltyAdminLogs());
  };

  const handleToggleCampaignStatus = (id: string, nextStatus: LoyaltyCampaign["status"]) => {
    const next = campaigns.map((c) => (c.id === id ? { ...c, status: nextStatus } : c));
    setCampaigns(next);
    saveLoyaltyCampaigns(next);
    if (nextStatus === "active") {
      const target = next.find((c) => c.id === id);
      if (target) {
        for (const m of members.slice(0, 10)) {
          pushLoyaltyNotification({
            member_email: m.email,
            event_type: "campaign_launched",
            title: `New VIP Campaign: ${target.name}`,
            message: target.description || `Earn extra ANNR Points in our ${target.name} campaign!`,
          });
        }
      }
    }
  };

  const handleDuplicateCampaign = (camp: LoyaltyCampaign) => {
    const copy: LoyaltyCampaign = {
      ...camp,
      id: "camp-" + Date.now().toString(36),
      name: `${camp.name} (Copy)`,
      status: "paused",
      times_claimed: 0,
      total_points_issued: 0,
      created_at: new Date().toISOString(),
    };
    const next = [copy, ...campaigns];
    setCampaigns(next);
    saveLoyaltyCampaigns(next);
  };

  // Tier Management Handlers
  const handleSaveTier = (tier: VipTierConfig) => {
    if (!tier.name.trim()) {
      alert("Please enter a tier name.");
      return;
    }
    const exists = tiers.some((t) => t.id === tier.id);
    const next = exists ? tiers.map((t) => (t.id === tier.id ? tier : t)) : [...tiers, tier];
    const sorted = [...next].sort((a, b) => (a.rank_order || 1) - (b.rank_order || 1));
    setTiers(sorted);
    saveVipTiers(sorted);
    setEditingTier(null);
  };

  // Dashboard Metrics Calculation
  const activeMembersCount = members.filter((m) => m.status === "active").length;
  const totalPointsIssued = members.reduce((sum, m) => sum + Number(m.total_earned_points || m.available_points || 0), 0);
  const outstandingPointsLiability = members.reduce(
    (sum, m) => sum + Number(m.available_points || 0) + Number(m.pending_points || 0),
    0
  );
  const totalPointsRedeemed = members.reduce(
    (sum, m) => sum + Number(m.redeemed_points || 0) + Number(m.withdrawn_points || 0),
    0
  );
  const totalSuccessfulReferrals = Math.max(
    referrals.filter((r) => r.reward_status !== "reversed").length,
    members.reduce((sum, m) => sum + Number(m.friends_referred || 0), 0)
  );
  const referralGeneratedRevenue = referrals
    .filter((r) => r.event_type === "order" && r.reward_status !== "reversed")
    .reduce((sum, r) => sum + Number(r.order_total || 0), 0);
  const activeCampaignsCount = campaigns.filter((c) => c.status === "active").length;

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === "pending").length;
  const totalWithdrawnBdt = withdrawals
    .filter((w) => w.status === "paid")
    .reduce((sum, w) => sum + Number(w.money_amount_bdt || 0), 0);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.referral_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiv = divisionFilter === "all" || m.division === divisionFilter;
    const matchesTier = tierFilter === "all" || m.tier === tierFilter;
    return matchesSearch && matchesDiv && matchesTier;
  });

  const filteredReferrals = referrals.filter((r) => {
    if (referralStatusFilter === "flagged") return Boolean(r.fraud_flag);
    if (referralStatusFilter !== "all" && r.reward_status !== referralStatusFilter) return false;
    return true;
  });

  const filteredLedger = ledger.filter((tx) => {
    if (ledgerFilterType !== "all" && tx.transaction_type !== ledgerFilterType) return false;
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      return (
        (tx.member_name || "").toLowerCase().includes(q) ||
        (tx.member_email || "").toLowerCase().includes(q) ||
        (tx.note || "").toLowerCase().includes(q) ||
        (tx.reference_id || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>ANNR VIP Loyalty, Referral &amp; Rewards Ecosystem</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              Complete centralized control over VIP membership, referral attribution, points wallet, checkout redemption, 12-type campaigns &amp; tiers
            </p>
          </div>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          <button type="button" className="adm-btn ghost" onClick={loadData} disabled={loading}>
            ↻ Refresh Data
          </button>
          <button
            type="button"
            className="adm-btn primary"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {savedSuccess ? "✓ Programme Settings Saved" : "Save Programme Settings"}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span>VIP Members</span>
          <b>{members.length}</b>
          <small>{activeMembersCount} active · {members.length - activeMembersCount} suspended</small>
        </div>
        <div className="adm-stat">
          <span>Points Liability</span>
          <b>{outstandingPointsLiability.toLocaleString()} PTS</b>
          <small>৳{(outstandingPointsLiability * settings.point_value_bdt).toLocaleString()} redeemable value</small>
        </div>
        <div className="adm-stat">
          <span>Successful Referrals</span>
          <b>{totalSuccessfulReferrals}</b>
          <small>৳{referralGeneratedRevenue.toLocaleString()} referral order revenue</small>
        </div>
        <div className="adm-stat">
          <span>Pending Cashouts</span>
          <b style={{ color: pendingWithdrawalsCount > 0 ? "var(--p-warning)" : "inherit" }}>
            {pendingWithdrawalsCount}
          </b>
          <small>৳{totalWithdrawnBdt.toLocaleString()} disbursed via MFS</small>
        </div>
      </div>

      {/* Navigation Tabs (Phase 7 A–I) */}
      <div
        className="adm-tabs"
        style={{
          borderBottom: "1px solid var(--p-border-subdued)",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {[
          { id: "dashboard", label: "📊 Overview" },
          { id: "settings", label: "⚙ Programme Rules" },
          { id: "members", label: `👥 VIP Customers (${members.length})` },
          { id: "referrals", label: `🔗 Referrals (${referrals.length})` },
          { id: "ledger", label: `📒 Points Ledger (${ledger.length})` },
          { id: "campaigns", label: `🎯 Campaigns (${activeCampaignsCount})` },
          { id: "tiers", label: `👑 VIP Tiers (${tiers.length})` },
          { id: "withdrawals", label: `💸 Payout Queue (${pendingWithdrawalsCount})` },
          { id: "balldrop", label: "⚡ Ball Drop" },
          { id: "reports", label: "📈 Reports & Audit" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`adm-btn ${activeTab === t.id ? "primary" : "ghost"}`}
            style={{
              borderRadius: "6px 6px 0 0",
              fontSize: 12,
              padding: "8px 12px",
            }}
            onClick={() => setActiveTab(t.id as AdminLoyaltyTab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB A: LOYALTY DASHBOARD */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="ANNR Loyalty Executive Overview"
            subtitle="Real-time financial accuracy, referral velocity, and points liability across the storefront"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "Total VIP Members", value: members.length, sub: `${activeMembersCount} active accounts` },
                { label: "Total Points Issued", value: `${totalPointsIssued.toLocaleString()} PTS`, sub: `৳${(totalPointsIssued * settings.point_value_bdt).toLocaleString()} lifetime issued` },
                { label: "Outstanding Liability", value: `${outstandingPointsLiability.toLocaleString()} PTS`, sub: `৳${(outstandingPointsLiability * settings.point_value_bdt).toLocaleString()} current float` },
                { label: "Points Redeemed / Paid", value: `${totalPointsRedeemed.toLocaleString()} PTS`, sub: "Checkout discounts + MFS payouts" },
                { label: "Successful Referrals", value: totalSuccessfulReferrals, sub: `৳${referralGeneratedRevenue.toLocaleString()} generated sales` },
                { label: "Active Campaigns", value: activeCampaignsCount, sub: `${campaigns.length} total configured` },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    background: "#f9fafb",
                    border: "1px solid var(--p-border-subdued)",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--p-text-subdued)", textTransform: "uppercase" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 4px" }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <Card title="Top Referral Performers" subtitle="VIP members generating the highest referral conversions">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <th style={{ padding: "8px 6px" }}>Member</th>
                    <th style={{ padding: "8px 6px" }}>Code</th>
                    <th style={{ padding: "8px 6px" }}>Tier</th>
                    <th style={{ padding: "8px 6px" }}>Referrals</th>
                    <th style={{ padding: "8px 6px" }}>Available PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {[...members]
                    .sort((a, b) => Number(b.friends_referred || 0) - Number(a.friends_referred || 0) || b.available_points - a.available_points)
                    .slice(0, 6)
                    .map((m) => (
                      <tr key={m.id || m.email} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                        <td style={{ padding: "8px 6px" }}>
                          <b>{m.full_name}</b>
                          <div style={{ fontSize: 10, color: "var(--p-text-subdued)" }}>{m.email}</div>
                        </td>
                        <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700 }}>{m.referral_code}</td>
                        <td style={{ padding: "8px 6px" }}>
                          <span className="adm-tag info">{m.tier}</span>
                        </td>
                        <td style={{ padding: "8px 6px", fontWeight: 700 }}>{m.friends_referred || 0}</td>
                        <td style={{ padding: "8px 6px", color: "#008060", fontWeight: 700 }}>{m.available_points} PTS</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>

            <Card title="Recent Points Ledger Activity" subtitle="Latest automated & admin-audited points transactions">
              {ledger.length === 0 ? (
                <div style={{ padding: 20, color: "var(--p-text-subdued)", fontSize: 12 }}>
                  No ledger transactions recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ledger.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "#f9fafb",
                        border: "1px solid var(--p-border-subdued)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div>
                          <b>{tx.member_name}</b> · <span style={{ fontSize: 11 }}>{tx.note}</span>
                        </div>
                        <small style={{ color: "var(--p-text-subdued)" }}>
                          {tx.created_at.slice(0, 16).replace("T", " ")} · {tx.transaction_type}
                        </small>
                      </div>
                      <b style={{ color: tx.amount >= 0 ? "#008060" : "#dc2626" }}>
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB B: GLOBAL PROGRAMME SETTINGS */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="1. VIP Membership & Registration Rules"
            subtitle="Control welcome bonuses, automatic activation, referral code prefix, and point expiration"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={settings.program_enabled}
                    onChange={(e) => setSettings({ ...settings, program_enabled: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600 }}>Enable ANNR VIP Loyalty &amp; Referral Programme</span>
                </label>

                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={settings.auto_activate_membership !== false}
                    onChange={(e) => setSettings({ ...settings, auto_activate_membership: e.target.checked })}
                  />
                  <span>Automatically activate VIP membership upon registration</span>
                </label>
              </div>

              <div className="adm-grid">
                <label className="adm-field">
                  <span>Registration Welcome Bonus (ANNR Points)</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={settings.welcome_bonus_points ?? 100}
                    onChange={(e) => setSettings({ ...settings, welcome_bonus_points: Number(e.target.value) })}
                  />
                  <small className="adm-hint">Points automatically credited upon joining VIP</small>
                </label>

                <label className="adm-field">
                  <span>Point Value in BDT (৳ per 1 ANNR Point)</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={settings.point_value_bdt}
                    onChange={(e) => setSettings({ ...settings, point_value_bdt: Number(e.target.value) })}
                  />
                  <small className="adm-hint">e.g. 1.00 means 100 PTS = ৳100 discount or cashout</small>
                </label>

                <label className="adm-field">
                  <span>Referral Code Prefix</span>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.coupon_prefix}
                    onChange={(e) => setSettings({ ...settings, coupon_prefix: e.target.value.toUpperCase() })}
                  />
                  <small className="adm-hint">e.g. "ANNR-" or "VIP-" → ANNR-RATUL25</small>
                </label>

                <label className="adm-field">
                  <span>Points Expiration Policy (Days)</span>
                  <input
                    type="number"
                    min={0}
                    max={3650}
                    value={settings.point_expiration_days ?? 365}
                    onChange={(e) => setSettings({ ...settings, point_expiration_days: Number(e.target.value) })}
                  />
                  <small className="adm-hint">0 = Points never expire</small>
                </label>
              </div>
            </div>
          </Card>

          <Card
            title="2. Referral Attribution & Referee Coupon Rules"
            subtitle="Configure referrer rewards, friend discounts, minimum order requirements, and anti-fraud rules"
          >
            <div className="adm-grid">
              <label className="adm-field">
                <span>Referrer Reward Earning Mode</span>
                <select
                  value={settings.reward_mode}
                  onChange={(e) => setSettings({ ...settings, reward_mode: e.target.value as any })}
                >
                  <option value="fixed_points">Fixed Points per Qualifying Order (e.g. 100 PTS)</option>
                  <option value="percent_order">% of Referred Order Value (e.g. 5%)</option>
                </select>
              </label>

              {settings.reward_mode === "fixed_points" ? (
                <label className="adm-field">
                  <span>Points Awarded to Referrer per Order</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.points_per_referral}
                    onChange={(e) => setSettings({ ...settings, points_per_referral: Number(e.target.value) })}
                  />
                </label>
              ) : (
                <label className="adm-field">
                  <span>% of Order Value Awarded as Points</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    value={settings.percent_order_points}
                    onChange={(e) => setSettings({ ...settings, percent_order_points: Number(e.target.value) })}
                  />
                </label>
              )}

              <label className="adm-field">
                <span>Referee (Friend) Discount Type</span>
                <select
                  value={settings.friend_discount_type}
                  onChange={(e) => setSettings({ ...settings, friend_discount_type: e.target.value as any })}
                >
                  <option value="percent">Percentage Discount (% OFF)</option>
                  <option value="fixed">Fixed Taka Discount (৳ OFF)</option>
                </select>
              </label>

              <label className="adm-field">
                <span>Referee Discount Value</span>
                <input
                  type="number"
                  min={1}
                  value={settings.friend_discount_value}
                  onChange={(e) => setSettings({ ...settings, friend_discount_value: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Minimum Order Amount for Referral Coupon (৳)</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.min_order_for_coupon}
                  onChange={(e) => setSettings({ ...settings, min_order_for_coupon: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Maximum Referral Discount Cap (৳)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={settings.max_discount_bdt ?? 2000}
                  onChange={(e) => setSettings({ ...settings, max_discount_bdt: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Referral Attribution Window (Days)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.attribution_window_days ?? 30}
                  onChange={(e) => setSettings({ ...settings, attribution_window_days: Number(e.target.value) })}
                />
                <small className="adm-hint">How long a ?ref= link visit stays attributed to the referrer</small>
              </label>

              <label className="adm-field">
                <span>Qualifying Order Event for Referral Reward</span>
                <select
                  value={settings.qualifying_order_status || "placed"}
                  onChange={(e) => setSettings({ ...settings, qualifying_order_status: e.target.value as any })}
                >
                  <option value="placed">On Qualifying Order Placement (Auto-reversed if cancelled)</option>
                  <option value="paid">On Payment Verification</option>
                  <option value="fulfilled">On Order Delivery / Fulfillment</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={Boolean(settings.first_order_only_referral)}
                  onChange={(e) => setSettings({ ...settings, first_order_only_referral: e.target.checked })}
                />
                <span>Restrict referral coupons to first-time referred orders only (prevent repeat rewards from same friend)</span>
              </label>
            </div>
          </Card>

          <Card
            title="3. Checkout Point Redemption & Purchase Earning Rules"
            subtitle="Control how customers earn ANNR Points on purchases and redeem points for discounts at checkout"
          >
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={settings.redemption_enabled !== false}
                  onChange={(e) => setSettings({ ...settings, redemption_enabled: e.target.checked })}
                />
                <span style={{ fontWeight: 600 }}>Enable ANNR Points Redemption at Checkout</span>
              </label>

              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={settings.allow_points_with_coupon !== false}
                  onChange={(e) => setSettings({ ...settings, allow_points_with_coupon: e.target.checked })}
                />
                <span>Allow combining ANNR Points redemption with Referral/Promo coupons</span>
              </label>

              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={settings.order_earn_enabled !== false}
                  onChange={(e) => setSettings({ ...settings, order_earn_enabled: e.target.checked })}
                />
                <span>Award ANNR Points on customer purchases</span>
              </label>
            </div>

            <div className="adm-grid">
              <label className="adm-field">
                <span>Points Earned per ৳100 Spent</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.points_per_100_bdt ?? 2}
                  onChange={(e) => setSettings({ ...settings, points_per_100_bdt: Number(e.target.value) })}
                />
                <small className="adm-hint">e.g. 2 means a ৳5,000 order earns +100 base ANNR Points</small>
              </label>

              <label className="adm-field">
                <span>Minimum Points Required to Redeem</span>
                <input
                  type="number"
                  min={1}
                  value={settings.min_redemption_points ?? 50}
                  onChange={(e) => setSettings({ ...settings, min_redemption_points: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Maximum Points Redeemable per Order</span>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={settings.max_redemption_points_order ?? 2000}
                  onChange={(e) => setSettings({ ...settings, max_redemption_points_order: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Max % of Order Subtotal Payable with Points</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.max_redemption_percent_order ?? 50}
                  onChange={(e) => setSettings({ ...settings, max_redemption_percent_order: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Minimum Order Value for Point Redemption (৳)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={settings.min_order_for_redemption ?? 500}
                  onChange={(e) => setSettings({ ...settings, min_order_for_redemption: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Minimum MFS Cash Withdrawal (৳)</span>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={settings.min_withdrawal_bdt}
                  onChange={(e) => setSettings({ ...settings, min_withdrawal_bdt: Number(e.target.value) })}
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* TAB C: VIP CUSTOMER MANAGEMENT */}
      {activeTab === "members" && (
        <Card
          title="VIP Customer Management & Wallet Inspector"
          subtitle="Search members, inspect referral history, adjust points with mandatory audit reasons, or change tiers/status"
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone, or referral code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            >
              <option value="all">All VIP Tiers</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.points_multiplier}×)
                </option>
              ))}
            </select>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            >
              <option value="all">All 8 Divisions</option>
              {BD_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                  <th style={{ padding: "10px 8px" }}>Member</th>
                  <th style={{ padding: "10px 8px" }}>Location</th>
                  <th style={{ padding: "10px 8px" }}>Referral Code</th>
                  <th style={{ padding: "10px 8px" }}>Tier</th>
                  <th style={{ padding: "10px 8px" }}>Available PTS</th>
                  <th style={{ padding: "10px 8px" }}>Lifetime PTS</th>
                  <th style={{ padding: "10px 8px" }}>Referrals</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id || m.email} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <td style={{ padding: "10px 8px" }}>
                      <div>
                        <b>{m.full_name}</b>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>
                        {m.email} · {m.phone}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <div>
                        {m.district}, {m.division}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          padding: "2px 6px",
                          background: "#f0f2f5",
                          borderRadius: 4,
                        }}
                      >
                        {m.referral_code}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className="adm-tag info">
                        {m.tier} ({m.tier_multiplier || 1}×)
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 700, color: "#008060" }}>
                      {m.available_points} PTS (৳{(m.available_points * settings.point_value_bdt).toFixed(0)})
                    </td>
                    <td style={{ padding: "10px 8px" }}>{m.total_earned_points || m.available_points} PTS</td>
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>{m.friends_referred || 0}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className={`adm-tag ${m.status === "active" ? "active" : "danger"}`}>{m.status}</span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <button
                        type="button"
                        className="adm-btn primary sm"
                        onClick={() => {
                          setEditingMember({ ...m });
                          setAdjMessage("");
                          setAdjReason("");
                        }}
                      >
                        Inspect / Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingMember && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 24,
                  borderRadius: 8,
                  maxWidth: 620,
                  width: "100%",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
              >
                <h2 style={{ marginTop: 0 }}>VIP Profile &amp; Wallet: {editingMember.full_name}</h2>
                <div style={{ fontSize: 12, color: "var(--p-text-subdued)", marginBottom: 14 }}>
                  {editingMember.email} · {editingMember.phone} · Referral Link:{" "}
                  <code>{`${window.location.origin}/?ref=${editingMember.referral_code}`}</code>
                </div>

                {/* Audited Point Adjustment Section */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    ⚡ Compensating Point Adjustment (Generates Immutable Audit Record)
                  </div>
                  <div className="adm-grid">
                    <label className="adm-field">
                      <span>Points Delta (+ to Credit, - to Deduct)</span>
                      <input
                        type="number"
                        value={adjDelta}
                        onChange={(e) => setAdjDelta(Number(e.target.value))}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Mandatory Audit Reason *</span>
                      <input
                        type="text"
                        placeholder="e.g. Goodwill bonus for delayed delivery"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                      />
                    </label>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: adjMessage.startsWith("Error") ? "#dc2626" : "#008060" }}>
                      {adjMessage}
                    </span>
                    <button type="button" className="adm-btn primary sm" onClick={handleManualPointAdjustment}>
                      Apply Audited Adjustment
                    </button>
                  </div>
                </div>

                {/* Membership Tier, Referral Code & Status Controls */}
                <div className="adm-grid" style={{ marginBottom: 16 }}>
                  <label className="adm-field">
                    <span>Available Points</span>
                    <input
                      type="number"
                      min={0}
                      value={editingMember.available_points}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, available_points: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="adm-field">
                    <span>Pending Points</span>
                    <input
                      type="number"
                      min={0}
                      value={editingMember.pending_points}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, pending_points: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="adm-field">
                    <span>Personal Referral Code</span>
                    <input
                      type="text"
                      value={editingMember.referral_code}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, referral_code: e.target.value.toUpperCase() })
                      }
                    />
                  </label>
                  <label className="adm-field">
                    <span>VIP Membership Tier</span>
                    <select
                      value={editingMember.tier}
                      onChange={(e) => {
                        const tObj = tiers.find((x) => x.name === e.target.value);
                        setEditingMember({
                          ...editingMember,
                          tier: e.target.value,
                          tier_multiplier: tObj?.points_multiplier || 1.0,
                        });
                      }}
                    >
                      {tiers.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.points_multiplier}×)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="adm-field">
                    <span>Account Status</span>
                    <select
                      value={editingMember.status}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          status: e.target.value as VipMember["status"],
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended (Blocks Referrals &amp; Redemption)</option>
                      <option value="frozen">Frozen (Under Fraud Investigation)</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" className="adm-btn ghost sm" onClick={() => setEditingMember(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="adm-btn primary sm"
                    onClick={() => handleSaveMemberEdit(editingMember)}
                  >
                    Save Profile &amp; Status ✓
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB D: REFERRAL MANAGEMENT & FRAUD REVIEW */}
      {activeTab === "referrals" && (
        <Card
          title="Referral Attribution, Conversions & Fraud Review"
          subtitle="Monitor every referral link conversion, associated order, reward status, and anti-fraud flags"
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "all", label: `All Referrals (${referrals.length})` },
              { id: "available", label: "Approved / Matured" },
              { id: "pending", label: "Pending Maturation" },
              { id: "reversed", label: "Reversed / Cancelled" },
              { id: "flagged", label: "⚠ Fraud Flagged" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`adm-btn sm ${referralStatusFilter === f.id ? "primary" : "ghost"}`}
                onClick={() => setReferralStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredReferrals.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--p-text-subdued)" }}>
              No referral records match the current filter.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <th style={{ padding: "10px 8px" }}>Date</th>
                    <th style={{ padding: "10px 8px" }}>Referral Code / Owner</th>
                    <th style={{ padding: "10px 8px" }}>Referred Customer</th>
                    <th style={{ padding: "10px 8px" }}>Event / Order</th>
                    <th style={{ padding: "10px 8px" }}>Points Reward</th>
                    <th style={{ padding: "10px 8px" }}>Status</th>
                    <th style={{ padding: "10px 8px" }}>Fraud Check</th>
                    <th style={{ padding: "10px 8px" }}>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                      <td style={{ padding: "10px 8px" }}>{r.created_at.slice(0, 10)}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.referral_code}</div>
                        <small style={{ color: "var(--p-text-subdued)" }}>{r.referrer_email || "VIP Referrer"}</small>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <b>{r.buyer_name}</b>
                        <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>{r.buyer_email}</div>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {r.order_number ? (
                          <div>
                            <b>Order #{r.order_number}</b> (৳{Number(r.order_total || 0).toLocaleString()})
                          </div>
                        ) : (
                          <span>VIP Account Signup</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: "#008060" }}>+{r.points_earned} PTS</td>
                      <td style={{ padding: "10px 8px" }}>
                        <span
                          className={`adm-tag ${
                            r.reward_status === "available"
                              ? "active"
                              : r.reward_status === "reversed"
                              ? "danger"
                              : "warning"
                          }`}
                        >
                          {r.reward_status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {r.fraud_flag ? (
                          <span className="adm-tag danger" title={r.fraud_reason || ""}>
                            ⚠ Flagged: {r.fraud_reason || "Review"}
                          </span>
                        ) : (
                          <span className="adm-tag active">✓ Clean</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {r.reward_status !== "reversed" && (
                            <button
                              type="button"
                              className="adm-btn danger sm"
                              onClick={() => {
                                adminReviewReferralRecord({
                                  recordId: r.id,
                                  action: "reverse",
                                  reason: "Manual admin reversal",
                                });
                                loadData();
                              }}
                            >
                              Reverse Reward
                            </button>
                          )}
                          {r.fraud_flag && (
                            <button
                              type="button"
                              className="adm-btn ghost sm"
                              onClick={() => {
                                adminReviewReferralRecord({ recordId: r.id, action: "clear_fraud" });
                                loadData();
                              }}
                            >
                              Clear Flag
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB E: IMMUTABLE POINTS TRANSACTION LEDGER */}
      {activeTab === "ledger" && (
        <Card
          title="Immutable Points Transaction Ledger"
          subtitle="Complete financial-grade audit trail of all points credits, redemptions, withdrawals, and compensating adjustments"
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search ledger by customer, email, order #, or note…"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            />
            <select
              value={ledgerFilterType}
              onChange={(e) => setLedgerFilterType(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            >
              <option value="all">All Transaction Types</option>
              <option value="welcome_bonus">Welcome Bonus</option>
              <option value="referral_matured">Referral Reward</option>
              <option value="order_earn">Order Purchase Earn</option>
              <option value="campaign_bonus">Campaign Bonus</option>
              <option value="points_redeemed">Checkout Redemption</option>
              <option value="points_refunded">Redemption Refund</option>
              <option value="withdrawal_locked">Withdrawal Requested</option>
              <option value="withdrawal_paid">Withdrawal Paid</option>
              <option value="withdrawal_refunded">Withdrawal Refunded</option>
              <option value="admin_adjustment">Admin Adjustment</option>
              <option value="order_cancelled">Order Cancelled Reversal</option>
            </select>
          </div>

          {filteredLedger.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--p-text-subdued)" }}>
              No points ledger transactions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <th style={{ padding: "10px 8px" }}>Date / Time</th>
                    <th style={{ padding: "10px 8px" }}>Customer</th>
                    <th style={{ padding: "10px 8px" }}>Type</th>
                    <th style={{ padding: "10px 8px" }}>Reference</th>
                    <th style={{ padding: "10px 8px" }}>Description</th>
                    <th style={{ padding: "10px 8px" }}>Points Delta</th>
                    <th style={{ padding: "10px 8px" }}>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 11 }}>
                        {tx.created_at.slice(0, 19).replace("T", " ")}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <b>{tx.member_name}</b>
                        <div style={{ fontSize: 10, color: "var(--p-text-subdued)" }}>{tx.member_email}</div>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span className="adm-tag info">{tx.transaction_type}</span>
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>{tx.reference_id || "—"}</td>
                      <td style={{ padding: "10px 8px" }}>{tx.note}</td>
                      <td
                        style={{
                          padding: "10px 8px",
                          fontWeight: 700,
                          color: tx.amount >= 0 ? "#008060" : "#dc2626",
                        }}
                      >
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                      </td>
                      <td style={{ padding: "10px 8px", fontWeight: 700 }}>{tx.balance_after} PTS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB F: ADVANCED 12-TYPE CAMPAIGN BUILDER */}
      {activeTab === "campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="Dynamic Promotional Campaign Builder (12 Campaign Types)"
            subtitle="Create unlimited bonus points, 2×/3× multipliers, seasonal drops, and spend-threshold rewards without code changes"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>
                Active campaigns automatically stack by priority during registration and checkout.
              </span>
              <button
                type="button"
                className="adm-btn primary"
                onClick={() =>
                  setEditingCampaign({
                    id: "camp-" + Date.now().toString(36),
                    name: "",
                    description: "",
                    campaign_type: "seasonal_festival",
                    status: "active",
                    reward_type: "points",
                    reward_value: 200,
                    min_order_bdt: 2000,
                    eligible_tiers: ["Silver", "Gold", "Platinum", "Diamond"],
                    target_handles: [],
                    usage_limit: null,
                    per_user_limit: 1,
                    times_claimed: 0,
                    total_points_issued: 0,
                    priority: 15,
                    stackable: true,
                    starts_at: new Date().toISOString().slice(0, 10),
                    ends_at: null,
                    created_at: new Date().toISOString(),
                  })
                }
              >
                + Create New Campaign
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    background: "#f9fafb",
                    border: "1px solid var(--p-border-subdued)",
                    borderRadius: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <b style={{ fontSize: 14 }}>{c.name}</b>
                      <span
                        className={`adm-tag ${
                          c.status === "active" ? "active" : c.status === "paused" ? "warning" : "info"
                        }`}
                      >
                        {c.status}
                      </span>
                      <span className="adm-tag info">{c.campaign_type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--p-text-subdued)", marginBottom: 6 }}>{c.description}</div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>
                      Reward:{" "}
                      <b>
                        {c.reward_type === "multiplier"
                          ? `${c.reward_value}× Points Multiplier`
                          : c.reward_type === "points"
                          ? `+${c.reward_value} ANNR Points`
                          : `${c.reward_value}% Discount`}
                      </b>{" "}
                      · Min Order: <b>৳{c.min_order_bdt.toLocaleString()}</b> · Priority: <b>{c.priority}</b> · Eligible
                      Tiers: <b>{c.eligible_tiers.join(", ")}</b>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="adm-btn ghost sm"
                      onClick={() => setEditingCampaign({ ...c })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="adm-btn ghost sm"
                      onClick={() => handleDuplicateCampaign(c)}
                    >
                      Duplicate
                    </button>
                    {c.status === "active" ? (
                      <button
                        type="button"
                        className="adm-btn danger sm"
                        onClick={() => handleToggleCampaignStatus(c.id, "paused")}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-btn primary sm"
                        onClick={() => handleToggleCampaignStatus(c.id, "active")}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {editingCampaign && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 100,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    maxWidth: 600,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>Configure Loyalty Campaign</h2>
                  <div className="adm-grid" style={{ marginBottom: 16 }}>
                    <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                      <span>Campaign Name *</span>
                      <input
                        type="text"
                        placeholder="e.g. Eid Double Points Festival"
                        value={editingCampaign.name}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                      />
                    </label>
                    <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                      <span>Campaign Description</span>
                      <input
                        type="text"
                        placeholder="Shown to VIP members inside their Campaign Hub"
                        value={editingCampaign.description}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Campaign Type (12 Types)</span>
                      <select
                        value={editingCampaign.campaign_type}
                        onChange={(e) =>
                          setEditingCampaign({ ...editingCampaign, campaign_type: e.target.value as CampaignType })
                        }
                      >
                        {CAMPAIGN_TYPE_LABELS.map((ct) => (
                          <option key={ct.value} value={ct.value}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="adm-field">
                      <span>Status</span>
                      <select
                        value={editingCampaign.status}
                        onChange={(e) =>
                          setEditingCampaign({
                            ...editingCampaign,
                            status: e.target.value as LoyaltyCampaign["status"],
                          })
                        }
                      >
                        <option value="active">Active (Live)</option>
                        <option value="paused">Paused</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="adm-field">
                      <span>Reward Mode</span>
                      <select
                        value={editingCampaign.reward_type}
                        onChange={(e) =>
                          setEditingCampaign({
                            ...editingCampaign,
                            reward_type: e.target.value as LoyaltyCampaign["reward_type"],
                          })
                        }
                      >
                        <option value="points">Bonus ANNR Points (+PTS)</option>
                        <option value="multiplier">Points Multiplier (e.g. 2× / 3×)</option>
                        <option value="discount_percent">VIP Percentage Discount (%)</option>
                        <option value="discount_fixed">VIP Fixed Taka Discount (৳)</option>
                      </select>
                    </label>
                    <label className="adm-field">
                      <span>Reward Value</span>
                      <input
                        type="number"
                        min={1}
                        value={editingCampaign.reward_value}
                        onChange={(e) =>
                          setEditingCampaign({ ...editingCampaign, reward_value: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="adm-field">
                      <span>Minimum Order Value (৳)</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={editingCampaign.min_order_bdt}
                        onChange={(e) =>
                          setEditingCampaign({ ...editingCampaign, min_order_bdt: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="adm-field">
                      <span>Execution Priority</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editingCampaign.priority}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, priority: Number(e.target.value) })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Start Date</span>
                      <input
                        type="date"
                        value={editingCampaign.starts_at || ""}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, starts_at: e.target.value || null })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Expiration Date (Optional)</span>
                      <input
                        type="date"
                        value={editingCampaign.ends_at || ""}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, ends_at: e.target.value || null })}
                      />
                    </label>
                  </div>

                  <label className="adm-check" style={{ marginBottom: 16 }}>
                    <input
                      type="checkbox"
                      checked={editingCampaign.stackable}
                      onChange={(e) => setEditingCampaign({ ...editingCampaign, stackable: e.target.checked })}
                    />
                    <span>Stackable with other active campaigns</span>
                  </label>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button type="button" className="adm-btn ghost sm" onClick={() => setEditingCampaign(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="adm-btn primary sm"
                      onClick={() => handleSaveCampaign(editingCampaign)}
                    >
                      Save &amp; Validate Campaign ✓
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB G: VIP MEMBERSHIP TIERS */}
      {activeTab === "tiers" && (
        <Card
          title="VIP Membership Tiers & Qualification Rules"
          subtitle="Configure Silver, Gold, Platinum, Diamond & custom tiers with automatic progression multipliers and perks"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "var(--p-text-subdued)" }}>
              Members automatically upgrade when they meet any tier's earned points, referrals, or lifetime spend threshold.
            </span>
            <button
              type="button"
              className="adm-btn primary sm"
              onClick={() =>
                setEditingTier({
                  id: "tier-" + Date.now().toString(36),
                  name: "Black",
                  rank_order: tiers.length + 1,
                  badge_color: "#f43f5e",
                  description: "Invite-only ultra tier with 2.5× points & private concierge.",
                  min_earned_points: 7500,
                  min_referrals: 30,
                  min_lifetime_spend_bdt: 100000,
                  points_multiplier: 2.5,
                  tier_discount_percent: 15,
                  perks: ["2.5× Points Multiplier", "15% Extra VIP Discount", "Free Shipping Nationwide"],
                  active: true,
                })
              }
            >
              + Add Membership Tier
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {tiers.map((t) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid var(--p-border-subdued)",
                  borderTop: `3px solid ${t.badge_color || "#111"}`,
                  borderRadius: 6,
                  padding: 16,
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      Rank #{t.rank_order}: {t.name}
                    </h3>
                    <span className="adm-tag info">{t.points_multiplier}× Points</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--p-text-subdued)", margin: "6px 0 12px" }}>{t.description}</p>
                  <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    <div>
                      Min Earned Points: <b>{t.min_earned_points.toLocaleString()} PTS</b>
                    </div>
                    <div>
                      Min Referrals: <b>{t.min_referrals} referrals</b>
                    </div>
                    <div>
                      Min Lifetime Spend: <b>৳{t.min_lifetime_spend_bdt.toLocaleString()}</b>
                    </div>
                    <div>
                      Extra Tier Discount: <b>{t.tier_discount_percent}% OFF</b>
                    </div>
                  </div>
                </div>
                <button type="button" className="adm-btn ghost sm" onClick={() => setEditingTier({ ...t })}>
                  Configure Tier
                </button>
              </div>
            ))}
          </div>

          {editingTier && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 16,
              }}
            >
              <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 520, width: "100%" }}>
                <h2 style={{ marginTop: 0 }}>Configure VIP Tier: {editingTier.name}</h2>
                <div className="adm-grid" style={{ marginBottom: 16 }}>
                  <label className="adm-field">
                    <span>Tier Name *</span>
                    <input
                      type="text"
                      value={editingTier.name}
                      onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Rank Order (1 = Entry)</span>
                    <input
                      type="number"
                      min={1}
                      value={editingTier.rank_order}
                      onChange={(e) => setEditingTier({ ...editingTier, rank_order: Number(e.target.value) })}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Points Multiplier (e.g. 1.25)</span>
                    <input
                      type="number"
                      min={1}
                      step={0.05}
                      value={editingTier.points_multiplier}
                      onChange={(e) => setEditingTier({ ...editingTier, points_multiplier: Number(e.target.value) })}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Tier Extra Discount (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={editingTier.tier_discount_percent}
                      onChange={(e) =>
                        setEditingTier({ ...editingTier, tier_discount_percent: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="adm-field">
                    <span>Min Earned Points to Qualify</span>
                    <input
                      type="number"
                      min={0}
                      value={editingTier.min_earned_points}
                      onChange={(e) => setEditingTier({ ...editingTier, min_earned_points: Number(e.target.value) })}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Min Successful Referrals</span>
                    <input
                      type="number"
                      min={0}
                      value={editingTier.min_referrals}
                      onChange={(e) => setEditingTier({ ...editingTier, min_referrals: Number(e.target.value) })}
                    />
                  </label>
                  <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                    <span>Min Lifetime Spend (৳)</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={editingTier.min_lifetime_spend_bdt}
                      onChange={(e) =>
                        setEditingTier({ ...editingTier, min_lifetime_spend_bdt: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                    <span>Description</span>
                    <input
                      type="text"
                      value={editingTier.description}
                      onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                    />
                  </label>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" className="adm-btn ghost sm" onClick={() => setEditingTier(null)}>
                    Cancel
                  </button>
                  <button type="button" className="adm-btn primary sm" onClick={() => handleSaveTier(editingTier)}>
                    Save Tier ✓
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB H: WITHDRAWAL QUEUE */}
      {activeTab === "withdrawals" && (
        <Card title="Customer Withdrawal Requests Queue" subtitle="Verify and process MFS cash-out disbursements">
          {withdrawals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--p-text-subdued)" }}>
              No withdrawal requests submitted yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <th style={{ padding: "10px 8px" }}>Req #</th>
                    <th style={{ padding: "10px 8px" }}>Customer</th>
                    <th style={{ padding: "10px 8px" }}>Payout Method</th>
                    <th style={{ padding: "10px 8px" }}>Account #</th>
                    <th style={{ padding: "10px 8px" }}>Points</th>
                    <th style={{ padding: "10px 8px" }}>Money (৳)</th>
                    <th style={{ padding: "10px 8px" }}>Status</th>
                    <th style={{ padding: "10px 8px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 700 }}>#{w.request_number}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <div>
                          <b>{w.vip_members?.full_name || "VIP Member"}</b>
                        </div>
                        <small style={{ color: "var(--p-text-subdued)" }}>
                          {w.vip_members?.phone || w.account_number}
                        </small>
                      </td>
                      <td style={{ padding: "10px 8px", textTransform: "uppercase", fontWeight: 600 }}>
                        {w.payout_method}
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>{w.account_number}</td>
                      <td style={{ padding: "10px 8px" }}>{w.points_amount} pts</td>
                      <td style={{ padding: "10px 8px", fontWeight: 700 }}>৳{w.money_amount_bdt}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <span
                          className={`adm-tag ${
                            w.status === "paid" ? "active" : w.status === "rejected" ? "danger" : "warning"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {w.status === "pending" || w.status === "approved" ? (
                          <button
                            type="button"
                            className="adm-btn primary sm"
                            onClick={() => setSelectedRequest(w)}
                          >
                            Process →
                          </button>
                        ) : (
                          <small style={{ color: "var(--p-text-subdued)" }}>
                            {w.transaction_ref ? `Trx: ${w.transaction_ref}` : "Finalized"}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedRequest && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 24,
                  borderRadius: 8,
                  maxWidth: 480,
                  width: "100%",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
              >
                <h2>Process Withdrawal #{selectedRequest.request_number}</h2>
                <div style={{ margin: "14px 0", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    Amount: <b>৳{selectedRequest.money_amount_bdt}</b> ({selectedRequest.points_amount} points)
                  </div>
                  <div>
                    Method: <b style={{ textTransform: "uppercase" }}>{selectedRequest.payout_method}</b>
                  </div>
                  <div>
                    Account: <b style={{ fontFamily: "monospace" }}>{selectedRequest.account_number}</b>
                  </div>
                  {selectedRequest.account_name && (
                    <div>
                      Name: <b>{selectedRequest.account_name}</b>
                    </div>
                  )}
                </div>

                <label className="adm-field" style={{ marginBottom: 12 }}>
                  <span>Disbursement TrxID / Reference (Required for 'Mark Paid')</span>
                  <input
                    type="text"
                    placeholder="e.g. 9K28JS91"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                  />
                </label>

                <label className="adm-field" style={{ marginBottom: 16 }}>
                  <span>Admin notes</span>
                  <input
                    type="text"
                    placeholder="Optional note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <button
                    type="button"
                    className="adm-btn danger sm"
                    disabled={!!processingId}
                    onClick={() => handleProcessWithdrawal(selectedRequest, "rejected")}
                  >
                    Reject &amp; Refund Points
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="adm-btn ghost sm"
                      onClick={() => setSelectedRequest(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="adm-btn primary sm"
                      disabled={!!processingId}
                      onClick={() => handleProcessWithdrawal(selectedRequest, "paid")}
                    >
                      Mark as Paid ✓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB I: BALL DROP CAMPAIGN CONTROLLER */}
      {activeTab === "balldrop" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="Interactive Ball Drop Campaign Controller"
            subtitle="Complete ON/OFF toggle, copy editing, model image, and landing prize slot configuration"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: settings.ball_drop_enabled ? "rgba(34, 197, 94, 0.08)" : "#f4f4f5",
                  border: `1px solid ${settings.ball_drop_enabled ? "#22c55e" : "#d4d4d8"}`,
                  padding: "16px 20px",
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: settings.ball_drop_enabled ? "#22c55e" : "#71717a",
                        display: "inline-block",
                      }}
                    />
                    <strong style={{ fontSize: 15 }}>
                      {settings.ball_drop_enabled
                        ? "Campaign is LIVE & Active on Storefront"
                        : "Campaign is OFF (Disabled)"}
                    </strong>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.8 }}>
                    {settings.ball_drop_enabled
                      ? "The split-screen TAP TO DROP mini-game is visible to store visitors."
                      : "The campaign is hidden and will not trigger or appear on the storefront."}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <button
                    type="button"
                    disabled={loading}
                    className={`adm-btn ${settings.ball_drop_enabled ? "danger" : "primary"}`}
                    style={{ minWidth: 160, fontWeight: 700, padding: "10px 18px", fontSize: 13 }}
                    onClick={async () => {
                      const nextEnabled = !settings.ball_drop_enabled;
                      const updated = { ...settings, ball_drop_enabled: nextEnabled };
                      setSettings(updated);
                      setLoading(true);
                      await saveLoyaltySettings(updated);
                      try {
                        setSite("ballDrop", {
                          ...updated.ball_drop_config,
                          enabled: nextEnabled,
                        } as any);
                        publish();
                      } catch {}
                      setLoading(false);
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 3000);
                    }}
                  >
                    {settings.ball_drop_enabled ? "🛑 STOP / TURN OFF NOW" : "⚡ ACTIVATE / TURN ON NOW"}
                  </button>
                </div>
              </div>

              <div className="adm-grid">
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.ball_drop_config?.autoPopup)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ball_drop_config: { ...settings.ball_drop_config, autoPopup: e.target.checked },
                      })
                    }
                  />
                  <span>Auto-popup on visitor page load</span>
                </label>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.ball_drop_config?.showFloatingTrigger)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ball_drop_config: { ...settings.ball_drop_config, showFloatingTrigger: e.target.checked },
                      })
                    }
                  />
                  <span>Show bottom-right launcher badge (⚡ BALL DROP)</span>
                </label>
                <label className="adm-field">
                  <span>Main Heading</span>
                  <input
                    type="text"
                    value={settings.ball_drop_config?.title || "TAP TO DROP"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ball_drop_config: { ...settings.ball_drop_config, title: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="adm-field">
                  <span>Button Label</span>
                  <input
                    type="text"
                    value={settings.ball_drop_config?.buttonText || "TRY YOUR LUCK"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ball_drop_config: { ...settings.ball_drop_config, buttonText: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB J: REPORTS, NOTIFICATIONS & CSV EXPORT */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="1-Click Financial & Loyalty CSV Exports"
            subtitle="Export complete audit-ready spreadsheets for accounting, referral attribution, and campaign ROI"
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="adm-btn primary"
                onClick={() =>
                  downloadCsv(
                    "annr-vip-members.csv",
                    ["Name", "Email", "Phone", "Division", "District", "Tier", "Referral Code", "Available PTS", "Lifetime PTS", "Referrals", "Status"],
                    members.map((m) => [
                      m.full_name,
                      m.email,
                      m.phone,
                      m.division,
                      m.district,
                      m.tier,
                      m.referral_code,
                      m.available_points,
                      m.total_earned_points,
                      m.friends_referred || 0,
                      m.status,
                    ])
                  )
                }
              >
                ⬇ Export VIP Members CSV
              </button>

              <button
                type="button"
                className="adm-btn ghost"
                onClick={() =>
                  downloadCsv(
                    "annr-points-ledger.csv",
                    ["Date", "Member Name", "Email", "Type", "Reference", "Points Delta", "Balance After", "Note"],
                    ledger.map((tx) => [
                      tx.created_at,
                      tx.member_name,
                      tx.member_email,
                      tx.transaction_type,
                      tx.reference_id || "",
                      tx.amount,
                      tx.balance_after,
                      tx.note,
                    ])
                  )
                }
              >
                ⬇ Export Points Ledger CSV
              </button>

              <button
                type="button"
                className="adm-btn ghost"
                onClick={() =>
                  downloadCsv(
                    "annr-referrals-report.csv",
                    ["Date", "Referral Code", "Referrer Email", "Referred Buyer", "Buyer Email", "Order #", "Order Total", "Points", "Status", "Fraud Flag"],
                    referrals.map((r) => [
                      r.created_at,
                      r.referral_code,
                      r.referrer_email,
                      r.buyer_name,
                      r.buyer_email,
                      r.order_number || "Signup",
                      r.order_total,
                      r.points_earned,
                      r.reward_status,
                      r.fraud_flag ? "FLAGGED" : "CLEAN",
                    ])
                  )
                }
              >
                ⬇ Export Referrals Report CSV
              </button>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <Card title="Immutable Admin Loyalty Audit Log" subtitle="Every manual point adjustment, setting update, and referral review">
              {adminLogs.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "var(--p-text-subdued)" }}>
                  No admin loyalty actions logged yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {adminLogs.map((al) => (
                    <div
                      key={al.id}
                      style={{
                        padding: "8px 10px",
                        background: "#f9fafb",
                        border: "1px solid var(--p-border-subdued)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <b>{al.action_type}</b>{" "}
                        {al.target_email ? `→ ${al.target_email}` : ""}{" "}
                        {al.points_delta ? `(${al.points_delta > 0 ? `+${al.points_delta}` : al.points_delta} PTS)` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>{al.reason}</div>
                      <small style={{ color: "var(--p-text-subdued)" }}>
                        {al.created_at.slice(0, 19).replace("T", " ")} · by {al.admin_email}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Customer Loyalty Notifications Feed" subtitle="Automated notifications sent for earned points, referrals, tier upgrades & campaigns">
              {notifications.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "var(--p-text-subdued)" }}>
                  No customer notifications dispatched yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "8px 10px",
                        background: "#f9fafb",
                        border: "1px solid var(--p-border-subdued)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <b>{n.title}</b> <span className="adm-tag info">{n.event_type}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>{n.message}</div>
                      <small style={{ color: "var(--p-text-subdued)" }}>
                        To: {n.member_email} · {n.created_at.slice(0, 19).replace("T", " ")}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
