import { supabase, isSupabaseConfigured } from "./supabase";

export type VipTierName = "Silver" | "Gold" | "Platinum" | "Diamond" | "Black" | string;

export interface VipTierConfig {
  id: string;
  name: VipTierName;
  rank_order: number;
  badge_color: string;
  description: string;
  min_earned_points: number;
  min_referrals: number;
  min_lifetime_spend_bdt: number;
  points_multiplier: number;
  tier_discount_percent: number;
  perks: string[];
  active: boolean;
}

export type CampaignType =
  | "registration_bonus"
  | "referral_bonus"
  | "multiplier_points"
  | "seasonal_festival"
  | "birthday_reward"
  | "first_purchase"
  | "min_order_value"
  | "product_specific"
  | "category_specific"
  | "repeat_purchase"
  | "vip_discount"
  | "custom_manual";

export interface LoyaltyCampaign {
  id: string;
  name: string;
  description: string;
  campaign_type: CampaignType;
  status: "active" | "paused" | "scheduled" | "archived";
  reward_type: "points" | "multiplier" | "discount_percent" | "discount_fixed";
  reward_value: number;
  min_order_bdt: number;
  eligible_tiers: string[];
  target_handles: string[];
  usage_limit?: number | null;
  per_user_limit: number;
  times_claimed: number;
  total_points_issued: number;
  priority: number;
  stackable: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
}

export type LedgerTransactionType =
  | "welcome_bonus"
  | "referral_signup_bonus"
  | "referral_pending"
  | "referral_matured"
  | "order_earn"
  | "campaign_bonus"
  | "points_redeemed"
  | "points_refunded"
  | "withdrawal_locked"
  | "withdrawal_paid"
  | "withdrawal_refunded"
  | "admin_adjustment"
  | "points_expired"
  | "order_cancelled";

export interface PointsLedgerEntry {
  id: string;
  vip_member_id: string;
  member_email: string;
  member_name: string;
  amount: number; // positive = credit, negative = debit
  balance_after: number;
  transaction_type: LedgerTransactionType;
  reference_id?: string | null;
  campaign_id?: string | null;
  note: string;
  status: "completed" | "pending" | "reversed";
  created_by?: string | null;
  created_at: string;
}

export interface ReferralRecord {
  id: string;
  referral_code: string;
  referrer_member_id?: string;
  referrer_name?: string;
  referrer_email: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  order_id?: string | null;
  order_number?: string | number | null;
  order_total: number;
  discount_given_bdt: number;
  points_earned: number;
  event_type: "order" | "signup" | "click";
  attribution_status: "clicked" | "registered" | "converted" | "expired";
  reward_status: "pending" | "available" | "rejected" | "reversed";
  fraud_flag?: boolean;
  fraud_reason?: string | null;
  created_at: string;
}

export interface LoyaltyNotification {
  id: string;
  member_email: string;
  event_type:
    | "vip_activated"
    | "welcome_bonus"
    | "referral_success"
    | "points_earned"
    | "points_redeemed"
    | "coupon_applied"
    | "campaign_launched"
    | "tier_upgraded"
    | "points_expiring"
    | "reward_reversed"
    | "admin_adjustment";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LoyaltyAdminLog {
  id: string;
  admin_email: string;
  action_type: string;
  target_email?: string;
  target_name?: string;
  points_delta?: number;
  reason: string;
  created_at: string;
}

export interface LoyaltySettings {
  id: number;
  program_enabled: boolean;
  auto_activate_membership: boolean;
  default_tier: VipTierName;
  welcome_bonus_points: number;
  referral_signup_bonus_points: number;
  reward_mode: "fixed_points" | "percent_order";
  points_per_referral: number;
  percent_order_points: number;
  point_value_bdt: number;
  friend_discount_type: "percent" | "fixed";
  friend_discount_value: number;
  min_order_for_coupon: number;
  max_discount_bdt: number;
  first_order_only_referral: boolean;
  qualifying_order_status: "placed" | "paid" | "fulfilled";
  attribution_window_days: number;
  point_expiration_days: number;
  order_earn_enabled: boolean;
  points_per_100_bdt: number;
  redemption_enabled: boolean;
  min_redemption_points: number;
  max_redemption_points_order: number;
  max_redemption_percent_order: number;
  min_order_for_redemption: number;
  allow_points_with_coupon: boolean;
  min_withdrawal_bdt: number;
  max_withdrawal_bdt: number;
  pending_days_return_window: number;
  coupon_prefix: string;
  allowed_payout_methods: string[];
  notifications_enabled: boolean;
  ball_drop_enabled: boolean;
  ball_drop_config: {
    title: string;
    subtitle: string;
    buttonText: string;
    modelImage: string;
    autoPopup: boolean;
    autoPopupDelay: number;
    showFloatingTrigger: boolean;
    playsPerCustomer: number;
    prizes: { label: string; code?: string; points?: number; weight: number }[];
    theme: string;
  };
}

export interface VipMember {
  id: string;
  user_id?: string | null;
  email: string;
  full_name: string;
  phone: string;
  is_whatsapp: boolean;
  division: string;
  district: string;
  upazila?: string | null;
  full_address: string;
  date_of_birth?: string | null;
  gender?: string | null;
  tier: VipTierName;
  tier_multiplier: number;
  available_points: number;
  pending_points: number;
  redeemed_points?: number;
  withdrawn_points: number;
  expired_points?: number;
  total_earned_points: number;
  referral_points_earned?: number;
  campaign_points_earned?: number;
  welcome_points_earned?: number;
  admin_adjusted_points?: number;
  friends_referred?: number;
  lifetime_spend_bdt?: number;
  lifetime_orders?: number;
  referral_code: string;
  referred_by_code?: string | null;
  default_payout_method?: string | null;
  default_payout_account?: string | null;
  fraud_flagged?: boolean;
  fraud_notes?: string | null;
  status: "active" | "suspended" | "frozen";
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  request_number: number;
  vip_member_id: string;
  points_amount: number;
  money_amount_bdt: number;
  payout_method: "bkash" | "nagad" | "rocket" | "bank";
  account_number: string;
  account_name?: string | null;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_notes?: string | null;
  transaction_ref?: string | null;
  requested_at: string;
  processed_at?: string | null;
  vip_members?: { full_name: string; email: string; phone: string; tier: string };
}

export const DEFAULT_VIP_TIERS: VipTierConfig[] = [
  {
    id: "tier-silver",
    name: "Silver",
    rank_order: 1,
    badge_color: "#a1a1aa",
    description: "Entry VIP Membership with personal referral coupon, points redemption & instant MFS cashouts.",
    min_earned_points: 0,
    min_referrals: 0,
    min_lifetime_spend_bdt: 0,
    points_multiplier: 1.0,
    tier_discount_percent: 0,
    perks: ["100 Welcome ANNR Points", "Personal 10% OFF Referral Coupon", "Redeem Points at Checkout or MFS"],
    active: true,
  },
  {
    id: "tier-gold",
    name: "Gold",
    rank_order: 2,
    badge_color: "#f59e0b",
    description: "Accelerated 1.25× point earning & priority seasonal drop access.",
    min_earned_points: 500,
    min_referrals: 3,
    min_lifetime_spend_bdt: 10000,
    points_multiplier: 1.25,
    tier_discount_percent: 3,
    perks: ["1.25× Points Multiplier on Orders & Referrals", "3% Extra VIP Tier Discount", "Early Drop Access"],
    active: true,
  },
  {
    id: "tier-platinum",
    name: "Platinum",
    rank_order: 3,
    badge_color: "#38bdf8",
    description: "High-velocity referrer tier with 1.5× points & exclusive festival rewards.",
    min_earned_points: 1500,
    min_referrals: 8,
    min_lifetime_spend_bdt: 25000,
    points_multiplier: 1.5,
    tier_discount_percent: 5,
    perks: ["1.5× Points Multiplier", "5% Extra VIP Tier Discount", "Priority MFS Payout Processing"],
    active: true,
  },
  {
    id: "tier-diamond",
    name: "Diamond",
    rank_order: 4,
    badge_color: "#c084fc",
    description: "Top-echelon ANNR royalty with 2.0× double points & private vault privileges.",
    min_earned_points: 3500,
    min_referrals: 15,
    min_lifetime_spend_bdt: 50000,
    points_multiplier: 2.0,
    tier_discount_percent: 10,
    perks: ["2.0× Double Points Multiplier", "10% Extra VIP Tier Discount", "Dedicated VIP Concierge & Birthday Gift"],
    active: true,
  },
];

export const DEFAULT_LOYALTY_CAMPAIGNS: LoyaltyCampaign[] = [
  {
    id: "camp-welcome-100",
    name: "VIP Vault Welcome Grant",
    description: "Every new VIP member automatically receives 100 ANNR Points (৳100 value) upon registration.",
    campaign_type: "registration_bonus",
    status: "active",
    reward_type: "points",
    reward_value: 100,
    min_order_bdt: 0,
    eligible_tiers: ["Silver", "Gold", "Platinum", "Diamond", "Black"],
    target_handles: [],
    usage_limit: null,
    per_user_limit: 1,
    times_claimed: 14,
    total_points_issued: 1400,
    priority: 10,
    stackable: true,
    starts_at: "2026-01-01",
    ends_at: null,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "camp-spend-5000",
    name: "Heavyweight Spend Bonus (৳5,000+)",
    description: "Earn +150 Bonus ANNR Points automatically on any order above ৳5,000.",
    campaign_type: "min_order_value",
    status: "active",
    reward_type: "points",
    reward_value: 150,
    min_order_bdt: 5000,
    eligible_tiers: ["Silver", "Gold", "Platinum", "Diamond", "Black"],
    target_handles: [],
    usage_limit: null,
    per_user_limit: 10,
    times_claimed: 6,
    total_points_issued: 900,
    priority: 20,
    stackable: true,
    starts_at: "2026-01-01",
    ends_at: null,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "camp-double-points-weekend",
    name: "2× Double ANNR Points Drop",
    description: "Double ANNR Points on all qualifying purchases and referrals during special drops.",
    campaign_type: "multiplier_points",
    status: "paused",
    reward_type: "multiplier",
    reward_value: 2,
    min_order_bdt: 1500,
    eligible_tiers: ["Gold", "Platinum", "Diamond", "Black"],
    target_handles: [],
    usage_limit: 500,
    per_user_limit: 5,
    times_claimed: 0,
    total_points_issued: 0,
    priority: 30,
    stackable: false,
    starts_at: "2026-11-01",
    ends_at: "2026-12-31",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  id: 1,
  program_enabled: true,
  auto_activate_membership: true,
  default_tier: "Silver",
  welcome_bonus_points: 100,
  referral_signup_bonus_points: 0,
  reward_mode: "fixed_points",
  points_per_referral: 100,
  percent_order_points: 5.0,
  point_value_bdt: 1.0,
  friend_discount_type: "percent",
  friend_discount_value: 10.0,
  min_order_for_coupon: 1000.0,
  max_discount_bdt: 2000.0,
  first_order_only_referral: false,
  qualifying_order_status: "placed",
  attribution_window_days: 30,
  point_expiration_days: 365,
  order_earn_enabled: true,
  points_per_100_bdt: 2,
  redemption_enabled: true,
  min_redemption_points: 50,
  max_redemption_points_order: 2000,
  max_redemption_percent_order: 50.0,
  min_order_for_redemption: 500.0,
  allow_points_with_coupon: true,
  min_withdrawal_bdt: 100.0,
  max_withdrawal_bdt: 25000.0,
  pending_days_return_window: 0,
  coupon_prefix: "VIP-",
  allowed_payout_methods: ["bkash", "nagad", "rocket", "bank"],
  notifications_enabled: true,
  ball_drop_enabled: false,
  ball_drop_config: {
    title: "TAP TO DROP",
    subtitle: "Try your luck to unlock instant exclusive discounts and free items.",
    buttonText: "TRY YOUR LUCK",
    modelImage: "/cdn/shop/files/ball-drop-model.jpg",
    autoPopup: false,
    autoPopupDelay: 5,
    showFloatingTrigger: false,
    playsPerCustomer: 1,
    prizes: [
      { label: "Free item", code: "FREEGIFT", weight: 10 },
      { label: "5% off", code: "LUCK5", weight: 35 },
      { label: "Free shipping", code: "FREESHIP", weight: 20 },
      { label: "৳500 off", code: "ANNR500", weight: 15 },
      { label: "10% off", code: "LUCK10", weight: 20 },
    ],
    theme: "dark_cyberpunk",
  },
};

const LOCAL_VIP_KEY = "annr-vip-wallet-v1";
const LOCAL_SETTINGS_KEY = "annr-loyalty-settings-v1";
const LEGACY_SETTINGS_KEY = "annr-loyalty-settings";
const LOCAL_WITHDRAWALS_KEY = "annr-withdrawals-v1";
const LOCAL_MEMBERS_KEY = "annr-vip-members";
const LOCAL_TIERS_KEY = "annr-vip-tiers-v1";
const LOCAL_CAMPAIGNS_KEY = "annr-loyalty-campaigns-v1";
const LOCAL_LEDGER_KEY = "annr-points-ledger-v1";
const LOCAL_NOTIFICATIONS_KEY = "annr-loyalty-notifications-v1";
const LOCAL_ADMIN_LOGS_KEY = "annr-loyalty-admin-logs-v1";

/**
 * Fetch current loyalty settings (Supabase with localStorage fallback)
 */
export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        const res = { ...DEFAULT_LOYALTY_SETTINGS, ...(data as Partial<LoyaltySettings>) };
        try {
          const str = JSON.stringify(res);
          localStorage.setItem(LOCAL_SETTINGS_KEY, str);
          localStorage.setItem(LEGACY_SETTINGS_KEY, str);
        } catch {}
        return res;
      }
    } catch {
      // Fallback below
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_LOYALTY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Ignore error
  }
  return DEFAULT_LOYALTY_SETTINGS;
}

/**
 * Save loyalty settings (admin only)
 */
export async function saveLoyaltySettings(
  settings: Partial<LoyaltySettings>,
  adminEmail = "admin@annr.store"
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from("loyalty_settings")
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    } catch (e: any) {
      console.warn("Supabase loyalty_settings network notice:", e?.message);
    }
  }

  try {
    const current = await getLoyaltySettings();
    const updated = { ...current, ...settings };
    const str = JSON.stringify(updated);
    localStorage.setItem(LOCAL_SETTINGS_KEY, str);
    localStorage.setItem(LEGACY_SETTINGS_KEY, str);

    appendAdminLoyaltyLog({
      admin_email: adminEmail,
      action_type: "settings_updated",
      reason: "Updated global VIP Loyalty & Referral programme settings",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("annr:loyalty:updated", { detail: updated }));
      if (typeof (window as any).shihikoApply === "function") {
        (window as any).shihikoApply();
      }
    }
  } catch {}
  return { ok: true };
}

/**
 * VIP Tiers Management
 */
export function getVipTiers(): VipTierConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_TIERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.rank_order || 1) - (b.rank_order || 1));
      }
    }
  } catch {}
  return DEFAULT_VIP_TIERS;
}

export function saveVipTiers(tiers: VipTierConfig[], adminEmail = "admin@annr.store"): void {
  try {
    const sorted = [...tiers].sort((a, b) => (a.rank_order || 1) - (b.rank_order || 1));
    localStorage.setItem(LOCAL_TIERS_KEY, JSON.stringify(sorted));
    appendAdminLoyaltyLog({
      admin_email: adminEmail,
      action_type: "tiers_updated",
      reason: `Updated VIP membership tiers (${sorted.map((t) => t.name).join(", ")})`,
    });
  } catch {}
}

/**
 * Evaluate a member's qualification criteria against active VIP Tiers and auto-upgrade if eligible
 */
export function evaluateMemberTierLocally(member: VipMember): { upgraded: boolean; tier: VipTierConfig } {
  const tiers = getVipTiers().filter((t) => t.active);
  let matched = tiers[0] || DEFAULT_VIP_TIERS[0];

  const earned = Number(member.total_earned_points || member.available_points || 0);
  const refs = Number(member.friends_referred || 0);
  const spend = Number(member.lifetime_spend_bdt || 0);

  for (const t of tiers) {
    const meetsPoints = t.min_earned_points > 0 && earned >= t.min_earned_points;
    const meetsRefs = t.min_referrals > 0 && refs >= t.min_referrals;
    const meetsSpend = t.min_lifetime_spend_bdt > 0 && spend >= t.min_lifetime_spend_bdt;
    const isBase = t.min_earned_points === 0 && t.min_referrals === 0 && t.min_lifetime_spend_bdt === 0;

    if (isBase || meetsPoints || meetsRefs || meetsSpend) {
      if ((t.rank_order || 1) >= (matched.rank_order || 1)) {
        matched = t;
      }
    }
  }

  const prevTier = member.tier || "Silver";
  const upgraded = matched.name !== prevTier;
  member.tier = matched.name;
  member.tier_multiplier = matched.points_multiplier || 1.0;

  if (upgraded && member.email) {
    pushLoyaltyNotification({
      member_email: member.email,
      event_type: "tier_upgraded",
      title: `VIP Tier Upgraded to ${matched.name}!`,
      message: `Congratulations! You unlocked ${matched.name} Tier (${matched.points_multiplier}× Points Multiplier & ${matched.tier_discount_percent}% VIP discount).`,
    });
  }

  return { upgraded, tier: matched };
}

/**
 * Loyalty Campaigns Management (12 Campaign Types)
 */
export function getLoyaltyCampaigns(): LoyaltyCampaign[] {
  try {
    const raw = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_LOYALTY_CAMPAIGNS;
}

export function saveLoyaltyCampaigns(campaigns: LoyaltyCampaign[], adminEmail = "admin@annr.store"): void {
  try {
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(campaigns));
    appendAdminLoyaltyLog({
      admin_email: adminEmail,
      action_type: "campaigns_updated",
      reason: `Updated promotional loyalty campaigns (${campaigns.filter((c) => c.status === "active").length} active)`,
    });
  } catch {}
}

/**
 * Calculate active campaign bonus points for an order
 */
export function evaluateOrderCampaignBonuses(params: {
  orderSubtotal: number;
  memberTier?: string;
  isFirstOrder?: boolean;
  itemHandles?: string[];
  basePointsEarned: number;
}): { bonusPoints: number; appliedCampaigns: { id: string; name: string; points: number }[] } {
  const campaigns = getLoyaltyCampaigns()
    .filter((c) => c.status === "active")
    .sort((a, b) => (b.priority || 10) - (a.priority || 10));

  const now = Date.now();
  const tier = params.memberTier || "Silver";
  let bonusPoints = 0;
  const appliedCampaigns: { id: string; name: string; points: number }[] = [];

  for (const c of campaigns) {
    if (c.campaign_type === "registration_bonus" || c.campaign_type === "referral_bonus") continue;
    if (c.starts_at && new Date(c.starts_at).getTime() > now) continue;
    if (c.ends_at && new Date(c.ends_at).getTime() < now) continue;
    if (c.usage_limit && c.times_claimed >= c.usage_limit) continue;
    if (c.min_order_bdt > 0 && params.orderSubtotal < c.min_order_bdt) continue;
    if (Array.isArray(c.eligible_tiers) && c.eligible_tiers.length > 0 && !c.eligible_tiers.includes(tier)) continue;
    if (c.campaign_type === "first_purchase" && !params.isFirstOrder) continue;

    let pts = 0;
    if (c.reward_type === "points") {
      pts = Math.round(Number(c.reward_value || 0));
    } else if (c.reward_type === "multiplier" && c.reward_value > 1) {
      pts = Math.round(params.basePointsEarned * (Number(c.reward_value) - 1));
    }

    if (pts > 0) {
      bonusPoints += pts;
      appliedCampaigns.push({ id: c.id, name: c.name, points: pts });
      if (!c.stackable) break;
    }
  }

  return { bonusPoints, appliedCampaigns };
}

/**
 * Immutable Points Ledger Management
 */
export function getPointsLedger(memberEmail?: string): PointsLedgerEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEDGER_KEY);
    const list: PointsLedgerEntry[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (memberEmail) {
      const clean = memberEmail.toLowerCase().trim();
      return list.filter((e) => (e.member_email || "").toLowerCase().trim() === clean);
    }
    return list;
  } catch {
    return [];
  }
}

export function appendPointsLedgerEntry(entry: Omit<PointsLedgerEntry, "id" | "created_at">): PointsLedgerEntry {
  const fullEntry: PointsLedgerEntry = {
    ...entry,
    id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    created_at: new Date().toISOString(),
  };
  try {
    const current = getPointsLedger();
    current.unshift(fullEntry);
    localStorage.setItem(LOCAL_LEDGER_KEY, JSON.stringify(current.slice(0, 1000)));
  } catch {}
  return fullEntry;
}

/**
 * Customer Loyalty Notifications
 */
export function getLoyaltyNotifications(memberEmail?: string): LoyaltyNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    const list: LoyaltyNotification[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (memberEmail) {
      const clean = memberEmail.toLowerCase().trim();
      return list.filter((n) => (n.member_email || "").toLowerCase().trim() === clean);
    }
    return list;
  } catch {
    return [];
  }
}

export function pushLoyaltyNotification(
  n: Omit<LoyaltyNotification, "id" | "is_read" | "created_at">
): LoyaltyNotification {
  const item: LoyaltyNotification = {
    ...n,
    id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    is_read: false,
    created_at: new Date().toISOString(),
  };
  try {
    const list = getLoyaltyNotifications();
    list.unshift(item);
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {}
  return item;
}

/**
 * Immutable Admin Loyalty Audit Logs
 */
export function getLoyaltyAdminLogs(): LoyaltyAdminLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_LOGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function appendAdminLoyaltyLog(log: Omit<LoyaltyAdminLog, "id" | "created_at">): void {
  try {
    const list = getLoyaltyAdminLogs();
    list.unshift({
      ...log,
      id: "alog-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_ADMIN_LOGS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

/**
 * Admin Manual Point Adjustment (Requires Reason + Writes Compensating Ledger Transaction + Audit Log)
 */
export async function adminAdjustMemberPoints(params: {
  memberEmail: string;
  pointsDelta: number;
  reason: string;
  adminEmail?: string;
}): Promise<{ ok: boolean; updatedMember?: VipMember; error?: string }> {
  const delta = Math.round(Number(params.pointsDelta) || 0);
  const cleanReason = (params.reason || "").trim();
  if (delta === 0) {
    return { ok: false, error: "Points adjustment delta cannot be zero." };
  }
  if (cleanReason.length < 3) {
    return { ok: false, error: "A mandatory audit reason (min 3 characters) is required for manual point adjustments." };
  }

  const all = getAllLocalVipMembers();
  const target = all.find((m) => m.email.toLowerCase().trim() === params.memberEmail.toLowerCase().trim());
  if (!target) {
    return { ok: false, error: "VIP member not found." };
  }

  const newAvailable = Math.max(0, Number(target.available_points || 0) + delta);
  target.available_points = newAvailable;
  if (delta > 0) {
    target.total_earned_points = Number(target.total_earned_points || 0) + delta;
  }
  target.admin_adjusted_points = Number(target.admin_adjusted_points || 0) + delta;

  evaluateMemberTierLocally(target);
  syncMemberAcrossLocalStores(target);

  appendPointsLedgerEntry({
    vip_member_id: target.id,
    member_email: target.email,
    member_name: target.full_name,
    amount: delta,
    balance_after: newAvailable,
    transaction_type: "admin_adjustment",
    note: `Admin adjustment: ${cleanReason}`,
    status: "completed",
    created_by: params.adminEmail || "admin@annr.store",
  });

  appendAdminLoyaltyLog({
    admin_email: params.adminEmail || "admin@annr.store",
    action_type: delta > 0 ? "points_added" : "points_deducted",
    target_email: target.email,
    target_name: target.full_name,
    points_delta: delta,
    reason: cleanReason,
  });

  pushLoyaltyNotification({
    member_email: target.email,
    event_type: "admin_adjustment",
    title: delta > 0 ? `+${delta} ANNR Points Credited` : `${delta} ANNR Points Adjusted`,
    message: `${cleanReason} · Updated available balance: ${newAvailable} ANNR Points.`,
  });

  if (isSupabaseConfigured() && target.id && !target.id.startsWith("m-") && !target.id.startsWith("vip-") && !target.id.startsWith("local-")) {
    try {
      await supabase.rpc("admin_adjust_member_points", {
        p_member_id: target.id,
        p_points_delta: delta,
        p_reason: cleanReason,
      });
    } catch {}
  }

  return { ok: true, updatedMember: target };
}

/**
 * Sync a modified VipMember across all local storage keys so Storefront, Checkout, and Admin stay identical
 */
export function syncMemberAcrossLocalStores(updatedMember: VipMember): void {
  const emailKey = (updatedMember.email || "").toLowerCase().trim();
  if (!emailKey) return;

  try {
    const rawMembers = localStorage.getItem(LOCAL_MEMBERS_KEY);
    const list: VipMember[] = rawMembers ? JSON.parse(rawMembers) : [];
    const next = Array.isArray(list) ? list.filter((m) => (m.email || "").toLowerCase().trim() !== emailKey) : [];
    next.unshift(updatedMember);
    localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(next));
  } catch {}

  try {
    const rawAcc = localStorage.getItem("annr_vip_accounts_v1");
    if (rawAcc) {
      const accs = JSON.parse(rawAcc);
      for (const k of Object.keys(accs)) {
        if (accs[k]?.email?.toLowerCase().trim() === emailKey || accs[k]?.member?.email?.toLowerCase().trim() === emailKey) {
          accs[k].available_points = updatedMember.available_points;
          accs[k].member = { ...accs[k].member, ...updatedMember };
          if (accs[k].coupon && updatedMember.referral_code) {
            accs[k].coupon.code = updatedMember.referral_code;
          }
        }
      }
      localStorage.setItem("annr_vip_accounts_v1", JSON.stringify(accs));
    }
  } catch {}

  try {
    const rawSess = localStorage.getItem("annr_vip_member_session");
    if (rawSess) {
      const sess = JSON.parse(rawSess);
      if (sess?.member?.email?.toLowerCase().trim() === emailKey) {
        sess.member = { ...sess.member, ...updatedMember };
        if (sess.coupon && updatedMember.referral_code) {
          sess.coupon.code = updatedMember.referral_code;
        }
        localStorage.setItem("annr_vip_member_session", JSON.stringify(sess));
        localStorage.setItem("annr_vip_session", JSON.stringify(sess.member));
        localStorage.setItem(LOCAL_VIP_KEY, JSON.stringify(sess.member));
      }
    }
  } catch {}
}

/**
 * Checkout ANNR Points Redemption Calculator & Atomic Redeemer
 */
export async function calculateMaxRedeemablePoints(
  memberAvailablePoints: number,
  orderSubtotalBdt: number,
  hasCouponApplied: boolean
): Promise<{
  canRedeem: boolean;
  maxPoints: number;
  maxDiscountBdt: number;
  pointValueBdt: number;
  reason?: string;
}> {
  const settings = await getLoyaltySettings();
  const pv = Number(settings.point_value_bdt || 1.0);

  if (!settings.program_enabled || !settings.redemption_enabled) {
    return { canRedeem: false, maxPoints: 0, maxDiscountBdt: 0, pointValueBdt: pv, reason: "Points redemption is currently disabled." };
  }
  if (hasCouponApplied && !settings.allow_points_with_coupon) {
    return {
      canRedeem: false,
      maxPoints: 0,
      maxDiscountBdt: 0,
      pointValueBdt: pv,
      reason: "Points redemption cannot be combined with coupon codes.",
    };
  }
  if (orderSubtotalBdt < Number(settings.min_order_for_redemption || 0)) {
    return {
      canRedeem: false,
      maxPoints: 0,
      maxDiscountBdt: 0,
      pointValueBdt: pv,
      reason: `Minimum order of ৳${Number(settings.min_order_for_redemption).toLocaleString()} required to redeem points.`,
    };
  }
  const minPts = Number(settings.min_redemption_points || 50);
  if (memberAvailablePoints < minPts) {
    return {
      canRedeem: false,
      maxPoints: 0,
      maxDiscountBdt: 0,
      pointValueBdt: pv,
      reason: `Minimum ${minPts} ANNR Points required to redeem (you have ${memberAvailablePoints} PTS).`,
    };
  }

  const maxByOrderCap = Number(settings.max_redemption_points_order || 2000);
  const maxByPercentBdt = Math.floor(orderSubtotalBdt * (Number(settings.max_redemption_percent_order || 50) / 100));
  const maxByPercentPts = Math.floor(maxByPercentBdt / pv);

  const maxPoints = Math.max(0, Math.min(memberAvailablePoints, maxByOrderCap, maxByPercentPts));
  if (maxPoints < minPts) {
    return {
      canRedeem: false,
      maxPoints: 0,
      maxDiscountBdt: 0,
      pointValueBdt: pv,
      reason: `Order total allows up to ${maxPoints} PTS, below the ${minPts} PTS minimum.`,
    };
  }

  return {
    canRedeem: true,
    maxPoints,
    maxDiscountBdt: Math.round(maxPoints * pv),
    pointValueBdt: pv,
  };
}

export async function redeemMemberPointsForOrder(params: {
  memberEmail: string;
  pointsToRedeem: number;
  orderNumber: string | number;
  orderSubtotal: number;
}): Promise<{ ok: boolean; discountBdt: number; remainingPoints: number; error?: string }> {
  const pts = Math.floor(Number(params.pointsToRedeem) || 0);
  if (pts <= 0) return { ok: true, discountBdt: 0, remainingPoints: 0 };

  const settings = await getLoyaltySettings();
  const pv = Number(settings.point_value_bdt || 1.0);
  const all = getAllLocalVipMembers();
  const member = all.find((m) => m.email.toLowerCase().trim() === params.memberEmail.toLowerCase().trim());

  if (!member) {
    return { ok: false, discountBdt: 0, remainingPoints: 0, error: "VIP account not found for points redemption." };
  }
  if (member.status !== "active") {
    return { ok: false, discountBdt: 0, remainingPoints: member.available_points, error: `VIP account is ${member.status}.` };
  }
  if (pts > member.available_points) {
    return { ok: false, discountBdt: 0, remainingPoints: member.available_points, error: "Insufficient available ANNR Points." };
  }

  const discountBdt = Math.round(pts * pv);
  member.available_points = Math.max(0, member.available_points - pts);
  member.redeemed_points = Number(member.redeemed_points || 0) + pts;

  syncMemberAcrossLocalStores(member);

  appendPointsLedgerEntry({
    vip_member_id: member.id,
    member_email: member.email,
    member_name: member.full_name,
    amount: -pts,
    balance_after: member.available_points,
    transaction_type: "points_redeemed",
    reference_id: `#${params.orderNumber}`,
    note: `Redeemed ${pts} ANNR Points (-৳${discountBdt}) on Order #${params.orderNumber}`,
    status: "completed",
  });

  pushLoyaltyNotification({
    member_email: member.email,
    event_type: "points_redeemed",
    title: `Redeemed ${pts} ANNR Points (-৳${discountBdt})`,
    message: `Your ${pts} ANNR Points were applied to Order #${params.orderNumber}. Remaining balance: ${member.available_points} PTS.`,
  });

  return { ok: true, discountBdt, remainingPoints: member.available_points };
}

/**
 * Award purchase & campaign points to a VIP customer when they place an order
 */
export async function awardOrderLoyaltyPoints(params: {
  buyerEmail: string;
  buyerName: string;
  orderNumber: string | number;
  orderTotalBdt: number;
  itemHandles?: string[];
}): Promise<{ pointsEarned: number; campaignBonus: number }> {
  const settings = await getLoyaltySettings();
  if (!settings.program_enabled || !settings.order_earn_enabled) {
    return { pointsEarned: 0, campaignBonus: 0 };
  }

  const all = getAllLocalVipMembers();
  const member = all.find((m) => m.email.toLowerCase().trim() === params.buyerEmail.toLowerCase().trim());
  if (!member || member.status !== "active") {
    return { pointsEarned: 0, campaignBonus: 0 };
  }

  const isFirstOrder = Number(member.lifetime_orders || 0) === 0;
  const multiplier = Number(member.tier_multiplier || 1.0);
  const basePts = Math.floor((params.orderTotalBdt / 100) * Number(settings.points_per_100_bdt || 2) * multiplier);

  const campEval = evaluateOrderCampaignBonuses({
    orderSubtotal: params.orderTotalBdt,
    memberTier: member.tier,
    isFirstOrder,
    itemHandles: params.itemHandles,
    basePointsEarned: basePts,
  });

  const totalPts = basePts + campEval.bonusPoints;
  member.lifetime_spend_bdt = Number(member.lifetime_spend_bdt || 0) + params.orderTotalBdt;
  member.lifetime_orders = Number(member.lifetime_orders || 0) + 1;

  if (totalPts > 0) {
    member.available_points = Number(member.available_points || 0) + totalPts;
    member.total_earned_points = Number(member.total_earned_points || 0) + totalPts;
    member.campaign_points_earned = Number(member.campaign_points_earned || 0) + campEval.bonusPoints;

    if (basePts > 0) {
      appendPointsLedgerEntry({
        vip_member_id: member.id,
        member_email: member.email,
        member_name: member.full_name,
        amount: basePts,
        balance_after: member.available_points - campEval.bonusPoints,
        transaction_type: "order_earn",
        reference_id: `#${params.orderNumber}`,
        note: `Earned +${basePts} ANNR Points from Order #${params.orderNumber} (${member.tier} ${multiplier}×)`,
        status: "completed",
      });
    }

    for (const ac of campEval.appliedCampaigns) {
      appendPointsLedgerEntry({
        vip_member_id: member.id,
        member_email: member.email,
        member_name: member.full_name,
        amount: ac.points,
        balance_after: member.available_points,
        transaction_type: "campaign_bonus",
        reference_id: `#${params.orderNumber}`,
        campaign_id: ac.id,
        note: `Campaign Bonus (${ac.name}): +${ac.points} ANNR Points on Order #${params.orderNumber}`,
        status: "completed",
      });
    }

    pushLoyaltyNotification({
      member_email: member.email,
      event_type: "points_earned",
      title: `+${totalPts} ANNR Points Earned on Order #${params.orderNumber}`,
      message: `Thank you for shopping at AnnR! You earned +${totalPts} ANNR Points.`,
    });
  }

  evaluateMemberTierLocally(member);
  syncMemberAcrossLocalStores(member);

  return { pointsEarned: basePts, campaignBonus: campEval.bonusPoints };
}

/**
 * Register or login VIP member
 */
export async function registerVipMember(payload: {
  fullName: string;
  email: string;
  phone: string;
  division: string;
  district: string;
  upazila?: string;
  fullAddress?: string;
  isWhatsapp?: boolean;
  dateOfBirth?: string;
  gender?: string;
  referredBy?: string;
}): Promise<{ ok: boolean; member?: VipMember; coupon?: any; error?: string }> {
  const settings = await getLoyaltySettings();
  const welcomePts = Number(settings.welcome_bonus_points ?? 100);
  const prefix = (settings.coupon_prefix || "VIP-").toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("register_vip_member", {
        p_full_name: payload.fullName,
        p_email: payload.email,
        p_phone: payload.phone,
        p_division: payload.division,
        p_district: payload.district,
        p_upazila: payload.upazila || null,
        p_full_address: payload.fullAddress || "",
        p_is_whatsapp: payload.isWhatsapp !== false,
        p_dob: payload.dateOfBirth || null,
        p_gender: payload.gender || "prefer_not_to_say",
        p_referred_by: payload.referredBy || null,
      });

      if (!error && data?.ok && data.member) {
        const member = data.member as VipMember;
        syncMemberAcrossLocalStores(member);
        return { ok: true, member, coupon: data.coupon };
      }
    } catch {
      // Fallback to local
    }
  }

  const refCode =
    prefix +
    payload.fullName
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 5)
      .toUpperCase() +
    Math.floor(10 + Math.random() * 89);

  const fallbackMember: VipMember = {
    id: "vip-" + Date.now().toString(36),
    email: payload.email.toLowerCase().trim(),
    full_name: payload.fullName.trim(),
    phone: payload.phone.trim(),
    is_whatsapp: payload.isWhatsapp !== false,
    division: payload.division,
    district: payload.district,
    upazila: payload.upazila || "",
    full_address: payload.fullAddress || "",
    tier: settings.default_tier || "Silver",
    tier_multiplier: 1.0,
    available_points: welcomePts,
    pending_points: 0,
    redeemed_points: 0,
    withdrawn_points: 0,
    expired_points: 0,
    total_earned_points: welcomePts,
    welcome_points_earned: welcomePts,
    referral_points_earned: 0,
    campaign_points_earned: 0,
    friends_referred: 0,
    referral_code: refCode,
    referred_by_code: payload.referredBy || null,
    status: settings.auto_activate_membership !== false ? "active" : "suspended",
    created_at: new Date().toISOString(),
  };

  syncMemberAcrossLocalStores(fallbackMember);

  if (welcomePts > 0) {
    appendPointsLedgerEntry({
      vip_member_id: fallbackMember.id,
      member_email: fallbackMember.email,
      member_name: fallbackMember.full_name,
      amount: welcomePts,
      balance_after: welcomePts,
      transaction_type: "welcome_bonus",
      note: `VIP Welcome Grant (+${welcomePts} ANNR Points)`,
      status: "completed",
    });
  }

  return {
    ok: true,
    member: fallbackMember,
    coupon: {
      code: refCode,
      discount_value: settings.friend_discount_value,
      discount_type: settings.friend_discount_type,
    },
  };
}

/**
 * Helper to look up all known local VIP members across storage keys
 */
export function getAllLocalVipMembers(): VipMember[] {
  const map = new Map<string, VipMember>();
  try {
    const rawList = localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        for (const m of parsed) {
          if (m && m.email) map.set(m.email.toLowerCase().trim(), m);
        }
      }
    }
  } catch {}

  try {
    const rawAccounts = localStorage.getItem("annr_vip_accounts_v1");
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      if (parsed && typeof parsed === "object") {
        for (const k of Object.keys(parsed)) {
          const acc = parsed[k];
          const m = acc?.member;
          if (m && m.email) {
            const key = m.email.toLowerCase().trim();
            const existing = map.get(key);
            if (!existing || (m.available_points ?? 0) > (existing.available_points ?? 0)) {
              map.set(key, m);
            }
          }
        }
      }
    }
  } catch {}

  try {
    const rawSess = localStorage.getItem("annr_vip_member_session");
    if (rawSess) {
      const parsed = JSON.parse(rawSess);
      const m = parsed?.member;
      if (m && m.email) {
        const key = m.email.toLowerCase().trim();
        map.set(key, m);
      }
    }
  } catch {}

  return Array.from(map.values());
}

/**
 * Retrieve all Referral Attribution & Conversion Records
 */
export function getReferralRecords(): ReferralRecord[] {
  try {
    const raw = localStorage.getItem("annr-vip-referrals-log");
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      id: item.id || "ref-" + Date.now(),
      referral_code: (item.referral_code || "").toUpperCase(),
      referrer_member_id: item.referrer_member_id,
      referrer_name: item.referrer_name || "",
      referrer_email: item.referrer_email || "",
      buyer_name: item.buyer_name || "Customer",
      buyer_email: item.buyer_email || "",
      buyer_phone: item.buyer_phone || "",
      order_id: item.order_id || (item.order_number ? `#${item.order_number}` : null),
      order_number: item.order_number || null,
      order_total: Number(item.order_total || 0),
      discount_given_bdt: Number(item.discount_given_bdt || 0),
      points_earned: Number(item.points_earned || 0),
      event_type: item.event_type || (item.order_number ? "order" : "signup"),
      attribution_status: item.attribution_status || (item.order_number ? "converted" : "registered"),
      reward_status: item.reward_status || "available",
      fraud_flag: Boolean(item.fraud_flag),
      fraud_reason: item.fraud_reason || null,
      created_at: item.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Admin Review / Approve / Reverse Referral Reward
 */
export function adminReviewReferralRecord(params: {
  recordId: string;
  action: "approve" | "reverse" | "clear_fraud" | "flag_fraud";
  reason?: string;
  adminEmail?: string;
}): { ok: boolean; error?: string } {
  try {
    const raw = localStorage.getItem("annr-vip-referrals-log");
    const list: any[] = raw ? JSON.parse(raw) : [];
    const target = list.find((r) => String(r.id) === String(params.recordId));
    if (!target) return { ok: false, error: "Referral record not found." };

    const allMembers = getAllLocalVipMembers();
    const referrer = allMembers.find(
      (m) =>
        (m.referral_code || "").toUpperCase() === (target.referral_code || "").toUpperCase() ||
        (target.referrer_email && m.email.toLowerCase() === target.referrer_email.toLowerCase())
    );

    if (params.action === "approve") {
      if (target.reward_status === "pending" && referrer) {
        const pts = Number(target.points_earned || 0);
        referrer.pending_points = Math.max(0, Number(referrer.pending_points || 0) - pts);
        referrer.available_points = Number(referrer.available_points || 0) + pts;
        referrer.referral_points_earned = Number(referrer.referral_points_earned || 0) + pts;
        evaluateMemberTierLocally(referrer);
        syncMemberAcrossLocalStores(referrer);

        appendPointsLedgerEntry({
          vip_member_id: referrer.id,
          member_email: referrer.email,
          member_name: referrer.full_name,
          amount: pts,
          balance_after: referrer.available_points,
          transaction_type: "referral_matured",
          reference_id: target.order_number ? `#${target.order_number}` : target.id,
          note: `Approved referral reward (+${pts} PTS) from ${target.buyer_name}`,
          status: "completed",
        });
      }
      target.reward_status = "available";
      target.fraud_flag = false;
    } else if (params.action === "reverse") {
      if (target.reward_status !== "reversed" && referrer) {
        const pts = Number(target.points_earned || 0);
        if (target.reward_status === "pending") {
          referrer.pending_points = Math.max(0, Number(referrer.pending_points || 0) - pts);
        } else {
          referrer.available_points = Math.max(0, Number(referrer.available_points || 0) - pts);
        }
        referrer.total_earned_points = Math.max(0, Number(referrer.total_earned_points || 0) - pts);
        referrer.friends_referred = Math.max(0, Number(referrer.friends_referred || 1) - 1);
        syncMemberAcrossLocalStores(referrer);

        appendPointsLedgerEntry({
          vip_member_id: referrer.id,
          member_email: referrer.email,
          member_name: referrer.full_name,
          amount: -pts,
          balance_after: referrer.available_points,
          transaction_type: "order_cancelled",
          reference_id: target.order_number ? `#${target.order_number}` : target.id,
          note: `Reversed referral reward (-${pts} PTS): ${params.reason || "Reversed by admin"}`,
          status: "reversed",
        });

        pushLoyaltyNotification({
          member_email: referrer.email,
          event_type: "reward_reversed",
          title: `Referral Reward Reversed (-${pts} PTS)`,
          message: params.reason || `Referral reward for Order #${target.order_number || ""} was reversed.`,
        });
      }
      target.reward_status = "reversed";
    } else if (params.action === "clear_fraud") {
      target.fraud_flag = false;
      target.fraud_reason = null;
    } else if (params.action === "flag_fraud") {
      target.fraud_flag = true;
      target.fraud_reason = params.reason || "Flagged for manual fraud review";
    }

    localStorage.setItem("annr-vip-referrals-log", JSON.stringify(list));
    appendAdminLoyaltyLog({
      admin_email: params.adminEmail || "admin@annr.store",
      action_type: `referral_${params.action}`,
      target_email: target.referrer_email || target.referral_code,
      reason: params.reason || `Referral ${params.action} on code ${target.referral_code}`,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to update referral record" };
  }
}

/**
 * Credit a VIP referrer locally across all storage keys when their referral code is used
 * at checkout (with idempotency, fraud detection, and tier multiplier).
 */
export function creditVipReferrerLocally(params: {
  referralCode: string;
  pointsReward: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  orderNumber?: string | number;
  orderTotal?: number;
  discountGiven?: number;
  eventType: "order" | "signup";
}): { credited: boolean; reason?: string } {
  const normCode = (params.referralCode || "").trim().toUpperCase();
  if (!normCode) return { credited: false, reason: "Empty referral code" };

  try {
    const rawLog = localStorage.getItem("annr-vip-referrals-log");
    const logList: any[] = rawLog ? JSON.parse(rawLog) : [];

    // 1. Idempotency check: prevent duplicate referral rewards for the same order_number
    if (params.eventType === "order" && params.orderNumber) {
      const alreadyProcessed = logList.some(
        (r) => r && r.event_type === "order" && String(r.order_number) === String(params.orderNumber)
      );
      if (alreadyProcessed) {
        return { credited: false, reason: "Order referral reward already processed (idempotent)" };
      }
    }

    const allMembers = getAllLocalVipMembers();
    const owner = allMembers.find((m) => (m.referral_code || "").toUpperCase() === normCode);

    // 2. Anti-self-referral check
    if (owner && params.buyerEmail && owner.email.toLowerCase().trim() === params.buyerEmail.toLowerCase().trim()) {
      return { credited: false, reason: "Self-referral blocked" };
    }
    if (owner && params.buyerPhone && owner.phone && owner.phone.replace(/\D/g, "") === params.buyerPhone.replace(/\D/g, "")) {
      return { credited: false, reason: "Self-referral by matching phone number blocked" };
    }

    // 3. Detect suspicious velocity / repeated buyer email for fraud flag
    const priorUsesByBuyer = params.buyerEmail
      ? logList.filter(
          (r) =>
            r &&
            r.event_type === "order" &&
            (r.referral_code || "").toUpperCase() === normCode &&
            (r.buyer_email || "").toLowerCase().trim() === params.buyerEmail!.toLowerCase().trim()
        ).length
      : 0;
    const isFraudFlagged = priorUsesByBuyer >= 2;
    const fraudReason = isFraudFlagged ? `Repeated referral usage (${priorUsesByBuyer + 1}×) by same customer email` : null;

    const multiplier = Number(owner?.tier_multiplier || 1.0);
    const basePts = Math.max(0, Math.round(Number(params.pointsReward) || 100));
    const pts = Math.round(basePts * multiplier);

    let matchedEmail = owner?.email || "";

    if (owner) {
      owner.available_points = Number(owner.available_points || 0) + pts;
      owner.total_earned_points = Number(owner.total_earned_points || 0) + pts;
      owner.referral_points_earned = Number(owner.referral_points_earned || 0) + pts;
      owner.friends_referred = Number(owner.friends_referred || 0) + 1;
      evaluateMemberTierLocally(owner);
      syncMemberAcrossLocalStores(owner);

      appendPointsLedgerEntry({
        vip_member_id: owner.id,
        member_email: owner.email,
        member_name: owner.full_name,
        amount: pts,
        balance_after: owner.available_points,
        transaction_type: "referral_matured",
        reference_id: params.orderNumber ? `#${params.orderNumber}` : undefined,
        note:
          params.eventType === "order"
            ? `Referral reward (+${pts} PTS) from ${params.buyerName || "Friend"} on Order #${params.orderNumber}`
            : `Referral signup bonus (+${pts} PTS) from ${params.buyerName || "Friend"}`,
        status: "completed",
      });

      pushLoyaltyNotification({
        member_email: owner.email,
        event_type: "referral_success",
        title: `+${pts} ANNR Points Earned from Referral!`,
        message: `${params.buyerName || "A friend"} completed ${
          params.orderNumber ? `Order #${params.orderNumber}` : "registration"
        } using your code ${normCode}.`,
      });
    }

    // Update coupon stats inside annr_vip_accounts_v1 and annr_vip_member_session
    const rawAccounts = localStorage.getItem("annr_vip_accounts_v1");
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      let updatedAcc = false;
      for (const k of Object.keys(accounts)) {
        const acc = accounts[k];
        const code = (acc?.coupon?.code || acc?.member?.referral_code || "").toUpperCase();
        if (code === normCode && acc.coupon) {
          acc.coupon.times_used = Number(acc.coupon.times_used || 0) + 1;
          acc.coupon.total_points_generated = Number(acc.coupon.total_points_generated || 0) + pts;
          updatedAcc = true;
        }
      }
      if (updatedAcc) {
        localStorage.setItem("annr_vip_accounts_v1", JSON.stringify(accounts));
      }
    }

    const rawSess = localStorage.getItem("annr_vip_member_session");
    if (rawSess) {
      const sess = JSON.parse(rawSess);
      const sessCode = (sess?.coupon?.code || sess?.member?.referral_code || "").toUpperCase();
      if (sessCode === normCode && sess.coupon) {
        sess.coupon.times_used = Number(sess.coupon.times_used || 0) + 1;
        sess.coupon.total_points_generated = Number(sess.coupon.total_points_generated || 0) + pts;
        localStorage.setItem("annr_vip_member_session", JSON.stringify(sess));
      }
    }

    logList.unshift({
      id: "ref-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      referral_code: normCode,
      referrer_member_id: owner?.id,
      referrer_name: owner?.full_name || "VIP Member",
      referrer_email: matchedEmail,
      buyer_name: params.buyerName || "Friend",
      buyer_email: params.buyerEmail || "",
      buyer_phone: params.buyerPhone || "",
      order_number: params.orderNumber || null,
      order_total: params.orderTotal || 0,
      discount_given_bdt: params.discountGiven || 0,
      points_earned: pts,
      event_type: params.eventType,
      attribution_status: params.eventType === "order" ? "converted" : "registered",
      reward_status: "available",
      fraud_flag: isFraudFlagged,
      fraud_reason: fraudReason,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("annr-vip-referrals-log", JSON.stringify(logList.slice(0, 500)));
    return { credited: true };
  } catch (e) {
    console.warn("Local referral credit sync error:", e);
    return { credited: false, reason: "Sync error" };
  }
}

/**
 * Validate referral coupon at checkout
 */
export async function validateReferralCoupon(
  code: string,
  orderTotal: number,
  buyerEmail?: string
): Promise<{
  valid: boolean;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  points_reward?: number;
  referrer_name?: string;
  error?: string;
}> {
  const normCode = (code || "").trim().toUpperCase();
  if (!normCode) {
    return { valid: false, error: "Please enter a coupon code" };
  }

  const settings = await getLoyaltySettings();
  if (!settings.program_enabled && (normCode.startsWith("VIP-") || normCode.startsWith("ANNR-"))) {
    return { valid: false, error: "The VIP referral programme is currently paused by the administrator." };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("validate_referral_coupon", {
        p_code: normCode,
        p_order_total: orderTotal,
        p_buyer_email: buyerEmail,
      });
      if (!error && data) {
        if (data.valid) return data;
        if (data.error && (data.error.includes("own referral") || data.error.includes("Self-referral"))) {
          return data;
        }
      }
    } catch {
      // Fall through to local validation
    }
  }

  // Check special promo / Ball Drop codes
  const promoCodes: Record<string, { type: "percent" | "fixed"; value: number; minOrder: number }> = {
    LUCK5: { type: "percent", value: 5, minOrder: 500 },
    LUCK10: { type: "percent", value: 10, minOrder: 500 },
    LUCK15: { type: "percent", value: 15, minOrder: 500 },
    ANNR500: { type: "fixed", value: 500, minOrder: 1500 },
    FREESHIP: { type: "fixed", value: 120, minOrder: 500 },
    FREEGIFT: { type: "percent", value: 10, minOrder: 500 },
    ANNRVIP: { type: "percent", value: 10, minOrder: 500 },
  };

  if (promoCodes[normCode]) {
    const p = promoCodes[normCode];
    if (orderTotal < p.minOrder) {
      return { valid: false, error: `Minimum order for ${normCode} is ৳${p.minOrder.toLocaleString()}` };
    }
    const disc = p.type === "percent" ? Math.round(orderTotal * (p.value / 100)) : Math.min(orderTotal, p.value);
    return {
      valid: true,
      discount_amount: disc,
      discount_type: p.type,
      discount_value: p.value,
      points_reward: 0,
    };
  }

  const localMembers = getAllLocalVipMembers();
  const owner = localMembers.find((m) => (m.referral_code || "").toUpperCase() === normCode);
  const prefix = (settings.coupon_prefix || "VIP-").toUpperCase();

  if (owner || normCode.startsWith(prefix) || normCode.startsWith("VIP-") || normCode.startsWith("ANNR-")) {
    if (owner && owner.status !== "active") {
      return { valid: false, error: "This referral code is currently suspended or inactive." };
    }

    const minOrder = Number(settings.min_order_for_coupon ?? 1000);
    if (orderTotal < minOrder) {
      return {
        valid: false,
        error: `Minimum order for referral coupon is ৳${minOrder.toLocaleString()}`,
      };
    }

    // Check anti-self-referral
    if (buyerEmail && buyerEmail.trim()) {
      const cleanBuyer = buyerEmail.trim().toLowerCase();
      if (owner && owner.email && owner.email.toLowerCase() === cleanBuyer) {
        return { valid: false, error: "You cannot use your own referral coupon" };
      }
      if (normCode === "VIP-RATUL88" && cleanBuyer.includes("ratul")) {
        return { valid: false, error: "You cannot use your own referral coupon" };
      }

      // Check first-order-only restriction if enabled
      if (settings.first_order_only_referral) {
        const records = getReferralRecords();
        const usedBefore = records.some(
          (r) => r.event_type === "order" && (r.buyer_email || "").toLowerCase().trim() === cleanBuyer && r.reward_status !== "reversed"
        );
        if (usedBefore) {
          return { valid: false, error: "Referral coupons are valid for first-time referred orders only." };
        }
      }
    }

    const discType = settings.friend_discount_type || "percent";
    const discVal = Number(settings.friend_discount_value || 10);
    const maxCap = Number(settings.max_discount_bdt || 0);
    let discount =
      discType === "fixed"
        ? Math.min(orderTotal, Math.round(discVal))
        : Math.round(orderTotal * (discVal / 100));
    if (maxCap > 0) {
      discount = Math.min(discount, maxCap);
    }

    const baseReward =
      settings.reward_mode === "percent_order"
        ? Math.max(10, Math.round(orderTotal * ((Number(settings.percent_order_points) || 5) / 100)))
        : Number(settings.points_per_referral || 100);

    const pointsReward = Math.round(baseReward * Number(owner?.tier_multiplier || 1.0));

    return {
      valid: true,
      discount_amount: discount,
      discount_type: discType,
      discount_value: discVal,
      points_reward: pointsReward,
      referrer_name: owner?.full_name,
    };
  }
  return { valid: false, error: "Invalid coupon code" };
}

/**
 * Request VIP funds withdrawal
 */
export async function requestVipWithdrawal(payload: {
  pointsAmount: number;
  payoutMethod: "bkash" | "nagad" | "rocket" | "bank";
  accountNumber: string;
  accountName?: string;
  bankDetails?: any;
}): Promise<{ ok: boolean; moneyAmountBdt?: number; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("request_vip_withdrawal", {
        p_points_amount: payload.pointsAmount,
        p_payout_method: payload.payoutMethod,
        p_account_number: payload.accountNumber,
        p_account_name: payload.accountName || null,
        p_bank_details: payload.bankDetails || null,
      });
      if (!error && data?.ok) {
        return { ok: true, moneyAmountBdt: data.money_amount_bdt };
      }
      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: false, error: data?.error || "Withdrawal failed" };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Failed to submit request" };
    }
  }

  return { ok: true, moneyAmountBdt: payload.pointsAmount * 1.0 };
}

/**
 * Fetch all withdrawal requests (Admin queue) — merges Supabase & local storage
 */
export async function getAdminWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const merged = new Map<string, WithdrawalRequest>();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          vip_members ( full_name, email, phone, tier )
        `)
        .order("requested_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          merged.set(String(row.id || row.request_number), row as WithdrawalRequest);
        }
      }
    } catch {}
  }

  const keys = ["annr-withdrawals", LOCAL_WITHDRAWALS_KEY];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (!item) continue;
            const id = String(item.id || item.request_number || Date.now());
            const normalized: WithdrawalRequest = {
              id,
              request_number: item.request_number || id,
              vip_member_id: item.vip_member_id || item.member_email || "local",
              points_amount: Number(item.points_amount || 0),
              money_amount_bdt: Number(item.money_amount_bdt || item.points_amount || 0),
              payout_method: item.payout_method || "bkash",
              account_number: item.account_number || "",
              account_name: item.account_name || item.account_holder_name || item.member_name || "",
              status: item.status || "pending",
              admin_notes: item.admin_notes || null,
              transaction_ref: item.transaction_ref || null,
              requested_at: item.requested_at || item.created_at || new Date().toISOString(),
              processed_at: item.processed_at || null,
              vip_members: item.vip_members || {
                full_name: item.member_name || item.account_holder_name || "VIP Member",
                email: item.member_email || "",
                phone: item.account_number || "",
                tier: item.tier || "Silver",
              },
            };
            merged.set(id, normalized);
          }
        }
      }
    } catch {}
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime()
  );
}

/**
 * Process withdrawal request (Admin: pay, approve, reject)
 */
export async function processAdminWithdrawal(
  requestId: string,
  action: "paid" | "approved" | "rejected",
  transactionRef?: string,
  adminNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.rpc("admin_process_withdrawal", {
        p_request_id: requestId,
        p_action: action,
        p_transaction_ref: transactionRef || null,
        p_admin_notes: adminNotes || null,
      });
    } catch {}
  }

  try {
    let targetRecord: any = null;
    for (const key of ["annr-withdrawals", LOCAL_WITHDRAWALS_KEY]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) continue;
      let changed = false;
      for (const w of list) {
        if (w && (String(w.id) === String(requestId) || String(w.request_number) === String(requestId))) {
          w.status = action;
          if (transactionRef) w.transaction_ref = transactionRef;
          if (adminNotes) w.admin_notes = adminNotes;
          w.processed_at = new Date().toISOString();
          targetRecord = w;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(key, JSON.stringify(list));
      }
    }

    if (targetRecord) {
      const pts = Number(targetRecord.points_amount || 0);
      const email = (targetRecord.member_email || targetRecord.vip_members?.email || "").toLowerCase();
      const all = getAllLocalVipMembers();
      const member = all.find((m) => m.email.toLowerCase() === email || m.id === targetRecord.vip_member_id);

      if (action === "rejected" && pts > 0 && member) {
        member.available_points = Number(member.available_points || 0) + pts;
        member.withdrawn_points = Math.max(0, Number(member.withdrawn_points || 0) - pts);
        syncMemberAcrossLocalStores(member);

        appendPointsLedgerEntry({
          vip_member_id: member.id,
          member_email: member.email,
          member_name: member.full_name,
          amount: pts,
          balance_after: member.available_points,
          transaction_type: "withdrawal_refunded",
          reference_id: `#${targetRecord.request_number || requestId}`,
          note: `Withdrawal #${targetRecord.request_number || requestId} rejected & refunded: ${adminNotes || "Refunded to wallet"}`,
          status: "completed",
        });
      } else if (action === "paid" && member) {
        appendPointsLedgerEntry({
          vip_member_id: member.id,
          member_email: member.email,
          member_name: member.full_name,
          amount: 0,
          balance_after: member.available_points,
          transaction_type: "withdrawal_paid",
          reference_id: `#${targetRecord.request_number || requestId}`,
          note: `Paid ৳${targetRecord.money_amount_bdt} via ${targetRecord.payout_method.toUpperCase()} (TrxID: ${transactionRef || "N/A"})`,
          status: "completed",
        });
      }
    }
  } catch (e) {
    console.warn("Local withdrawal processing error:", e);
  }

  return { ok: true };
}

/**
 * Update order status (Fulfilled, Cancelled, Refunded, Shipped, etc.) and mature / reverse VIP referral & redeemed points
 */
export async function updateStoreOrderStatus(
  orderId: string,
  newStatus: string,
  paymentStatus?: string
): Promise<{ ok: boolean; error?: string }> {
  const normStatus = newStatus.toLowerCase().trim();

  if (isSupabaseConfigured()) {
    try {
      await supabase.rpc("update_store_order_status", {
        p_order_id: orderId,
        p_new_status: normStatus,
        p_payment_status: paymentStatus || null,
      });
    } catch {}
  }

  try {
    const rawOrders = localStorage.getItem("annr-orders");
    if (rawOrders) {
      const orders = JSON.parse(rawOrders);
      const target = orders.find((o: any) => String(o.id) === String(orderId) || String(o.order_number) === String(orderId));
      if (target) {
        const prevStatus = (target.status || "").toLowerCase();
        target.status = newStatus;
        if (paymentStatus) target.payment = paymentStatus;
        localStorage.setItem("annr-orders", JSON.stringify(orders));

        // If cancelled or refunded, reverse referral reward AND refund any redeemed checkout points!
        if ((normStatus === "cancelled" || normStatus === "refunded") && prevStatus !== "cancelled" && prevStatus !== "refunded") {
          // 1. Refund redeemed points back to buyer if buyer redeemed points on this order
          if (target.points_redeemed && Number(target.points_redeemed) > 0 && target.email) {
            const all = getAllLocalVipMembers();
            const buyer = all.find((m) => m.email.toLowerCase().trim() === target.email.toLowerCase().trim());
            if (buyer) {
              const rPts = Number(target.points_redeemed);
              buyer.available_points = Number(buyer.available_points || 0) + rPts;
              buyer.redeemed_points = Math.max(0, Number(buyer.redeemed_points || 0) - rPts);
              syncMemberAcrossLocalStores(buyer);

              appendPointsLedgerEntry({
                vip_member_id: buyer.id,
                member_email: buyer.email,
                member_name: buyer.full_name,
                amount: rPts,
                balance_after: buyer.available_points,
                transaction_type: "points_refunded",
                reference_id: `#${target.order_number || orderId}`,
                note: `Refunded ${rPts} redeemed ANNR Points due to order ${normStatus}`,
                status: "completed",
              });
            }
          }

          // 2. Reverse referral reward from referrer
          if (target.coupon_code) {
            const logs = getReferralRecords();
            const refRec = logs.find(
              (r) =>
                String(r.order_number) === String(target.order_number) ||
                ((r.referral_code || "").toUpperCase() === target.coupon_code.toUpperCase() && r.reward_status !== "reversed")
            );
            if (refRec) {
              adminReviewReferralRecord({
                recordId: refRec.id,
                action: "reverse",
                reason: `Order #${target.order_number || orderId} was ${normStatus}`,
              });
            }
          }
        }
      }
    }
  } catch {}

  return { ok: true };
}
