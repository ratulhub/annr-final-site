import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, calculateShippingFee, isValidBdPhone } from "../lib/bangladesh-geo";
import {
  validateReferralCoupon,
  creditVipReferrerLocally,
  getAllLocalVipMembers,
  getLoyaltySettings,
  calculateMaxRedeemablePoints,
  redeemMemberPointsForOrder,
  awardOrderLoyaltyPoints,
  evaluateOrderCampaignBonuses,
  DEFAULT_LOYALTY_SETTINGS,
  type LoyaltySettings,
  type VipMember,
} from "../lib/loyalty";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
}

function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [division, setDivision] = useState<string>("Dhaka");
  const [district, setDistrict] = useState<string>("Dhaka");
  const [upazila, setUpazila] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bkash" | "nagad" | "rocket">("cod");
  const [trxId, setTrxId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    pointsReward?: number;
    referrerName?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  // ANNR VIP Points Wallet & Redemption State
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
  const [vipMember, setVipMember] = useState<VipMember | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [redemptionCap, setRedemptionCap] = useState<{
    canRedeem: boolean;
    maxPoints: number;
    maxDiscountBdt: number;
    pointValueBdt: number;
    reason?: string;
  }>({ canRedeem: false, maxPoints: 0, maxDiscountBdt: 0, pointValueBdt: 1 });

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let loadedItems: CartItem[] = [];
    try {
      const raw = localStorage.getItem("annr-cart") || localStorage.getItem("shihiko-cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedItems = parsed;
        }
      }
    } catch {}

    if (loadedItems.length === 0) {
      loadedItems = [
        {
          id: "prod-1",
          title: "AnnR Archival One-of-One Piece",
          price: 4800,
          quantity: 1,
          size: "M",
          image: "/cdn/shop/t/75/assets/image_logo.svg",
        },
      ];
    }
    // Enforce unique piece rule: quantity is locked to 1
    loadedItems = loadedItems.map((item) => ({ ...item, quantity: 1 }));
    setItems(loadedItems);

    getLoyaltySettings().then((s) => setLoyaltySettings(s));

    // Pre-fill signed-in VIP member details if available
    try {
      const rawSess = localStorage.getItem("annr_vip_member_session");
      if (rawSess) {
        const sess = JSON.parse(rawSess);
        const m = sess?.member as VipMember | undefined;
        if (m && m.email) {
          setVipMember(m);
          setCustomerName((prev) => prev || m.full_name || "");
          setEmail((prev) => prev || m.email || "");
          setPhone((prev) => prev || m.phone || "");
          if (m.division) setDivision(m.division);
          if (m.district) setDistrict(m.district);
          if (m.upazila) setUpazila(m.upazila);
          if (m.full_address) setFullAddress(m.full_address);
        }
      }
    } catch {}

    // Pre-fill or auto-apply coupon from URL ?ref= or cart/saved referral code
    try {
      const qsRef =
        new URLSearchParams(window.location.search).get("ref") ||
        new URLSearchParams(window.location.search).get("coupon");
      const savedCoupon =
        qsRef ||
        localStorage.getItem("annr_cart_coupon") ||
        localStorage.getItem("annr_active_ref_code") ||
        "";
      if (savedCoupon && savedCoupon.trim()) {
        const cleanCode = savedCoupon.trim().toUpperCase();
        setCouponCode(cleanCode);
        const initialSubtotal = loadedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        validateReferralCoupon(cleanCode, initialSubtotal).then((res) => {
          if (res.valid) {
            setAppliedCoupon({
              code: cleanCode,
              discountAmount: res.discount_amount || Math.round(initialSubtotal * 0.1),
              pointsReward: res.points_reward ?? 100,
              referrerName: res.referrer_name,
            });
          }
        });
      }
    } catch {}
  }, []);

  // Dynamically match VIP member when customer types email or phone
  useEffect(() => {
    try {
      const all = getAllLocalVipMembers();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, "").replace(/^880/, "0");
      const matched = all.find(
        (m) =>
          (cleanEmail && m.email.toLowerCase().trim() === cleanEmail) ||
          (cleanPhone.length === 11 && m.phone.replace(/\D/g, "").replace(/^880/, "0") === cleanPhone)
      );
      if (matched) {
        setVipMember(matched);
      }
    } catch {}
  }, [email, phone]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Recalculate max redeemable points whenever subtotal, VIP member, or appliedCoupon changes
  useEffect(() => {
    const avail = Number(vipMember?.available_points || 0);
    calculateMaxRedeemablePoints(avail, subtotal, Boolean(appliedCoupon)).then((cap) => {
      setRedemptionCap(cap);
      if (!cap.canRedeem) {
        setPointsToRedeem(0);
      } else {
        // Check if member pre-queued points redemption from VIP Dashboard
        try {
          const queuedPts = Number(localStorage.getItem("annr_checkout_redeem_points") || 0);
          if (queuedPts > 0) {
            setPointsToRedeem(Math.min(queuedPts, cap.maxPoints));
            localStorage.removeItem("annr_checkout_redeem_points");
          } else if (pointsToRedeem > cap.maxPoints) {
            setPointsToRedeem(cap.maxPoints);
          }
        } catch {}
      }
    });
  }, [vipMember, subtotal, appliedCoupon]);

  const shippingFee = calculateShippingFee(division, district);
  const couponDiscountBdt = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const pointsDiscountBdt =
    redemptionCap.canRedeem && pointsToRedeem >= Number(loyaltySettings.min_redemption_points || 50)
      ? Math.round(Math.min(pointsToRedeem, redemptionCap.maxPoints) * redemptionCap.pointValueBdt)
      : 0;
  const totalDiscountBdt = Math.min(subtotal, couponDiscountBdt + pointsDiscountBdt);
  const total = Math.max(0, subtotal - totalDiscountBdt + shippingFee);

  // Calculate projected ANNR Points earned on this order
  const memberMultiplier = Number(vipMember?.tier_multiplier || 1.0);
  const projectedBasePoints =
    loyaltySettings.program_enabled && loyaltySettings.order_earn_enabled
      ? Math.floor((total / 100) * Number(loyaltySettings.points_per_100_bdt || 2) * memberMultiplier)
      : 0;
  const projectedCampaignEval = evaluateOrderCampaignBonuses({
    orderSubtotal: subtotal,
    memberTier: vipMember?.tier || "Silver",
    isFirstOrder: Number(vipMember?.lifetime_orders || 0) === 0,
    basePointsEarned: projectedBasePoints,
  });
  const projectedTotalEarnedPoints = projectedBasePoints + projectedCampaignEval.bonusPoints;

  const availableDistricts = BD_DISTRICTS_BY_DIVISION[division as keyof typeof BD_DISTRICTS_BY_DIVISION] || [];

  const handleDivisionChange = (newDiv: string) => {
    setDivision(newDiv);
    const dists = BD_DISTRICTS_BY_DIVISION[newDiv as keyof typeof BD_DISTRICTS_BY_DIVISION] || [];
    if (dists.length > 0 && dists[0]) {
      setDistrict(dists[0]);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError("");
    setCouponApplying(true);
    try {
      const res = await validateReferralCoupon(couponCode, subtotal, email);
      if (res.valid) {
        const cleanCode = couponCode.toUpperCase().trim();
        setAppliedCoupon({
          code: cleanCode,
          discountAmount: res.discount_amount || Math.round(subtotal * 0.1),
          pointsReward: res.points_reward ?? 100,
          referrerName: res.referrer_name,
        });
        try {
          localStorage.setItem("annr_cart_coupon", cleanCode);
        } catch {}
        setCouponError("");
      } else {
        setCouponError(res.error || "Invalid coupon code");
      }
    } finally {
      setCouponApplying(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim()) {
      setFormError("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (!isValidBdPhone(phone)) {
      setFormError("Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX)");
      return;
    }
    if (!fullAddress.trim()) {
      setFormError("Please enter your delivery address");
      return;
    }
    if (paymentMethod !== "cod" && !trxId.trim()) {
      setFormError(`Please enter your ${paymentMethod.toUpperCase()} Transaction ID (TrxID)`);
      return;
    }

    // Re-verify anti-self-referral before submitting order
    if (appliedCoupon?.code) {
      const checkSelf = await validateReferralCoupon(appliedCoupon.code, subtotal, email);
      if (!checkSelf.valid) {
        setFormError(checkSelf.error || "Coupon validation failed");
        return;
      }
    }

    setOrderSubmitting(true);
    try {
      let remoteOrderResult: any = null;

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.rpc("place_store_order", {
            p_customer_name: customerName.trim(),
            p_email: email.trim(),
            p_phone: phone.trim(),
            p_division: division,
            p_district: district,
            p_full_address: (upazila ? `${upazila}, ` : "") + fullAddress.trim(),
            p_items: items,
            p_payment_method: paymentMethod,
            p_trx_id: trxId.trim() || null,
            p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
            p_customer_notes: customerNotes.trim() || null,
          });

          if (!error && data?.ok) {
            remoteOrderResult = data;
          } else if (error && error.message && error.message.includes("own referral coupon")) {
            setFormError(error.message);
            return;
          }
        } catch {
          // Fall through to local order & referral sync
        }
      }

      const orderNum = remoteOrderResult?.order_number || Math.floor(10000 + Math.random() * 89999);
      const ptsReward = appliedCoupon?.pointsReward ?? Number(loyaltySettings.points_per_referral || 100);
      const effectiveRedeemedPts =
        pointsDiscountBdt > 0 ? Math.min(pointsToRedeem, redemptionCap.maxPoints) : 0;

      // 1. Atomically redeem customer's ANNR Points if selected
      if (effectiveRedeemedPts > 0 && vipMember?.email) {
        const redeemRes = await redeemMemberPointsForOrder({
          memberEmail: vipMember.email,
          pointsToRedeem: effectiveRedeemedPts,
          orderNumber: orderNum,
          orderSubtotal: subtotal,
        });
        if (!redeemRes.ok) {
          setFormError(redeemRes.error || "Could not redeem ANNR Points.");
          setOrderSubmitting(false);
          return;
        }
      }

      // 2. Award purchase & campaign bonus points to buyer if VIP member
      const earnedRes = await awardOrderLoyaltyPoints({
        buyerEmail: email.trim(),
        buyerName: customerName.trim(),
        orderNumber: orderNum,
        orderTotalBdt: total,
      });

      const orderRecord = {
        id: `#${orderNum}`,
        order_number: orderNum,
        customer_name: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        division,
        district,
        full_address: (upazila ? `${upazila}, ` : "") + fullAddress.trim(),
        items,
        total: total.toFixed(2),
        subtotal,
        shipping: shippingFee,
        discount: totalDiscountBdt,
        coupon_discount_bdt: couponDiscountBdt,
        points_redeemed: effectiveRedeemedPts,
        points_discount_bdt: pointsDiscountBdt,
        points_earned: earnedRes.pointsEarned + earnedRes.campaignBonus,
        payment_method: paymentMethod,
        trx_id: trxId.trim() || undefined,
        coupon_code: appliedCoupon?.code,
        referral_points: appliedCoupon ? ptsReward : 0,
        status: "Unfulfilled",
        payment: paymentMethod === "cod" ? "Pending (COD)" : "Paid",
        created_at: new Date().toISOString(),
      };

      try {
        const rawOrders = localStorage.getItem("annr-orders");
        const orders = rawOrders ? JSON.parse(rawOrders) : [];
        orders.unshift(orderRecord);
        localStorage.setItem("annr-orders", JSON.stringify(orders.slice(0, 500)));

        // 3. Credit referral points, coupon usage count, and referral log to the coupon owner
        if (appliedCoupon?.code && ptsReward > 0) {
          creditVipReferrerLocally({
            referralCode: appliedCoupon.code,
            pointsReward: ptsReward,
            buyerName: customerName.trim(),
            buyerEmail: email.trim(),
            buyerPhone: phone.trim(),
            orderNumber: orderNum,
            orderTotal: total,
            discountGiven: couponDiscountBdt,
            eventType: "order",
          });
        }

        localStorage.removeItem("annr-cart");
        localStorage.removeItem("shihiko-cart");
        localStorage.removeItem("annr_cart_coupon");

        // Mark purchased one-of-one pieces as sold in local store and Supabase
        try {
          const rawAdm = localStorage.getItem("shihiko-admin-v1");
          if (rawAdm) {
            const adm = JSON.parse(rawAdm);
            if (Array.isArray(adm.products)) {
              adm.products = adm.products.map((p: any) => {
                if (items.some((it) => it.id === p.id || (p.handle && it.id === p.handle) || it.title === p.title)) {
                  return { ...p, status: "sold", stock: 0, soldAt: new Date().toISOString() };
                }
                return p;
              });
              localStorage.setItem("shihiko-admin-v1", JSON.stringify(adm));
            }
          }
        } catch {}

        if (isSupabaseConfigured()) {
          for (const it of items) {
            if (it.id && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(it.id)) {
              supabase.rpc("mark_product_sold", { p_product_id: it.id }).then(() => {}).catch(() => {});
            }
          }
        }
      } catch {}

      setOrderSuccess({
        ok: true,
        order_number: orderNum,
        subtotal,
        shipping: shippingFee,
        discount: totalDiscountBdt,
        coupon_discount: couponDiscountBdt,
        points_redeemed: effectiveRedeemedPts,
        points_discount: pointsDiscountBdt,
        points_earned: earnedRes.pointsEarned + earnedRes.campaignBonus,
        total,
      });
    } catch (err: any) {
      setFormError(err?.message || "Order submission failed");
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          color: "#ffffff",
          fontFamily: "'NB Architekt Std', sans-serif",
          padding: "60px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 540,
            width: "100%",
            background: "#111111",
            border: "1px solid #222222",
            borderRadius: 6,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "Rockybilly, cursive", fontSize: 36, color: "#ffffff", marginBottom: 12 }}>
            AnnR
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Order Confirmed ✓
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 24 }}>
            Order #{orderSuccess.order_number} · Receipt sent to {email}
          </div>

          <div
            style={{
              background: "#181818",
              padding: 16,
              borderRadius: 4,
              textAlign: "left",
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Customer:</span>
              <b>{customerName}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Destination:</span>
              <b>{district}, {division}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Payment:</span>
              <b style={{ textTransform: "uppercase" }}>
                {paymentMethod} {trxId ? `(Trx: ${trxId})` : ""}
              </b>
            </div>
            {orderSuccess.points_redeemed > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#fa9442" }}>
                <span>ANNR Points Redeemed ({orderSuccess.points_redeemed} PTS):</span>
                <b>-৳{orderSuccess.points_discount}</b>
              </div>
            )}
            {orderSuccess.points_earned > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#22c55e" }}>
                <span>ANNR VIP Points Earned:</span>
                <b>+{orderSuccess.points_earned} PTS</b>
              </div>
            )}
            <div
              style={{
                borderTop: "1px solid #282828",
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
              }}
            >
              <span>Total Payable:</span>
              <b style={{ color: "#ffffff" }}>৳{orderSuccess.total?.toLocaleString() || total.toLocaleString()}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="/account/login/index.html"
              style={{
                flex: 1,
                display: "block",
                background: "#1c1c22",
                color: "#f3e7d6",
                border: "1px solid #fa9442",
                textDecoration: "none",
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                borderRadius: 3,
              }}
            >
              Open VIP Wallet →
            </a>
            <a
              href="/home.html"
              style={{
                flex: 1,
                display: "block",
                background: "#ffffff",
                color: "#000000",
                textDecoration: "none",
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                borderRadius: 3,
              }}
            >
              Return to Shop →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#ffffff",
        fontFamily: "'NB Architekt Std', -apple-system, sans-serif",
        padding: "40px 20px 80px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a
              href="/home.html"
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 11,
                opacity: 0.7,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              ← Back to Shop
            </a>
          </div>
          <div style={{ fontFamily: "Rockybilly, cursive", fontSize: 32, color: "#ffffff" }}>AnnR</div>
          <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>SECURE CHECKOUT</div>
        </div>

        {formError && (
          <div
            style={{
              background: "rgba(225, 6, 0, 0.15)",
              border: "1px solid #e10600",
              color: "#ff8b88",
              padding: "10px 16px",
              borderRadius: 4,
              fontSize: 12,
              marginBottom: 20,
            }}
          >
            {formError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
          {/* Left Column: Customer Details & Shipping */}
          <div>
            <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: 6, padding: 20 }}>
                <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
                  1. Delivery Details (Bangladesh)
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        textTransform: "uppercase",
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Asif Rahman"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#181818",
                        border: "1px solid #2e2e2e",
                        borderRadius: 4,
                        padding: "9px 12px",
                        color: "#fff",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: "100%",
                          background: "#181818",
                          border: "1px solid #2e2e2e",
                          borderRadius: 4,
                          padding: "9px 12px",
                          color: "#fff",
                          fontSize: 13,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="017XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          width: "100%",
                          background: "#181818",
                          border: "1px solid #2e2e2e",
                          borderRadius: 4,
                          padding: "9px 12px",
                          color: "#fff",
                          fontSize: 13,
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Division & District Dropdowns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        Division *
                      </label>
                      <select
                        value={division}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        style={{
                          width: "100%",
                          background: "#181818",
                          border: "1px solid #2e2e2e",
                          borderRadius: 4,
                          padding: "9px 12px",
                          color: "#fff",
                          fontSize: 13,
                          boxSizing: "border-box",
                        }}
                      >
                        {BD_DIVISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        District (Zilla) *
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        style={{
                          width: "100%",
                          background: "#181818",
                          border: "1px solid #2e2e2e",
                          borderRadius: 4,
                          padding: "9px 12px",
                          color: "#fff",
                          fontSize: 13,
                          boxSizing: "border-box",
                        }}
                      >
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        textTransform: "uppercase",
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      Thana / Upazila
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhanmondi, Mirpur, Uttara"
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#181818",
                        border: "1px solid #2e2e2e",
                        borderRadius: 4,
                        padding: "9px 12px",
                        color: "#fff",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        textTransform: "uppercase",
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      Full Street Address *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="House number, road number, flat/apt details"
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#181818",
                        border: "1px solid #2e2e2e",
                        borderRadius: 4,
                        padding: "9px 12px",
                        color: "#fff",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: 6, padding: 20 }}>
                <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
                  2. Payment Method
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: paymentMethod === "cod" ? "#1e1e1e" : "#141414",
                      border: `1px solid ${paymentMethod === "cod" ? "#ffffff" : "#282828"}`,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Cash on Delivery (COD)</div>
                      <div style={{ fontSize: 11, opacity: 0.65 }}>Pay in cash upon doorstep delivery</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: paymentMethod === "bkash" ? "#1e1e1e" : "#141414",
                      border: `1px solid ${paymentMethod === "bkash" ? "#ffffff" : "#282828"}`,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "bkash"}
                      onChange={() => setPaymentMethod("bkash")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#E2136E" }}>bKash Payment</div>
                      <div style={{ fontSize: 11, opacity: 0.65 }}>Send Money / Merchant payment with TrxID</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: paymentMethod === "nagad" ? "#1e1e1e" : "#141414",
                      border: `1px solid ${paymentMethod === "nagad" ? "#ffffff" : "#282828"}`,
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "nagad"}
                      onChange={() => setPaymentMethod("nagad")}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#F7941D" }}>Nagad Payment</div>
                      <div style={{ fontSize: 11, opacity: 0.65 }}>Send Money to AnnR official wallet</div>
                    </div>
                  </label>

                  {paymentMethod !== "cod" && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 14,
                        background: "#161616",
                        borderRadius: 4,
                        border: "1px dashed #333",
                      }}
                    >
                      <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.85 }}>
                        Send <b>৳{total.toLocaleString()}</b> to AnnR {paymentMethod.toUpperCase()} Wallet:{" "}
                        <b style={{ fontFamily: "monospace", color: "#fff" }}>01700000000</b>
                      </div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9B8A7C6D5E"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        style={{
                          width: "100%",
                          background: "#0e0e0e",
                          border: "1px solid #333",
                          borderRadius: 4,
                          padding: "8px 10px",
                          color: "#fff",
                          fontFamily: "monospace",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={orderSubmitting || items.length === 0}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: 4,
                  padding: "16px 24px",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {orderSubmitting ? "Processing Order…" : `Place Order (৳${total.toLocaleString()}) →`}
              </button>
            </form>
          </div>

          {/* Right Column: Order Items, Referral Coupon, ANNR Points Redemption & Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#111111", border: "1px solid #222222", borderRadius: 6, padding: 20 }}>
              <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
                Order Summary ({items.reduce((n, i) => n + i.quantity, 0)})
              </h2>

              {/* Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, background: "#222" }}
                      />
                    )}
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.size && <div style={{ fontSize: 10, opacity: 0.6 }}>Size: {item.size}</div>}
                      <div style={{ opacity: 0.75 }}>
                        ৳{item.price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="VIP or Promo Coupon (e.g. VIP-RATUL88)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    background: "#181818",
                    border: "1px solid #2e2e2e",
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                />
                <button
                  type="submit"
                  disabled={couponApplying || !couponCode.trim()}
                  style={{
                    background: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    color: "#ffffff",
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {couponApplying ? "…" : "Apply"}
                </button>
              </form>

              {appliedCoupon && (
                <div
                  style={{
                    background: "rgba(0, 128, 96, 0.15)",
                    border: "1px solid #008060",
                    color: "#4ade80",
                    padding: "8px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    marginBottom: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <b>{appliedCoupon.code}</b> applied (-৳{appliedCoupon.discountAmount})
                    {appliedCoupon.referrerName && (
                      <div style={{ fontSize: 10, opacity: 0.8 }}>Referred by {appliedCoupon.referrerName}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                    style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 14 }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {couponError && (
                <div style={{ color: "#ff8b88", fontSize: 11, marginBottom: 12 }}>{couponError}</div>
              )}

              {/* ANNR Points Wallet Redemption Section */}
              {loyaltySettings.program_enabled && loyaltySettings.redemption_enabled && (
                <div
                  style={{
                    background: "#15161e",
                    border: "1px solid rgba(250, 148, 66, 0.35)",
                    borderRadius: 5,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fa9442", letterSpacing: 1, textTransform: "uppercase" }}>
                      ⚡ ANNR VIP Points Wallet
                    </span>
                    {vipMember ? (
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "#22c55e", fontWeight: 700 }}>
                        {vipMember.available_points} PTS (৳{Math.round(vipMember.available_points * redemptionCap.pointValueBdt)})
                      </span>
                    ) : (
                      <a href="/account/login/index.html" style={{ fontSize: 10, color: "#f3e7d6", textDecoration: "underline" }}>
                        Join / Sign In (+100 PTS)
                      </a>
                    )}
                  </div>

                  {!vipMember ? (
                    <div style={{ fontSize: 11, color: "#9ea1b8", lineHeight: 1.4 }}>
                      Enter your registered VIP email/phone on the left or{" "}
                      <a href="/account/login/index.html" style={{ color: "#fa9442" }}>
                        sign in to your VIP Vault
                      </a>{" "}
                      to redeem ANNR Points for an instant discount.
                    </div>
                  ) : !redemptionCap.canRedeem ? (
                    <div style={{ fontSize: 11, color: "#9ea1b8" }}>{redemptionCap.reason}</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: "#c4c7d4", marginBottom: 8 }}>
                        Redeem up to <b>{redemptionCap.maxPoints} PTS</b> (<b>-৳{redemptionCap.maxDiscountBdt}</b>) on this order:
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="range"
                          min={0}
                          max={redemptionCap.maxPoints}
                          step={10}
                          value={pointsToRedeem}
                          onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                          style={{ flex: 1, accentColor: "#fa9442" }}
                        />
                        <input
                          type="number"
                          min={0}
                          max={redemptionCap.maxPoints}
                          value={pointsToRedeem}
                          onChange={(e) =>
                            setPointsToRedeem(Math.max(0, Math.min(redemptionCap.maxPoints, Number(e.target.value) || 0)))
                          }
                          style={{
                            width: 68,
                            background: "#0d0e14",
                            border: "1px solid #333",
                            color: "#fff",
                            padding: "5px 6px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: "monospace",
                            textAlign: "center",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPointsToRedeem(pointsToRedeem === redemptionCap.maxPoints ? 0 : redemptionCap.maxPoints)
                          }
                          style={{
                            background: pointsToRedeem > 0 ? "#fa9442" : "#27272a",
                            color: pointsToRedeem > 0 ? "#000" : "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "6px 10px",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          {pointsToRedeem === redemptionCap.maxPoints ? "Clear" : "Max"}
                        </button>
                      </div>
                      {pointsDiscountBdt > 0 && (
                        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6, fontWeight: 600 }}>
                          ✓ Redeeming {pointsToRedeem} ANNR Points for -৳{pointsDiscountBdt.toLocaleString()} instant discount
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cost Breakdown */}
              <div
                style={{
                  borderTop: "1px solid #222",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.7 }}>Items Subtotal:</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
                {appliedCoupon && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#4ade80" }}>
                    <span>Referral / Promo Coupon ({appliedCoupon.code}):</span>
                    <span>-৳{couponDiscountBdt.toLocaleString()}</span>
                  </div>
                )}
                {pointsDiscountBdt > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#fa9442" }}>
                    <span>ANNR Points Redeemed ({pointsToRedeem} PTS):</span>
                    <span>-৳{pointsDiscountBdt.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.7 }}>Shipping ({district}):</span>
                  <span>৳{shippingFee}</span>
                </div>
                <div
                  style={{
                    borderTop: "1px solid #282828",
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  <span>Total Payable:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>

                {projectedTotalEarnedPoints > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: "8px 10px",
                      background: "rgba(34, 197, 94, 0.08)",
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                      borderRadius: 4,
                      fontSize: 11,
                      color: "#4ade80",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      Reward on Order Completion
                      {projectedCampaignEval.bonusPoints > 0 ? ` (incl. +${projectedCampaignEval.bonusPoints} Campaign Bonus)` : ""}:
                    </span>
                    <b>+{projectedTotalEarnedPoints} ANNR PTS</b>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
