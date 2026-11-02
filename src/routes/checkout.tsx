import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, calculateShippingFee, isValidBdPhone } from "../lib/bangladesh-geo";
import { validateReferralCoupon } from "../lib/loyalty";
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
    referrerName?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Read cart items from localStorage or fallback
    try {
      const raw = localStorage.getItem("annr-cart") || localStorage.getItem("shihiko-cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          return;
        }
      }
    } catch {}

    // Default sample item if empty so the checkout page is interactive
    setItems([
      {
        id: "prod-1",
        title: "AnnR Divine Sanctum Heavyweight Hoodie",
        price: 4800,
        quantity: 1,
        size: "L",
        image: "/cdn/shop/files/clocked-out-hoodie-black-1.jpg",
      },
    ]);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = calculateShippingFee(division, district);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

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
        setAppliedCoupon({
          code: couponCode.toUpperCase().trim(),
          discountAmount: res.discount_amount || Math.round(subtotal * 0.1),
          referrerName: (res as any).referrer_name,
        });
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

    setOrderSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
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
          setOrderSuccess(data);
          try {
            localStorage.removeItem("annr-cart");
            localStorage.removeItem("shihiko-cart");
          } catch {}
          return;
        } else if (error) {
          setFormError(error.message);
          return;
        }
      }

      // Save order to local orders queue for admin synchronization
      const mockOrderNum = Math.floor(10000 + Math.random() * 89999);
      const orderRecord = {
        id: `#${mockOrderNum}`,
        order_number: mockOrderNum,
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
        discount: discountAmount,
        payment_method: paymentMethod,
        trx_id: trxId.trim() || undefined,
        coupon_code: appliedCoupon?.code,
        referral_points: 100,
        status: "Unfulfilled",
        payment: paymentMethod === "cod" ? "Pending (COD)" : "Paid",
        created_at: new Date().toISOString(),
      };

      try {
        const rawOrders = localStorage.getItem("annr-orders");
        const orders = rawOrders ? JSON.parse(rawOrders) : [];
        orders.unshift(orderRecord);
        localStorage.setItem("annr-orders", JSON.stringify(orders.slice(0, 500)));

        // If referral coupon was used, credit pending points to the member
        if (appliedCoupon?.code) {
          const rawMembers = localStorage.getItem("annr-vip-members");
          if (rawMembers) {
            try {
              const members = JSON.parse(rawMembers);
              const owner = members.find((m: any) => m.referral_code?.toUpperCase() === appliedCoupon.code.toUpperCase());
              if (owner) {
                owner.pending_points = (owner.pending_points || 0) + 100;
                owner.total_earned_points = (owner.total_earned_points || 0) + 100;
                localStorage.setItem("annr-vip-members", JSON.stringify(members));
              }
            } catch {}
          }

          // Also update active VIP member session if matching
          const rawSess = localStorage.getItem("annr_vip_member_session");
          if (rawSess) {
            try {
              const sess = JSON.parse(rawSess);
              const matchCode = (sess.coupon?.code || sess.member?.referral_code || "").toUpperCase();
              if (matchCode === appliedCoupon.code.toUpperCase()) {
                sess.member = sess.member || {};
                sess.coupon = sess.coupon || {};
                sess.member.pending_points = (sess.member.pending_points || 0) + 100;
                sess.member.total_earned_points = (sess.member.total_earned_points || 0) + 100;
                sess.coupon.times_used = (sess.coupon.times_used || 0) + 1;
                sess.coupon.total_points_generated = (sess.coupon.total_points_generated || 0) + 100;
                localStorage.setItem("annr_vip_member_session", JSON.stringify(sess));
              }
            } catch {}
          }
        }
      } catch {}

      setOrderSuccess({
        ok: true,
        order_number: mockOrderNum,
        subtotal,
        shipping: shippingFee,
        discount: discountAmount,
        total,
      });

      try {
        localStorage.removeItem("annr-cart");
      } catch {}
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
              <b style={{ textTransform: "uppercase" }}>{paymentMethod} {trxId ? `(Trx: ${trxId})` : ""}</b>
            </div>
            <div style={{ borderTop: "1px solid #282828", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>Total Payable:</span>
              <b style={{ color: "#ffffff" }}>৳{orderSuccess.total?.toLocaleString() || total.toLocaleString()}</b>
            </div>
          </div>

          <a
            href="/home.html"
            style={{
              display: "block",
              background: "#ffffff",
              color: "#000000",
              textDecoration: "none",
              padding: "12px 20px",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              borderRadius: 3,
            }}
          >
            Return to Storefront →
          </a>
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
                    <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                      <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                      <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                      <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                      <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                    <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                    <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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
                    <div style={{ marginTop: 8, padding: 14, background: "#161616", borderRadius: 4, border: "1px dashed #333" }}>
                      <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.85 }}>
                        Send <b>৳{total.toLocaleString()}</b> to AnnR {paymentMethod.toUpperCase()} Wallet:{" "}
                        <b style={{ fontFamily: "monospace", color: "#fff" }}>01700000000</b>
                      </div>
                      <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
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

          {/* Right Column: Order Items, Coupon & Summary */}
          <div>
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
              <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="VIP or Promo Coupon"
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
                    marginBottom: 16,
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
                    <span>Coupon Discount:</span>
                    <span>-৳{appliedCoupon.discountAmount.toLocaleString()}</span>
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
                  <span>Total:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
