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
  min_withdrawal_bdt: 500.0,
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
        } catch {}
        return { ok: true, member, coupon: data.coupon };
      } else if (error) {
        return { ok: false, error: error.message };
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
  } catch {}
  return { ok: true, member: fallbackMember, coupon: { code: refCode, discount_value: 10, discount_type: "percent" } };
}

/**
 * Validate referral coupon at checkout
 */
export async function validateReferralCoupon(
  code: string,
  orderTotal: number,
  buyerEmail?: string
): Promise<{ valid: boolean; discount_amount?: number; discount_type?: string; discount_value?: number; points_reward?: number; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("validate_referral_coupon", {
        p_code: code,
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
    } catch (e: any) {
      // Fall through to local fallback
    }
  }

  // Local validation rules (offline & pre-migration fallback)
  const normCode = code.trim().toUpperCase();
  if (normCode.startsWith("VIP-") || normCode.startsWith("ANNR-")) {
    if (orderTotal < 1000) {
      return { valid: false, error: "Minimum order for referral coupon is ৳1,000" };
    }

    // Check anti-self-referral
    if (buyerEmail && buyerEmail.trim()) {
      try {
        const rawMembers = localStorage.getItem(LOCAL_MEMBERS_KEY);
        if (rawMembers) {
          const members = JSON.parse(rawMembers);
          const owner = members.find((m: any) => m.referral_code?.toUpperCase() === normCode);
          if (owner && owner.email && owner.email.toLowerCase() === buyerEmail.trim().toLowerCase()) {
            return { valid: false, error: "You cannot use your own referral coupon" };
          }
        }
      } catch {}

      // Hardcoded check for demo test owner
      if (normCode === "VIP-RATUL88" && buyerEmail.toLowerCase().includes("ratul")) {
        return { valid: false, error: "You cannot use your own referral coupon" };
      }
    }

    const discount = Math.round(orderTotal * 0.1);
    return { valid: true, discount_amount: discount, discount_type: "percent", discount_value: 10, points_reward: 100 };
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
 * Fetch all withdrawal requests (Admin queue)
 */
export async function getAdminWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          vip_members ( full_name, email, phone, tier )
        `)
        .order("requested_at", { ascending: false });

      if (!error && data) {
        return data as WithdrawalRequest[];
      }
    } catch {
      // Fallback
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_WITHDRAWALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
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
      const { data, error } = await supabase.rpc("admin_process_withdrawal", {
        p_request_id: requestId,
        p_action: action,
        p_transaction_ref: transactionRef || null,
        p_admin_notes: adminNotes || null,
      });
      if (!error && data?.ok) {
        return { ok: true };
      }
      return { ok: false, error: error?.message || data?.error || "Failed to process" };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Error processing withdrawal" };
    }
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
