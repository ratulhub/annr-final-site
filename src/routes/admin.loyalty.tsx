import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackBtn, Card } from "../admin/ui";
import { setSite, publish } from "../admin/store";
import {
  getLoyaltySettings,
  saveLoyaltySettings,
  getAdminWithdrawalRequests,
  processAdminWithdrawal,
  type LoyaltySettings,
  type WithdrawalRequest,
  type VipMember,
  DEFAULT_LOYALTY_SETTINGS,
} from "../lib/loyalty";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { BD_DIVISIONS } from "../lib/bangladesh-geo";

export const Route = createFileRoute("/admin/loyalty")({ component: LoyaltyAdmin });

function LoyaltyAdmin() {
  const [activeTab, setActiveTab] = useState<"settings" | "withdrawals" | "members" | "balldrop">("settings");
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [members, setMembers] = useState<VipMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [trxId, setTrxId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");

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

      if (isSupabaseConfigured()) {
        const { data: mData } = await supabase
          .from("vip_members")
          .select("*")
          .order("created_at", { ascending: false });
        if (mData) {
          setMembers(mData as VipMember[]);
        }
      } else {
        // Local demo VIP members
        setMembers([
          {
            id: "m-1",
            email: "ratul@example.com",
            full_name: "Ratul Ahmed",
            phone: "+8801712345678",
            is_whatsapp: true,
            division: "Dhaka",
            district: "Dhaka",
            upazila: "Dhanmondi",
            full_address: "House 12, Road 5, Dhanmondi",
            tier: "Gold",
            tier_multiplier: 1.25,
            available_points: 450,
            pending_points: 100,
            withdrawn_points: 200,
            total_earned_points: 750,
            referral_code: "VIP-RATUL88",
            status: "active",
            created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "m-2",
            email: "tanvir@example.com",
            full_name: "Tanvir Hossain",
            phone: "+8801898765432",
            is_whatsapp: true,
            division: "Chattogram",
            district: "Chattogram",
            upazila: "Agrabad",
            full_address: "CDA Ave, Agrabad",
            tier: "Silver",
            tier_multiplier: 1.0,
            available_points: 200,
            pending_points: 50,
            withdrawn_points: 0,
            total_earned_points: 250,
            referral_code: "VIP-TANVIR12",
            status: "active",
            created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
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
      // Reload withdrawals
      const updated = await getAdminWithdrawalRequests();
      setWithdrawals(updated);
    } else {
      alert("Error: " + (res.error || "Failed to process withdrawal"));
    }
  };

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
    return matchesSearch && matchesDiv;
  });

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BackBtn to="/admin" label="← Dashboard" />
          <div>
            <h1>VIP Loyalty, Points &amp; Referral Program</h1>
            <p className="adm-hint" style={{ margin: "2px 0 0" }}>
              Control member referral coupons, points-to-taka conversion, withdrawal approvals &amp; ball drop drops
            </p>
          </div>
        </div>
        <div className="adm-row" style={{ gap: 8 }}>
          <button
            type="button"
            className="adm-btn primary"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {savedSuccess ? "✓ Settings Saved" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="adm-stats">
        <div className="adm-stat">
          <span>VIP Members</span>
          <b>{members.length}</b>
          <small>{members.filter((m) => m.tier === "Gold" || m.tier === "Diamond").length} high-tier members</small>
        </div>
        <div className="adm-stat">
          <span>Point Value</span>
          <b>৳{settings.point_value_bdt}</b>
          <small>Per 1 VIP reward point</small>
        </div>
        <div className="adm-stat">
          <span>Pending Cashouts</span>
          <b style={{ color: pendingWithdrawalsCount > 0 ? "var(--p-warning)" : "inherit" }}>
            {pendingWithdrawalsCount}
          </b>
          <small>{pendingWithdrawalsCount > 0 ? "Action required in queue" : "All requests settled"}</small>
        </div>
        <div className="adm-stat">
          <span>Total Paid Out</span>
          <b>৳{totalWithdrawnBdt.toLocaleString()}</b>
          <small>Disbursed via bKash / Nagad / Bank</small>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="adm-tabs" style={{ borderBottom: "1px solid var(--p-border-subdued)", marginBottom: 20 }}>
        <button
          type="button"
          className={`adm-btn ${activeTab === "settings" ? "primary" : "ghost"}`}
          style={{ borderRadius: "6px 6px 0 0", borderBottom: activeTab === "settings" ? "2px solid #000" : "none" }}
          onClick={() => setActiveTab("settings")}
        >
          ⚙ Program &amp; Points Rules
        </button>
        <button
          type="button"
          className={`adm-btn ${activeTab === "withdrawals" ? "primary" : "ghost"}`}
          style={{ borderRadius: "6px 6px 0 0", position: "relative" }}
          onClick={() => setActiveTab("withdrawals")}
        >
          💸 Withdrawal Queue
          {pendingWithdrawalsCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: "#e10600",
                color: "#fff",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`adm-btn ${activeTab === "members" ? "primary" : "ghost"}`}
          style={{ borderRadius: "6px 6px 0 0" }}
          onClick={() => setActiveTab("members")}
        >
          👥 VIP Directory &amp; Wallets ({members.length})
        </button>
        <button
          type="button"
          className={`adm-btn ${activeTab === "balldrop" ? "primary" : "ghost"}`}
          style={{ borderRadius: "6px 6px 0 0" }}
          onClick={() => setActiveTab("balldrop")}
        >
          ⚡ Ball Drop Campaign Controller
        </button>
      </div>

      {/* TAB 1: Global Program Settings */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="VIP Referral Program Core Rules" subtitle="Configure how coupon owners earn points and withdraw taka">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={settings.program_enabled}
                  onChange={(e) => setSettings({ ...settings, program_enabled: e.target.checked })}
                />
                <span style={{ fontWeight: 600 }}>Enable VIP Referral &amp; Points Program across storefront</span>
              </label>

              <div className="adm-grid">
                <label className="adm-field">
                  <span>Reward earning mode</span>
                  <select
                    value={settings.reward_mode}
                    onChange={(e) => setSettings({ ...settings, reward_mode: e.target.value as any })}
                  >
                    <option value="fixed_points">Fixed Points per Order (e.g. 100 Points)</option>
                    <option value="percent_order">% of Total Order Value (e.g. 5%)</option>
                  </select>
                </label>

                {settings.reward_mode === "fixed_points" ? (
                  <label className="adm-field">
                    <span>Points awarded to coupon owner</span>
                    <input
                      type="number"
                      min={1}
                      value={settings.points_per_referral}
                      onChange={(e) => setSettings({ ...settings, points_per_referral: Number(e.target.value) })}
                    />
                  </label>
                ) : (
                  <label className="adm-field">
                    <span>% of Order Value awarded as points</span>
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
                  <span>Point Value in Real BDT (৳)</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={settings.point_value_bdt}
                    onChange={(e) => setSettings({ ...settings, point_value_bdt: Number(e.target.value) })}
                  />
                  <small className="adm-hint">e.g. 1.00 means 100 points = ৳100 cash withdrawal</small>
                </label>

                <label className="adm-field">
                  <span>Coupon code prefix</span>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.coupon_prefix}
                    onChange={(e) => setSettings({ ...settings, coupon_prefix: e.target.value.toUpperCase() })}
                  />
                  <small className="adm-hint">e.g. "VIP-" results in codes like VIP-RATUL88</small>
                </label>
              </div>
            </div>
          </Card>

          <Card title="Friend Discount &amp; Order Conditions" subtitle="The discount friends receive when entering the VIP referral coupon at checkout">
            <div className="adm-grid">
              <label className="adm-field">
                <span>Friend discount type</span>
                <select
                  value={settings.friend_discount_type}
                  onChange={(e) => setSettings({ ...settings, friend_discount_type: e.target.value as any })}
                >
                  <option value="percent">Percentage Discount (% OFF)</option>
                  <option value="fixed">Fixed Taka Discount (৳ OFF)</option>
                </select>
              </label>

              <label className="adm-field">
                <span>Friend discount amount</span>
                <input
                  type="number"
                  min={1}
                  value={settings.friend_discount_value}
                  onChange={(e) => setSettings({ ...settings, friend_discount_value: Number(e.target.value) })}
                />
                <small className="adm-hint">
                  {settings.friend_discount_type === "percent" ? "e.g. 10 = 10% OFF" : "e.g. 200 = ৳200 OFF"}
                </small>
              </label>

              <label className="adm-field">
                <span>Minimum order for coupon to activate (৳)</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={settings.min_order_for_coupon}
                  onChange={(e) => setSettings({ ...settings, min_order_for_coupon: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Pending days (Return window before payout)</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.pending_days_return_window}
                  onChange={(e) => setSettings({ ...settings, pending_days_return_window: Number(e.target.value) })}
                />
                <small className="adm-hint">Days after order delivery before points unlock to prevent return fraud</small>
              </label>
            </div>
          </Card>

          <Card title="Cash Withdrawal Policy" subtitle="Thresholds and allowed mobile financial services in Bangladesh">
            <div className="adm-grid">
              <label className="adm-field">
                <span>Minimum withdrawal amount (৳)</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={settings.min_withdrawal_bdt}
                  onChange={(e) => setSettings({ ...settings, min_withdrawal_bdt: Number(e.target.value) })}
                />
              </label>

              <label className="adm-field">
                <span>Maximum withdrawal per request (৳)</span>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={settings.max_withdrawal_bdt}
                  onChange={(e) => setSettings({ ...settings, max_withdrawal_bdt: Number(e.target.value) })}
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Withdrawal Queue */}
      {activeTab === "withdrawals" && (
        <Card title="Customer Withdrawal Requests Queue" subtitle="Verify and process cash-out disbursements">
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
                        <div><b>{w.vip_members?.full_name || "VIP Member"}</b></div>
                        <small style={{ color: "var(--p-text-subdued)" }}>{w.vip_members?.phone || w.account_number}</small>
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
                            w.status === "paid"
                              ? "active"
                              : w.status === "rejected"
                              ? "danger"
                              : "warning"
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

          {/* Process Modal */}
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
                  <div>Amount: <b>৳{selectedRequest.money_amount_bdt}</b> ({selectedRequest.points_amount} points)</div>
                  <div>Method: <b style={{ textTransform: "uppercase" }}>{selectedRequest.payout_method}</b></div>
                  <div>Account: <b style={{ fontFamily: "monospace" }}>{selectedRequest.account_number}</b></div>
                  {selectedRequest.account_name && <div>Name: <b>{selectedRequest.account_name}</b></div>}
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

      {/* TAB 3: VIP Members Directory */}
      {activeTab === "members" && (
        <Card title="VIP Customer Directory" subtitle="Browse member referral codes, balances, and geographical distribution">
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone, or coupon code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--p-border)" }}
            />
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
                  <th style={{ padding: "10px 8px" }}>Location (BD)</th>
                  <th style={{ padding: "10px 8px" }}>Referral Coupon</th>
                  <th style={{ padding: "10px 8px" }}>Tier</th>
                  <th style={{ padding: "10px 8px" }}>Available Points</th>
                  <th style={{ padding: "10px 8px" }}>Pending Points</th>
                  <th style={{ padding: "10px 8px" }}>Cash Value</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--p-border-subdued)" }}>
                    <td style={{ padding: "10px 8px" }}>
                      <div><b>{m.full_name}</b></div>
                      <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>
                        {m.email} · {m.phone} {m.is_whatsapp && <span title="WhatsApp Verified" style={{ color: "#25D366" }}>●</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <div>{m.district}, {m.division}</div>
                      {m.upazila && <div style={{ fontSize: 11, color: "var(--p-text-subdued)" }}>{m.upazila}</div>}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, padding: "2px 6px", background: "#f0f2f5", borderRadius: 4 }}>
                        {m.referral_code}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className="adm-tag info">{m.tier} ({m.tier_multiplier}×)</span>
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 700, color: "#008060" }}>
                      {m.available_points} pts
                    </td>
                    <td style={{ padding: "10px 8px", color: "var(--p-warning)" }}>
                      {m.pending_points} pts
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                      ৳{(m.available_points * settings.point_value_bdt).toFixed(0)}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className={`adm-tag ${m.status === "active" ? "active" : "danger"}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Ball Drop Campaign Controller */}
      {activeTab === "balldrop" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title="Interactive Ball Drop Campaign Controller"
            subtitle="Complete ON/OFF toggle, copy editing, model image, and landing prize slot configuration"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Master ON / OFF Switch */}
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
                      {settings.ball_drop_enabled ? "Campaign is LIVE & Active on Storefront" : "Campaign is OFF (Disabled)"}
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
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: settings.ball_drop_enabled ? "#16a34a" : "#dc2626" }}>
                    {settings.ball_drop_enabled ? "● LIVE (SYNCED TO DB)" : "● STOPPED (OFFLINE ON SITE)"}
                  </span>
                </div>
              </div>

              {/* Display & Trigger Settings */}
              <div style={{ borderTop: "1px solid var(--p-border-subdued)", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  1. Storefront Display Triggers
                </h3>
                <div className="adm-grid">
                  <label className="adm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.ball_drop_config?.autoPopup)}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ball_drop_config: {
                            ...settings.ball_drop_config,
                            autoPopup: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Auto-popup on visitor page load (Default: OFF to prevent annoyance)</span>
                  </label>

                  <label className="adm-field">
                    <span>Auto-popup delay (seconds)</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.ball_drop_config?.autoPopupDelay || 5}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ball_drop_config: {
                            ...settings.ball_drop_config,
                            autoPopupDelay: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>

                  <label className="adm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.ball_drop_config?.showFloatingTrigger)}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ball_drop_config: {
                            ...settings.ball_drop_config,
                            showFloatingTrigger: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Show bottom-right launcher badge (⚡ BALL DROP)</span>
                  </label>

                  <label className="adm-field">
                    <span>Plays per visitor session</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={settings.ball_drop_config?.playsPerCustomer || 1}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ball_drop_config: {
                            ...settings.ball_drop_config,
                            playsPerCustomer: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              {/* Creative Copy & Image Edit */}
              <div style={{ borderTop: "1px solid var(--p-border-subdued)", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  2. Campaign Creative Copy &amp; Model Banner Image
                </h3>
                <div className="adm-grid">
                  <label className="adm-field">
                    <span>Main Heading</span>
                    <input
                      type="text"
                      value={settings.ball_drop_config?.title || "TAP TO DROP"}
                      placeholder="e.g. TAP TO DROP"
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
                      placeholder="e.g. TRY YOUR LUCK"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ball_drop_config: { ...settings.ball_drop_config, buttonText: e.target.value },
                        })
                      }
                    />
                  </label>

                  <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                    <span>Model Photo / Banner Image (Right Column)</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        type="text"
                        style={{ flex: 1 }}
                        value={settings.ball_drop_config?.modelImage || "/cdn/shop/files/ball-drop-model.jpg"}
                        placeholder="/cdn/shop/files/ball-drop-model.jpg"
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            ball_drop_config: { ...settings.ball_drop_config, modelImage: e.target.value },
                          })
                        }
                      />
                      {settings.ball_drop_config?.modelImage && (
                        <img
                          src={settings.ball_drop_config.modelImage}
                          alt="Banner Preview"
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4, border: "1px solid #d4d4d8" }}
                          onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Prize Slots Editor */}
              <div style={{ borderTop: "1px solid var(--p-border-subdued)", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                    3. Landing Prize Slots ({settings.ball_drop_config?.prizes?.length || 0} Slots)
                  </h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="adm-btn plain"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={() => {
                        const defaultPrizes = [
                          { label: "Free item", code: "FREEGIFT", weight: 10 },
                          { label: "5% off", code: "LUCK5", weight: 35 },
                          { label: "Free shipping", code: "FREESHIP", weight: 20 },
                          { label: "৳500 off", code: "ANNR500", weight: 15 },
                          { label: "10% off", code: "LUCK10", weight: 20 },
                        ];
                        setSettings({
                          ...settings,
                          ball_drop_config: { ...settings.ball_drop_config, prizes: defaultPrizes },
                        });
                      }}
                    >
                      ↺ Restore Default Prizes
                    </button>
                    <button
                      type="button"
                      className="adm-btn primary"
                      style={{ fontSize: 11, padding: "4px 12px" }}
                      onClick={() => {
                        const cur = settings.ball_drop_config?.prizes || [];
                        const next = [...cur, { label: "15% off", code: "LUCK15", weight: 10 }];
                        setSettings({
                          ...settings,
                          ball_drop_config: { ...settings.ball_drop_config, prizes: next },
                        });
                      }}
                    >
                      + Add Prize Slot
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {settings.ball_drop_config?.prizes?.map((prize, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#f9fafb",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--p-border-subdued)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700, width: 28, fontSize: 13 }}>#{idx + 1}</span>
                      <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase" }}>Slot Label</span>
                        <input
                          type="text"
                          value={prize.label}
                          placeholder="e.g. Free item / 5% off / ৳500 off"
                          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid #d2d5d8" }}
                          onChange={(e) => {
                            const nextPrizes = [...(settings.ball_drop_config?.prizes || [])];
                            if (nextPrizes[idx]) {
                              nextPrizes[idx] = { ...nextPrizes[idx], label: e.target.value };
                              setSettings({
                                ...settings,
                                ball_drop_config: { ...settings.ball_drop_config, prizes: nextPrizes },
                              });
                            }
                          }}
                        />
                      </div>
                      <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase" }}>Coupon Code</span>
                        <input
                          type="text"
                          value={prize.code || ""}
                          placeholder="e.g. LUCK5"
                          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid #d2d5d8", fontFamily: "monospace", textTransform: "uppercase" }}
                          onChange={(e) => {
                            const nextPrizes = [...(settings.ball_drop_config?.prizes || [])];
                            if (nextPrizes[idx]) {
                              nextPrizes[idx] = { ...nextPrizes[idx], code: e.target.value.toUpperCase() };
                              setSettings({
                                ...settings,
                                ball_drop_config: { ...settings.ball_drop_config, prizes: nextPrizes },
                              });
                            }
                          }}
                        />
                      </div>
                      <div style={{ flex: "0 1 80px", minWidth: 70, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase" }}>Weight (%)</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={prize.weight}
                          style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid #d2d5d8" }}
                          onChange={(e) => {
                            const nextPrizes = [...(settings.ball_drop_config?.prizes || [])];
                            if (nextPrizes[idx]) {
                              nextPrizes[idx] = { ...nextPrizes[idx], weight: Number(e.target.value) };
                              setSettings({
                                ...settings,
                                ball_drop_config: { ...settings.ball_drop_config, prizes: nextPrizes },
                              });
                            }
                          }}
                        />
                      </div>
                      {((settings.ball_drop_config?.prizes?.length || 0) > 2) && (
                        <button
                          type="button"
                          className="adm-btn danger plain"
                          style={{ padding: "6px 8px", fontSize: 12, marginTop: 14 }}
                          onClick={() => {
                            const nextPrizes = (settings.ball_drop_config?.prizes || []).filter((_, i) => i !== idx);
                            setSettings({
                              ...settings,
                              ball_drop_config: { ...settings.ball_drop_config, prizes: nextPrizes },
                            });
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview of the Split-Screen Modal */}
              <div style={{ borderTop: "1px solid var(--p-border-subdued)", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  4. Live Storefront Mockup Preview
                </h3>
                <div
                  style={{
                    background: "#050505",
                    padding: "16px 12px",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      maxWidth: 720,
                      width: "100%",
                      background: "#111113",
                      border: "1px solid #27272a",
                      borderRadius: 4,
                      overflow: "hidden",
                      display: "flex",
                      flexWrap: "wrap",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
                    }}
                  >
                    {/* Left side: Plinko */}
                    <div
                      style={{
                        flex: "1 1 280px",
                        minWidth: 260,
                        padding: "24px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        color: "#fff",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ position: "absolute", top: 12, left: 14, fontSize: 18, opacity: 0.6 }}>✕</span>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                        <span
                          className="icon icon-logo"
                          style={{
                            display: "inline-block",
                            width: 100,
                            height: 38,
                            backgroundColor: "#ffffff",
                            WebkitMask: "url(/cdn/shop/t/75/assets/image_logo.svg) no-repeat center/contain",
                            mask: "url(/cdn/shop/t/75/assets/image_logo.svg) no-repeat center/contain",
                          }}
                        />
                      </div>
                      <div style={{ fontFamily: "Druk Wide, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                        {settings.ball_drop_config?.title || "TAP TO DROP"}
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          color: "#000",
                          borderRadius: 20,
                          padding: "6px 20px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          marginBottom: 14,
                        }}
                      >
                        {settings.ball_drop_config?.buttonText || "TRY YOUR LUCK"}
                      </div>
                      {/* Triangle dots */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, margin: "6px 0 16px" }}>
                        {[2, 3, 4, 5, 6, 7, 8].map((count, r) => (
                          <div key={r} style={{ display: "flex", gap: 14 }}>
                            {Array.from({ length: count }).map((_, c) => (
                              <span key={c} style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
                            ))}
                          </div>
                        ))}
                      </div>
                      {/* 5 slot labels */}
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", borderTop: "1px solid #27272a", paddingTop: 8 }}>
                        {settings.ball_drop_config?.prizes?.map((p, idx) => (
                          <span key={idx} style={{ fontSize: 8, opacity: 0.85, textTransform: "lowercase", textAlign: "center", flex: 1 }}>
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right side: Model Photo */}
                    <div style={{ flex: "1 1 240px", minWidth: 240, background: "#ffffff", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={settings.ball_drop_config?.modelImage || "/cdn/shop/files/ball-drop-model.jpg"}
                        alt="Model Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="adm-btn primary"
                  disabled={loading}
                  onClick={handleSaveSettings}
                  style={{ minWidth: 160 }}
                >
                  {savedSuccess ? "✓ Settings Saved & Published" : "Save Ball Drop Settings"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
