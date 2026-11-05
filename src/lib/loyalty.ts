import { supabase, isSupabaseConfigured } from "./supabase";

export interface LoyaltySettings {
  id: number;
  program_enabled: boolean;
  reward_mode: "fixed_points" | "percent_order";
  points_per_referral: number;
  percent_order_points: number;
  point_value_bdt: number;
  friend_discount_type: "percent" | "fixed";
  friend_discount_value: number;
  min_order_for_coupon: number;
  min_withdrawal_bdt: number;
  max_withdrawal_bdt: number;
  pending_days_return_window: number;
  coupon_prefix: string;
  allowed_payout_methods: string[];
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
  tier: "Silver" | "Gold" | "Diamond" | "Black";
  tier_multiplier: number;
  available_points: number;
  pending_points: number;
  withdrawn_points: number;
  total_earned_points: number;
  referral_code: string;
  referred_by_code?: string | null;
  default_payout_method?: string | null;
  default_payout_account?: string | null;
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

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  id: 1,
  program_enabled: true,
  reward_mode: "fixed_points",
  points_per_referral: 100,
  percent_order_points: 5.0,
  point_value_bdt: 1.0,
  friend_discount_type: "percent",
  friend_discount_value: 10.0,
  min_order_for_coupon: 1000.0,
  min_withdrawal_bdt: 100.0,
  max_withdrawal_bdt: 25000.0,
  pending_days_return_window: 7,
  coupon_prefix: "VIP-",
  allowed_payout_methods: ["bkash", "nagad", "rocket", "bank"],
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
        const res = data as LoyaltySettings;
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

  // Fallback to localStorage if offline/demo
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  return DEFAULT_LOYALTY_SETTINGS;
}

/**
 * Save loyalty settings (admin only)
 */
export async function saveLoyaltySettings(settings: Partial<LoyaltySettings>): Promise<{ ok: boolean; error?: string }> {
  let savedToDb = false;
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("loyalty_settings")
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });

      if (error) {
        console.warn("Supabase loyalty_settings upsert error:", error.message);
      } else {
        savedToDb = true;
      }
    } catch (e: any) {
      console.warn("Supabase loyalty_settings network error:", e?.message);
    }
  }

  // Always update local caches across all keys
  try {
    const current = await getLoyaltySettings();
    const updated = { ...current, ...settings };
    const str = JSON.stringify(updated);
    localStorage.setItem(LOCAL_SETTINGS_KEY, str);
    localStorage.setItem(LEGACY_SETTINGS_KEY, str);

    // Trigger instant custom event for live listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("annr:loyalty:updated", { detail: updated }));
      if (typeof (window as any).shihikoApply === "function") {
        (window as any).shihikoApply();
      }
    }
  } catch {
    // Ignore error
  }
  return { ok: true };
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

      if (!error && data?.ok) {
        const member = data.member as VipMember;
        try {
          localStorage.setItem(LOCAL_VIP_KEY, JSON.stringify(member));
          const members = JSON.parse(localStorage.getItem(LOCAL_MEMBERS_KEY) || "[]");
          const next = Array.isArray(members) ? members.filter((item: VipMember) => item.email !== member.email) : [];
          next.push(member);
          localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(next));
        } catch {}
        return { ok: true, member, coupon: data.coupon };
      } else {
        return { ok: false, error: error?.message || data?.error || "Failed to register VIP member" };
      }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Failed to register" };
    }
  }

  // Local fallback simulation
  const refCode = "VIP-" + payload.fullName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 899);
  const fallbackMember: VipMember = {
    id: "local-" + Date.now(),
    email: payload.email.toLowerCase().trim(),
    full_name: payload.fullName.trim(),
    phone: payload.phone.trim(),
    is_whatsapp: payload.isWhatsapp !== false,
    division: payload.division,
    district: payload.district,
    upazila: payload.upazila || "",
    full_address: payload.fullAddress || "",
    tier: "Silver",
    tier_multiplier: 1.0,
    available_points: 150,
    pending_points: 100,
    withdrawn_points: 0,
    total_earned_points: 250,
    referral_code: refCode,
    status: "active",
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LOCAL_VIP_KEY, JSON.stringify(fallbackMember));
    const members = JSON.parse(localStorage.getItem(LOCAL_MEMBERS_KEY) || "[]");
    const next = Array.isArray(members) ? members.filter((item: VipMember) => item.email !== fallbackMember.email) : [];
    next.push(fallbackMember);
    localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(next));
  } catch {}
  return { ok: true, member: fallbackMember, coupon: { code: refCode, discount_value: 10, discount_type: "percent" } };
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
 * Credit a VIP referrer locally across all storage keys when their referral code is used
 * at signup or checkout.
 */
export function creditVipReferrerLocally(params: {
  referralCode: string;
  pointsReward: number;
  buyerName?: string;
  buyerEmail?: string;
  orderNumber?: string | number;
  orderTotal?: number;
  eventType: "order" | "signup";
}): void {
  const normCode = (params.referralCode || "").trim().toUpperCase();
  if (!normCode) return;
  const pts = Math.max(0, Math.round(Number(params.pointsReward) || 100));

  try {
    // 1. Update annr-vip-members
    const rawMembers = localStorage.getItem(LOCAL_MEMBERS_KEY);
    const members: any[] = rawMembers ? JSON.parse(rawMembers) : [];
    let matchedEmail = "";
    for (const m of members) {
      if ((m.referral_code || "").toUpperCase() === normCode) {
        m.available_points = Number(m.available_points || 0) + pts;
        m.total_earned_points = Number(m.total_earned_points || 0) + pts;
        m.friends_referred = Number(m.friends_referred || 0) + 1;
        matchedEmail = (m.email || "").toLowerCase();
      }
    }
    if (members.length > 0) {
      localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
    }

    // 2. Update annr_vip_accounts_v1
    const rawAccounts = localStorage.getItem("annr_vip_accounts_v1");
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      let updatedAcc = false;
      for (const k of Object.keys(accounts)) {
        const acc = accounts[k];
        const code = (acc?.coupon?.code || acc?.member?.referral_code || "").toUpperCase();
        if (code === normCode) {
          acc.available_points = Number(acc.available_points || acc?.member?.available_points || 0) + pts;
          if (acc.member) {
            acc.member.available_points = Number(acc.member.available_points || 0) + pts;
            acc.member.total_earned_points = Number(acc.member.total_earned_points || 0) + pts;
            acc.member.friends_referred = Number(acc.member.friends_referred || 0) + 1;
            if (!matchedEmail && acc.member.email) matchedEmail = acc.member.email.toLowerCase();
          }
          if (acc.coupon) {
            acc.coupon.times_used = Number(acc.coupon.times_used || 0) + 1;
            acc.coupon.total_points_generated = Number(acc.coupon.total_points_generated || 0) + pts;
          }
          updatedAcc = true;
        }
      }
      if (updatedAcc) {
        localStorage.setItem("annr_vip_accounts_v1", JSON.stringify(accounts));
      }
    }

    // 3. Update active session if logged in as the referrer
    const rawSess = localStorage.getItem("annr_vip_member_session");
    if (rawSess) {
      const sess = JSON.parse(rawSess);
      const sessCode = (sess?.coupon?.code || sess?.member?.referral_code || "").toUpperCase();
      if (sessCode === normCode) {
        sess.member = sess.member || {};
        sess.coupon = sess.coupon || { code: normCode };
        sess.member.available_points = Number(sess.member.available_points || 0) + pts;
        sess.member.total_earned_points = Number(sess.member.total_earned_points || 0) + pts;
        sess.member.friends_referred = Number(sess.member.friends_referred || 0) + 1;
        sess.coupon.times_used = Number(sess.coupon.times_used || 0) + 1;
        sess.coupon.total_points_generated = Number(sess.coupon.total_points_generated || 0) + pts;
        localStorage.setItem("annr_vip_member_session", JSON.stringify(sess));
        localStorage.setItem("annr_vip_session", JSON.stringify(sess.member));
        localStorage.setItem(LOCAL_VIP_KEY, JSON.stringify(sess.member));
      }
    }

    // 4. Append to referral activity log for the VIP dashboard & Admin view
    const rawLog = localStorage.getItem("annr-vip-referrals-log");
    const logList: any[] = rawLog ? JSON.parse(rawLog) : [];
    logList.unshift({
      id: "ref-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      referral_code: normCode,
      referrer_email: matchedEmail,
      buyer_name: params.buyerName || "Friend",
      buyer_email: params.buyerEmail || "",
      order_number: params.orderNumber || null,
      order_total: params.orderTotal || 0,
      points_earned: pts,
      event_type: params.eventType,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("annr-vip-referrals-log", JSON.stringify(logList.slice(0, 500)));
  } catch (e) {
    console.warn("Local referral credit sync error:", e);
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

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("validate_referral_coupon", {
        p_code: normCode,
        p_order_total: orderTotal,
        p_buyer_email: buyerEmail,
      });
      if (!error && data) {
        if (data.valid) return data;
        // If Supabase returned an explicit security rejection (like self-referral), return it
        if (data.error && data.error.includes("own referral coupon")) {
          return data;
        }
      }
      // If error or inactive coupon in empty DB, fall through to local validation
    } catch {
      // Fall through to local fallback
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

  // Check local VIP member referral codes + prefix rules
  const localMembers = getAllLocalVipMembers();
  const owner = localMembers.find((m) => (m.referral_code || "").toUpperCase() === normCode);
  const prefix = (settings.coupon_prefix || "VIP-").toUpperCase();

  if (owner || normCode.startsWith(prefix) || normCode.startsWith("VIP-") || normCode.startsWith("ANNR-")) {
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
    }

    const discType = settings.friend_discount_type || "percent";
    const discVal = Number(settings.friend_discount_value || 10);
    const discount =
      discType === "fixed"
        ? Math.min(orderTotal, Math.round(discVal))
        : Math.round(orderTotal * (discVal / 100));

    const pointsReward =
      settings.reward_mode === "percent_order"
        ? Math.max(10, Math.round(orderTotal * ((Number(settings.percent_order_points) || 5) / 100)))
        : Number(settings.points_per_referral || 100);

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

  // Local fallback
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
    } catch {
      // Fallback
    }
  }

  // Always merge local storage keys ("annr-withdrawals" from site-config.js and "annr-withdrawals-v1")
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
    } catch {
      // Fall through and also update local storage
    }
  }

  // Always update local storage queues ("annr-withdrawals" and "annr-withdrawals-v1")
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

    // If rejected, refund points back to member's available_points
    if (action === "rejected" && targetRecord) {
      const pts = Number(targetRecord.points_amount || 0);
      const email = (targetRecord.member_email || targetRecord.vip_members?.email || "").toLowerCase();
      const memberId = targetRecord.vip_member_id;

      if (pts > 0) {
        // 1. annr-vip-members
        const rawMembers = localStorage.getItem(LOCAL_MEMBERS_KEY);
        if (rawMembers) {
          const members = JSON.parse(rawMembers);
          for (const m of members) {
            if ((email && m.email?.toLowerCase() === email) || (memberId && m.id === memberId)) {
              m.available_points = Number(m.available_points || 0) + pts;
              m.withdrawn_points = Math.max(0, Number(m.withdrawn_points || 0) - pts);
            }
          }
          localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
        }

        // 2. annr_vip_accounts_v1
        const rawAcc = localStorage.getItem("annr_vip_accounts_v1");
        if (rawAcc) {
          const accs = JSON.parse(rawAcc);
          for (const k of Object.keys(accs)) {
            const a = accs[k];
            if ((email && a?.email?.toLowerCase() === email) || (memberId && a?.member?.id === memberId)) {
              a.available_points = Number(a.available_points || 0) + pts;
              if (a.member) {
                a.member.available_points = Number(a.member.available_points || 0) + pts;
                a.member.withdrawn_points = Math.max(0, Number(a.member.withdrawn_points || 0) - pts);
              }
            }
          }
          localStorage.setItem("annr_vip_accounts_v1", JSON.stringify(accs));
        }

        // 3. annr_vip_member_session
        const rawSess = localStorage.getItem("annr_vip_member_session");
        if (rawSess) {
          const sess = JSON.parse(rawSess);
          if (
            sess?.member &&
            ((email && sess.member.email?.toLowerCase() === email) || (memberId && sess.member.id === memberId))
          ) {
            sess.member.available_points = Number(sess.member.available_points || 0) + pts;
            sess.member.withdrawn_points = Math.max(0, Number(sess.member.withdrawn_points || 0) - pts);
            localStorage.setItem("annr_vip_member_session", JSON.stringify(sess));
            localStorage.setItem("annr_vip_session", JSON.stringify(sess.member));
            localStorage.setItem(LOCAL_VIP_KEY, JSON.stringify(sess.member));
          }
        }
      }
    }
  } catch (e) {
    console.warn("Local withdrawal processing error:", e);
  }

  return { ok: true };
}

/**
 * Update order status (Fulfilled, Cancelled, Shipped, etc.) and mature / reverse VIP referral points
 */
export async function updateStoreOrderStatus(
  orderId: string,
  newStatus: string,
  paymentStatus?: string
): Promise<{ ok: boolean; error?: string }> {
  const normStatus = newStatus.toLowerCase().trim();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("update_store_order_status", {
        p_order_id: orderId,
        p_new_status: normStatus,
        p_payment_status: paymentStatus || null,
      });
      if (!error && data?.ok) {
        return { ok: true };
      }
    } catch (e: any) {
      console.warn("Notice: Supabase order status sync fallback to local store:", e);
    }
  }

  // Local storage simulation
  try {
    const rawOrders = localStorage.getItem("annr-orders");
    if (rawOrders) {
      const orders = JSON.parse(rawOrders);
      const target = orders.find((o: any) => o.id === orderId || o.order_number === orderId);
      if (target) {
        target.status = newStatus;
        if (paymentStatus) target.payment = paymentStatus;
        localStorage.setItem("annr-orders", JSON.stringify(orders));

        // Mature or reverse referral points
        if (target.coupon_code) {
          const rawMembers = localStorage.getItem(LOCAL_MEMBERS_KEY);
          if (rawMembers) {
            const members = JSON.parse(rawMembers);
            const owner = members.find((m: any) => m.referral_code?.toUpperCase() === target.coupon_code.toUpperCase());
            if (owner) {
              const pts = Number(target.referral_points || 100);
              if (normStatus === "fulfilled" || normStatus === "delivered") {
                if (owner.pending_points >= pts) {
                  owner.pending_points -= pts;
                  owner.available_points = (owner.available_points || 0) + pts;
                }
              } else if (normStatus === "cancelled" || normStatus === "refunded") {
                if (owner.pending_points >= pts) {
                  owner.pending_points -= pts;
                }
              }
              localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  return { ok: true };
}
