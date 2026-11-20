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
import { supabase, isSupabaseConfigured, supabaseUrl, supabasePublishableKey } from "../lib/supabase";

const ANNR_CHECKOUT_FONTS = [
  { rel: "stylesheet", href: "/cdn/shop/t/75/assets/Druk-Wide.css" },
  { rel: "stylesheet", href: "/cdn/shop/t/75/assets/NB-Architekt.css" },
  { rel: "stylesheet", href: "/cdn/shop/t/75/assets/FKGroteskSemiMono.css" },
  { rel: "stylesheet", href: "/cdn/shop/t/75/assets/fonts.css" },
];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — AnnR" },
      { name: "description", content: "Secure archival 1-of-1 checkout for AnnR Bangladesh." },
    ],
    links: [
      ...ANNR_CHECKOUT_FONTS,
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  component: CheckoutPage,
});

interface CartItem {
  id: string;
  handle?: string;
  code?: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  showSize?: boolean;
}

const FREE_SHIPPING_THRESHOLD_BDT = 5000;
const ANNR_WHATSAPP_NUMBER = "8801602888198";
const ANNR_WHATSAPP_DISPLAY = "+880 1602-888198";
const WHATSAPP_RECEIPT_STORAGE_KEY = "annr_last_order_receipt";

function formatDhakaTimestamp(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatPaymentMethodLabel(method: string): string {
  if (method === "bkash") return "bKash";
  if (method === "nagad") return "Nagad";
  if (method === "rocket") return "Rocket";
  return "Cash on Delivery (COD)";
}

function buildWhatsAppOrderMessage(params: {
  orderNumber: number;
  items: CartItem[];
  customerName: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  upazila: string;
  fullAddress: string;
  customerNotes: string;
  paymentMethod: string;
  trxId: string;
  subtotal: number;
  shippingFee: number;
  couponCode?: string | undefined;
  couponDiscountBdt: number;
  pointsRedeemed: number;
  pointsDiscountBdt: number;
  total: number;
  vipTier?: string | undefined;
}): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://fashion.annr.site";

  const lines: string[] = [
    "*ANNR - NEW 1-OF-1 ORDER*",
    "==============================",
    `*Order Ref:* #${params.orderNumber}`,
    `*Date (BDT):* ${formatDhakaTimestamp(new Date())}`,
    "",
    "*ORDERED PIECE(S)*",
    "------------------------------",
  ];

  params.items.forEach((item, idx) => {
    const cleanTitle = String(item.title || "Archival Piece").trim().toUpperCase();
    lines.push(`${idx + 1}. *${cleanTitle}*`);
    if (item.code) lines.push(`   Code: ${item.code}`);
    lines.push("   Edition: 1-of-1 Archival Piece");
    if (item.showSize !== false && item.size && item.size !== "NONE") {
      lines.push(`   Size: ${item.size}`);
    } else {
      lines.push("   Sizing: Exact Flat Measurements");
    }
    lines.push(`   Qty: 1`);
    lines.push(`   Price: Tk ${(item.price * item.quantity).toLocaleString()} BDT`);
    if (item.handle) {
      lines.push(`   Link: ${origin}/products/${item.handle}/index.html`);
    }
  });

  lines.push(
    "",
    "*CUSTOMER CONTACT*",
    "------------------------------",
    `Name: ${params.customerName}`,
    `Mobile: ${params.phone}`,
    `Email: ${params.email}`,
  );
  if (params.vipTier) {
    lines.push(`VIP Status: ${params.vipTier} Member`);
  }

  lines.push(
    "",
    "*DELIVERY ADDRESS (BANGLADESH)*",
    "------------------------------",
    `Address: ${params.fullAddress}`,
  );
  if (params.upazila) lines.push(`Thana / Area: ${params.upazila}`);
  lines.push(`District: ${params.district}`, `Division: ${params.division}`);
  if (params.customerNotes) lines.push(`Delivery Note: ${params.customerNotes}`);

  lines.push(
    "",
    "*PAYMENT & TOTALS*",
    "------------------------------",
    `Payment Method: ${formatPaymentMethodLabel(params.paymentMethod)}`,
  );
  if (params.paymentMethod !== "cod") {
    lines.push(`TrxID: ${params.trxId ? params.trxId : "Will confirm in WhatsApp"}`);
  }
  lines.push(`Subtotal: Tk ${params.subtotal.toLocaleString()} BDT`);
  if (params.couponCode && params.couponDiscountBdt > 0) {
    lines.push(`Promo / Referral (${params.couponCode}): -Tk ${params.couponDiscountBdt.toLocaleString()} BDT`);
  }
  if (params.pointsRedeemed > 0 && params.pointsDiscountBdt > 0) {
    lines.push(`VIP Points (${params.pointsRedeemed} PTS): -Tk ${params.pointsDiscountBdt.toLocaleString()} BDT`);
  }
  lines.push(
    `Shipping (${params.district}): ${params.shippingFee === 0 ? "FREE" : `Tk ${params.shippingFee} BDT`}`,
    `*TOTAL PAYABLE: Tk ${params.total.toLocaleString()} BDT*`,
    "==============================",
    "Please confirm my 1-of-1 order and delivery schedule. Thank you!",
  );

  return lines.join("\n");
}

function buildWhatsAppLinks(message: string): { waUrl: string; waAppUrl: string } {
  const encoded = encodeURIComponent(message);
  return {
    waUrl: `https://api.whatsapp.com/send?phone=${ANNR_WHATSAPP_NUMBER}&text=${encoded}`,
    waAppUrl: `whatsapp://send?phone=${ANNR_WHATSAPP_NUMBER}&text=${encoded}`,
  };
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2Zm5.82 14.01c-.24.69-1.41 1.31-1.95 1.39-.5.08-1.13.11-1.83-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.19-1.58-1.19-3.02 0-1.44.75-2.15 1.02-2.44.27-.29.59-.36.79-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.04.9 2.19.07.15.12.32.02.51-.1.19-.15.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.76 1.26 1.64 2.04 1.13 1.01 2.08 1.32 2.38 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.29.39-.24.66-.15.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.13.07.72-.17 1.4Z" />
    </svg>
  );
}

const CHECKOUT_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0a0a0a;
    -webkit-font-smoothing: antialiased;
  }
  .annr-chk-root {
    min-height: 100vh;
    background: #ffffff;
    color: #0a0a0a;
    font-family: 'NB Architekt Std', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex;
    flex-direction: column;
  }
  .annr-chk-root *, .annr-chk-root *::before, .annr-chk-root *::after {
    box-sizing: border-box;
  }
  .annr-chk-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #e6e6e2;
  }
  .annr-chk-header-inner {
    max-width: 1220px;
    margin: 0 auto;
    padding: 0 28px;
    height: 74px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
  }
  .annr-chk-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #0a0a0a;
    text-decoration: none;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    width: max-content;
    transition: opacity 0.2s;
  }
  .annr-chk-back:hover { opacity: 0.6; }
  .annr-chk-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  .annr-chk-logo img {
    height: 36px;
    width: auto;
    display: block;
    filter: brightness(0);
  }
  .annr-chk-secure {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #525252;
  }
  .annr-chk-shell {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.18fr) minmax(360px, 0.82fr);
    max-width: 1220px;
    width: 100%;
    margin: 0 auto;
  }
  .annr-chk-main {
    padding: 36px 48px 64px 28px;
    background: #ffffff;
  }
  .annr-chk-aside {
    padding: 36px 28px 64px 40px;
    background: #f7f6f3;
    border-left: 1px solid #e6e6e2;
  }
  .annr-chk-aside-sticky {
    position: sticky;
    top: 102px;
  }
  .annr-chk-crumb {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: #737373;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .annr-chk-crumb .active {
    color: #0a0a0a;
    font-weight: 600;
  }
  .annr-chk-section {
    margin-bottom: 32px;
    padding-bottom: 28px;
    border-bottom: 1px solid #ecece8;
  }
  .annr-chk-section:last-of-type {
    border-bottom: none;
    margin-bottom: 24px;
    padding-bottom: 0;
  }
  .annr-chk-section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .annr-chk-section-title {
    margin: 0;
    font-family: 'Druk Wide', 'NB Architekt Std', sans-serif;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #0a0a0a;
  }
  .annr-chk-section-step {
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: #e05a2b;
    text-transform: uppercase;
    margin-right: 10px;
  }
  .annr-chk-section-link {
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.8px;
    color: #525252;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .annr-chk-section-link:hover { color: #0a0a0a; }
  .annr-chk-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .annr-chk-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .annr-chk-field label {
    display: block;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: #525252;
    margin-bottom: 6px;
  }
  .annr-chk-field input,
  .annr-chk-field select,
  .annr-chk-field textarea {
    width: 100%;
    background: #ffffff;
    border: 1px solid #d4d4d0;
    border-radius: 2px;
    padding: 12px 14px;
    color: #0a0a0a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .annr-chk-field input:focus,
  .annr-chk-field select:focus,
  .annr-chk-field textarea:focus {
    border-color: #0a0a0a;
    box-shadow: 0 0 0 1px #0a0a0a;
  }
  .annr-chk-field input::placeholder,
  .annr-chk-field textarea::placeholder {
    color: #a3a3a3;
  }
  .annr-chk-pay-list {
    display: flex;
    flex-direction: column;
    border: 1px solid #d4d4d0;
    border-radius: 2px;
    overflow: hidden;
  }
  .annr-chk-pay-opt {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 15px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e6e6e2;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .annr-chk-pay-opt:last-child { border-bottom: none; }
  .annr-chk-pay-opt.is-selected {
    background: #faf9f7;
  }
  .annr-chk-radio {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid #a3a3a3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    flex-shrink: 0;
    transition: border-color 0.15s;
  }
  .annr-chk-pay-opt.is-selected .annr-chk-radio {
    border-color: #0a0a0a;
  }
  .annr-chk-radio::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #0a0a0a;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .annr-chk-pay-opt.is-selected .annr-chk-radio::after {
    opacity: 1;
  }
  .annr-chk-pay-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: #0a0a0a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .annr-chk-pay-sub {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    color: #666666;
    margin-top: 3px;
  }
  .annr-chk-pay-pill {
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    padding: 2px 6px;
    border: 1px solid #d4d4d0;
    color: #525252;
    text-transform: uppercase;
  }
  .annr-chk-mfs-box {
    background: #f7f6f3;
    border-top: 1px solid #e6e6e2;
    padding: 16px;
  }
  .annr-chk-submit {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #0a0a0a;
    color: #ffffff;
    border: 1px solid #0a0a0a;
    border-radius: 2px;
    padding: 18px 20px;
    min-height: 56px;
    font-family: 'NB Architekt Std', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .annr-chk-submit:hover:not(:disabled) {
    background: #202020;
  }
  .annr-chk-submit:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .annr-chk-wa-caption {
    margin: 10px 0 0;
    text-align: center;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 0.9px;
    color: #666666;
    line-height: 1.5;
  }
  .annr-chk-wa-primary {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #0a0a0a;
    color: #ffffff;
    border: 1px solid #0a0a0a;
    border-radius: 2px;
    padding: 16px 18px;
    font-family: 'NB Architekt Std', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .annr-chk-wa-primary:hover { background: #222222; }
  .annr-chk-wa-secondary {
    flex: 1;
    min-width: 150px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #ffffff;
    color: #0a0a0a;
    border: 1px solid #d4d4d0;
    border-radius: 2px;
    padding: 11px 12px;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .annr-chk-wa-secondary:hover {
    border-color: #0a0a0a;
    background: #faf9f7;
  }
  .annr-chk-wa-preview {
    margin: 18px 0 22px;
    padding: 14px 16px;
    background: #faf9f6;
    border: 1px solid #e6e6e2;
    text-align: left;
    font-family: 'FK Grotesk SemiMono', ui-monospace, SFMono-Regular, monospace;
    font-size: 11px;
    line-height: 1.55;
    color: #262626;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 220px;
    overflow-y: auto;
  }
  .annr-chk-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 3px solid #dc2626;
    color: #991b1b;
    padding: 12px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    margin-bottom: 20px;
  }
  .annr-chk-item {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid #e6e6e2;
  }
  .annr-chk-item-thumb {
    position: relative;
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    background: #ffffff;
    border: 1px solid #e2e2dd;
    overflow: hidden;
  }
  .annr-chk-item-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .annr-chk-item-qty {
    position: absolute;
    top: 4px;
    left: 4px;
    background: #0a0a0a;
    color: #ffffff;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 8.5px;
    letter-spacing: 0.8px;
    padding: 2px 5px;
    text-transform: uppercase;
  }
  .annr-chk-coupon-row {
    display: flex;
    gap: 8px;
    margin: 18px 0 12px;
  }
  .annr-chk-coupon-row input {
    flex: 1;
    background: #ffffff;
    border: 1px solid #d4d4d0;
    border-radius: 2px;
    padding: 11px 12px;
    color: #0a0a0a;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    outline: none;
  }
  .annr-chk-coupon-row input:focus { border-color: #0a0a0a; }
  .annr-chk-coupon-row button {
    background: #0a0a0a;
    color: #ffffff;
    border: 1px solid #0a0a0a;
    border-radius: 2px;
    padding: 0 18px;
    font-family: 'NB Architekt Std', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .annr-chk-coupon-row button:disabled { opacity: 0.4; cursor: not-allowed; }
  .annr-chk-vip-box {
    background: #ffffff;
    border: 1px solid #e2e2dd;
    padding: 14px 16px;
    margin: 14px 0 18px;
  }
  .annr-chk-totals {
    border-top: 1px solid #deded9;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
  }
  .annr-chk-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #404040;
  }
  .annr-chk-grand {
    border-top: 1px solid #0a0a0a;
    padding-top: 14px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    color: #0a0a0a;
  }
  .annr-chk-footer {
    margin-top: 36px;
    padding-top: 18px;
    border-top: 1px solid #ecece8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    font-family: 'FK Grotesk SemiMono', monospace;
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #737373;
  }
  .annr-chk-footer a {
    color: #525252;
    text-decoration: none;
  }
  .annr-chk-footer a:hover { color: #0a0a0a; text-decoration: underline; }
  @media (max-width: 920px) {
    .annr-chk-shell {
      grid-template-columns: 1fr;
    }
    .annr-chk-aside {
      order: -1;
      border-left: none;
      border-bottom: 1px solid #e6e6e2;
      padding: 20px 16px;
    }
    .annr-chk-aside-sticky { position: static; }
    .annr-chk-main {
      padding: 24px 16px 52px;
    }
    .annr-chk-header-inner {
      padding: 0 14px;
      height: 60px;
      gap: 8px;
    }
    .annr-chk-logo img {
      height: 30px;
    }
    .annr-chk-back {
      font-size: 10px;
      letter-spacing: 1px;
    }
    .annr-chk-secure span.hide-sm { display: none; }
    .annr-chk-grid-2 { grid-template-columns: 1fr; }
  }
  @media (max-width: 767px) {
    .annr-chk-field input,
    .annr-chk-field select,
    .annr-chk-field textarea,
    .annr-chk-coupon-row input {
      font-size: 16px;
      padding: 12px 13px;
    }
    .annr-chk-section-title {
      font-size: 12.5px;
    }
    .annr-chk-submit {
      font-size: 12px;
      letter-spacing: 1.4px;
      padding: 16px 14px;
    }
    .annr-chk-receipt-card {
      padding: 26px 18px !important;
    }
  }
`;

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
    pointsReward?: number | undefined;
    referrerName?: string | undefined;
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
  const [copiedWaText, setCopiedWaText] = useState(false);
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

    // Enforce unique piece rule: quantity is locked to 1
    loadedItems = loadedItems.map((item) => ({ ...item, quantity: 1 }));
    setItems(loadedItems);

    // If user just returned from WhatsApp with an empty bag, restore their recent order receipt (<15m)
    if (loadedItems.length === 0) {
      try {
        const rawReceipt = sessionStorage.getItem(WHATSAPP_RECEIPT_STORAGE_KEY);
        if (rawReceipt) {
          const parsedReceipt = JSON.parse(rawReceipt);
          if (parsedReceipt?.savedAt && Date.now() - Number(parsedReceipt.savedAt) < 15 * 60 * 1000) {
            setOrderSuccess(parsedReceipt);
            if (parsedReceipt.customerName) setCustomerName(parsedReceipt.customerName);
            if (parsedReceipt.email) setEmail(parsedReceipt.email);
            if (parsedReceipt.district) setDistrict(parsedReceipt.district);
            if (parsedReceipt.division) setDivision(parsedReceipt.division);
            if (parsedReceipt.paymentMethod) setPaymentMethod(parsedReceipt.paymentMethod);
            if (parsedReceipt.trxId) setTrxId(parsedReceipt.trxId);
          }
        }
      } catch {}
    }

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

  const baseShippingFee = calculateShippingFee(division, district);
  const shippingFee =
    items.length === 0 || subtotal <= 0
      ? 0
      : subtotal >= FREE_SHIPPING_THRESHOLD_BDT
        ? 0
        : baseShippingFee;
  const couponDiscountBdt = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const pointsDiscountBdt =
    redemptionCap.canRedeem && pointsToRedeem >= Number(loyaltySettings.min_redemption_points || 50)
      ? Math.round(Math.min(pointsToRedeem, redemptionCap.maxPoints) * redemptionCap.pointValueBdt)
      : 0;
  const totalDiscountBdt = Math.min(subtotal, couponDiscountBdt + pointsDiscountBdt);
  const total = Math.max(0, subtotal - totalDiscountBdt + shippingFee);

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

  const handleRemoveItem = (idToRemove: string) => {
    const next = items.filter((it) => it.id !== idToRemove);
    setItems(next);
    try {
      if (next.length === 0) localStorage.removeItem("annr-cart");
      else localStorage.setItem("annr-cart", JSON.stringify(next));
    } catch {}
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

  const handleCopyWaMessage = async (msg: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(msg);
      } else {
        const ta = document.createElement("textarea");
        ta.value = msg;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopiedWaText(true);
      setTimeout(() => setCopiedWaText(false), 2600);
    } catch {}
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanName = customerName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = fullAddress.trim();
    const cleanUpazila = upazila.trim();
    const cleanNotes = customerNotes.trim();
    const cleanTrxId = trxId.trim();

    if (items.length === 0) {
      setFormError("Your bag is empty. Please select an archival piece first.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!isValidBdPhone(cleanPhone)) {
      setFormError("Please enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).");
      return;
    }
    if (!cleanName) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!cleanAddress) {
      setFormError("Please enter your full street delivery address.");
      return;
    }

    // Synchronous self-referral guard so we never break the iOS/Android user-gesture token before WhatsApp launch
    if (
      appliedCoupon?.code &&
      vipMember?.referral_code &&
      vipMember.referral_code.toUpperCase().trim() === appliedCoupon.code.toUpperCase().trim()
    ) {
      setFormError("You cannot use your own VIP referral code on your own order.");
      return;
    }

    setOrderSubmitting(true);

    const orderNum = Math.floor(100000 + Math.random() * 899999);
    const ptsReward = appliedCoupon?.pointsReward ?? Number(loyaltySettings.points_per_referral || 100);
    const effectiveRedeemedPts =
      pointsDiscountBdt > 0 ? Math.min(pointsToRedeem, redemptionCap.maxPoints) : 0;
    const combinedAddress = (cleanUpazila ? `${cleanUpazila}, ` : "") + cleanAddress;

    const waMessage = buildWhatsAppOrderMessage({
      orderNumber: orderNum,
      items,
      customerName: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      division,
      district,
      upazila: cleanUpazila,
      fullAddress: cleanAddress,
      customerNotes: cleanNotes,
      paymentMethod,
      trxId: cleanTrxId,
      subtotal,
      shippingFee,
      couponCode: appliedCoupon?.code,
      couponDiscountBdt,
      pointsRedeemed: effectiveRedeemedPts,
      pointsDiscountBdt,
      total,
      vipTier: vipMember?.tier,
    });
    const { waUrl, waAppUrl } = buildWhatsAppLinks(waMessage);

    const orderRecord = {
      id: `#${orderNum}`,
      order_number: orderNum,
      customer_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      division,
      district,
      full_address: combinedAddress,
      items,
      total: total.toFixed(2),
      subtotal,
      shipping: shippingFee,
      discount: totalDiscountBdt,
      coupon_discount_bdt: couponDiscountBdt,
      points_redeemed: effectiveRedeemedPts,
      points_discount_bdt: pointsDiscountBdt,
      points_earned: projectedTotalEarnedPoints,
      payment_method: paymentMethod,
      trx_id: cleanTrxId || undefined,
      coupon_code: appliedCoupon?.code,
      referral_points: appliedCoupon ? ptsReward : 0,
      status: "Unfulfilled",
      payment: paymentMethod === "cod" ? "Pending (COD)" : cleanTrxId ? "Paid" : "Pending (WhatsApp)",
      created_at: new Date().toISOString(),
    };

    // Synchronous local persistence so cart/orders/receipt survive immediate mobile handoff to WhatsApp
    try {
      const rawOrders = localStorage.getItem("annr-orders");
      const orders = rawOrders ? JSON.parse(rawOrders) : [];
      orders.unshift(orderRecord);
      localStorage.setItem("annr-orders", JSON.stringify(orders.slice(0, 500)));

      if (appliedCoupon?.code && ptsReward > 0) {
        creditVipReferrerLocally({
          referralCode: appliedCoupon.code,
          pointsReward: ptsReward,
          buyerName: cleanName,
          buyerEmail: cleanEmail,
          buyerPhone: cleanPhone,
          orderNumber: orderNum,
          orderTotal: total,
          discountGiven: couponDiscountBdt,
          eventType: "order",
        });
      }

      localStorage.removeItem("annr-cart");
      localStorage.removeItem("shihiko-cart");
      localStorage.removeItem("annr_cart_coupon");
      localStorage.removeItem("annr_reservation");

      const isSoldMatch = (p: any) =>
        items.some((it) => it.id === p.id || (p.handle && (it.id === p.handle || it.handle === p.handle)) || it.title === p.title);
      const rawAdm = localStorage.getItem("shihiko-admin-v1");
      if (rawAdm) {
        const adm = JSON.parse(rawAdm);
        if (Array.isArray(adm.products)) {
          adm.products = adm.products.map((p: any) => (isSoldMatch(p) ? { ...p, status: "sold", stock: 0, soldAt: new Date().toISOString() } : p));
          localStorage.setItem("shihiko-admin-v1", JSON.stringify(adm));
        }
      }
      const rawLive = localStorage.getItem("annr_live_products");
      if (rawLive) {
        const live = JSON.parse(rawLive);
        if (Array.isArray(live)) {
          localStorage.setItem(
            "annr_live_products",
            JSON.stringify(live.map((p: any) => (isSoldMatch(p) ? { ...p, status: "sold", stock: 0 } : p))),
          );
        }
      }
    } catch {}

    const receiptPayload = {
      ok: true,
      order_number: orderNum,
      subtotal,
      shipping: shippingFee,
      discount: totalDiscountBdt,
      coupon_discount: couponDiscountBdt,
      points_redeemed: effectiveRedeemedPts,
      points_discount: pointsDiscountBdt,
      points_earned: projectedTotalEarnedPoints,
      total,
      customerName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      district,
      division,
      paymentMethod,
      trxId: cleanTrxId,
      waMessage,
      waUrl,
      waAppUrl,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(WHATSAPP_RECEIPT_STORAGE_KEY, JSON.stringify(receiptPayload));
    } catch {}

    setOrderSuccess(receiptPayload);
    setOrderSubmitting(false);

    // Non-blocking background persistence with keepalive so requests complete even when mobile switches to WhatsApp
    if (isSupabaseConfigured()) {
      const rpcHeaders = {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        "Content-Type": "application/json",
      };
      try {
        void fetch(`${supabaseUrl}/rest/v1/rpc/place_store_order`, {
          method: "POST",
          keepalive: true,
          headers: rpcHeaders,
          body: JSON.stringify({
            p_customer_name: cleanName,
            p_email: cleanEmail,
            p_phone: cleanPhone,
            p_division: division,
            p_district: district,
            p_full_address: combinedAddress,
            p_items: items,
            p_payment_method: paymentMethod,
            p_trx_id: cleanTrxId || null,
            p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
            p_customer_notes: cleanNotes || null,
          }),
        }).catch(() => {});

        for (const it of items) {
          if (it.id && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(it.id)) {
            void fetch(`${supabaseUrl}/rest/v1/rpc/mark_product_sold`, {
              method: "POST",
              keepalive: true,
              headers: rpcHeaders,
              body: JSON.stringify({ p_product_id: it.id }),
            }).catch(() => {});
          }
        }
      } catch {
        void supabase
          .rpc("place_store_order", {
            p_customer_name: cleanName,
            p_email: cleanEmail,
            p_phone: cleanPhone,
            p_division: division,
            p_district: district,
            p_full_address: combinedAddress,
            p_items: items,
            p_payment_method: paymentMethod,
            p_trx_id: cleanTrxId || null,
            p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
            p_customer_notes: cleanNotes || null,
          })
          .then(() => {}, () => {});
      }
    }

    // Background VIP loyalty points redemption & award
    void (async () => {
      try {
        if (effectiveRedeemedPts > 0 && vipMember?.email) {
          await redeemMemberPointsForOrder({
            memberEmail: vipMember.email,
            pointsToRedeem: effectiveRedeemedPts,
            orderNumber: orderNum,
            orderSubtotal: subtotal,
          });
        }
        await awardOrderLoyaltyPoints({
          buyerEmail: cleanEmail,
          buyerName: cleanName,
          orderNumber: orderNum,
          orderTotalBdt: total,
        });
      } catch {}
    })();

    // Launch WhatsApp SYNCHRONOUSLY inside user gesture so iOS Safari, Android Chrome, Samsung Internet,
    // WhatsApp Messenger, WhatsApp Business, in-app WebViews & Desktop open directly with zero popup block.
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
      if (isMobile) {
        window.location.assign(waUrl);
      } else {
        const popup = window.open(waUrl, "_blank", "noopener,noreferrer");
        if (!popup) {
          window.location.assign(waUrl);
        }
      }
    } catch {
      try {
        window.location.href = waUrl;
      } catch {}
    }
  };

  if (orderSuccess) {
    const clearSavedReceipt = () => {
      try {
        sessionStorage.removeItem(WHATSAPP_RECEIPT_STORAGE_KEY);
      } catch {}
    };

    return (
      <div className="annr-chk-root" style={{ background: "#f7f6f3" }}>
        <style>{CHECKOUT_STYLES}</style>
        <header className="annr-chk-header">
          <div className="annr-chk-header-inner">
            <a href="/home.html" onClick={clearSavedReceipt} className="annr-chk-back">← Return to Store</a>
            <a href="/home.html" onClick={clearSavedReceipt} className="annr-chk-logo" aria-label="AnnR Home">
              <img src="/cdn/shop/t/75/assets/image_logo.svg" alt="AnnR" />
            </a>
            <div className="annr-chk-secure">ORDER READY</div>
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 16px 56px" }}>
          <div
            className="annr-chk-receipt-card"
            style={{
              maxWidth: 580,
              width: "100%",
              background: "#ffffff",
              border: "1px solid #0a0a0a",
              padding: "36px 32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                background: "#0a0a0a",
                color: "#25D366",
                marginBottom: 16,
              }}
            >
              <WhatsAppIcon size={24} />
            </div>
            <div
              style={{
                fontFamily: "'FK Grotesk SemiMono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: "#e05a2b",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              STRUCTURED WHATSAPP ORDER READY
            </div>
            <h1
              style={{
                margin: "0 0 8px",
                fontFamily: "'Druk Wide', 'NB Architekt Std', sans-serif",
                fontSize: 21,
                fontWeight: 900,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              ORDER #{orderSuccess.order_number}
            </h1>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "#525252", fontFamily: "-apple-system, sans-serif", lineHeight: 1.5 }}>
              Your structured order has been prepared for AnnR WhatsApp (<strong>{ANNR_WHATSAPP_DISPLAY}</strong>). Tap below if WhatsApp did not open automatically.
            </p>

            {/* Primary & Cross-App WhatsApp Launch Actions */}
            {orderSuccess.waUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                <a
                  href={orderSuccess.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="annr-chk-wa-primary"
                >
                  <span style={{ color: "#25D366", display: "inline-flex" }}>
                    <WhatsAppIcon size={18} />
                  </span>
                  <span>Send on WhatsApp ({ANNR_WHATSAPP_DISPLAY}) →</span>
                </a>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {orderSuccess.waAppUrl && (
                    <a href={orderSuccess.waAppUrl} className="annr-chk-wa-secondary">
                      Open WhatsApp App Directly
                    </a>
                  )}
                  {orderSuccess.waMessage && (
                    <button
                      type="button"
                      onClick={() => handleCopyWaMessage(orderSuccess.waMessage)}
                      className="annr-chk-wa-secondary"
                    >
                      {copiedWaText ? "✓ Copied Order Text" : "Copy Order Text"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                background: "#f7f6f3",
                border: "1px solid #e6e6e2",
                padding: "16px 18px",
                textAlign: "left",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 9,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "#666", fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10.5 }}>RECIPIENT</span>
                <strong style={{ color: "#0a0a0a", textAlign: "right" }}>{orderSuccess.customerName || customerName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "#666", fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10.5 }}>DESTINATION</span>
                <strong style={{ color: "#0a0a0a", textAlign: "right" }}>
                  {orderSuccess.district || district}, {orderSuccess.division || division}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "#666", fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10.5 }}>PAYMENT</span>
                <strong style={{ color: "#0a0a0a", textTransform: "uppercase", textAlign: "right" }}>
                  {formatPaymentMethodLabel(orderSuccess.paymentMethod || paymentMethod)}
                  {orderSuccess.trxId || trxId ? ` (${orderSuccess.trxId || trxId})` : ""}
                </strong>
              </div>
              {orderSuccess.points_redeemed > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#e05a2b" }}>
                  <span>VIP Points Redeemed ({orderSuccess.points_redeemed} PTS)</span>
                  <strong>-৳{orderSuccess.points_discount}</strong>
                </div>
              )}
              {orderSuccess.points_earned > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d" }}>
                  <span>ANNR VIP Points Earned</span>
                  <strong>+{orderSuccess.points_earned} PTS</strong>
                </div>
              )}
              <div
                style={{
                  borderTop: "1px solid #0a0a0a",
                  paddingTop: 11,
                  marginTop: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14.5,
                  fontWeight: 700,
                }}
              >
                <span>TOTAL PAYABLE</span>
                <span>Tk {orderSuccess.total?.toLocaleString() || total.toLocaleString()} BDT</span>
              </div>
            </div>

            {orderSuccess.waMessage && (
              <details style={{ textAlign: "left", marginBottom: 22 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontFamily: "'FK Grotesk SemiMono', monospace",
                    fontSize: 10.5,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "#525252",
                    padding: "6px 0",
                  }}
                >
                  View Structured WhatsApp Message
                </summary>
                <pre className="annr-chk-wa-preview">{orderSuccess.waMessage}</pre>
              </details>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href="/account/login/index.html"
                onClick={clearSavedReceipt}
                style={{
                  flex: 1,
                  minWidth: 150,
                  display: "block",
                  background: "#ffffff",
                  color: "#0a0a0a",
                  border: "1px solid #0a0a0a",
                  textDecoration: "none",
                  padding: "13px 14px",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Open VIP Vault →
              </a>
              <a
                href="/home.html"
                onClick={clearSavedReceipt}
                style={{
                  flex: 1,
                  minWidth: 150,
                  display: "block",
                  background: "#0a0a0a",
                  color: "#ffffff",
                  border: "1px solid #0a0a0a",
                  textDecoration: "none",
                  padding: "13px 14px",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Continue Exploring →
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="annr-chk-root">
      <style>{CHECKOUT_STYLES}</style>

      {/* Classic Editorial White Storefront Checkout Header */}
      <header className="annr-chk-header">
        <div className="annr-chk-header-inner">
          <a href="/home.html" className="annr-chk-back">
            <span aria-hidden="true">←</span> Return to Shop
          </a>
          <a href="/home.html" className="annr-chk-logo" aria-label="AnnR Home">
            <img src="/cdn/shop/t/75/assets/image_logo.svg" alt="AnnR" />
          </a>
          <div className="annr-chk-secure">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="hide-sm">Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Classic Two-Column Split Checkout (Pure White Form + Subtle Warm Alabaster Summary Rail) */}
      <div className="annr-chk-shell">
        <main className="annr-chk-main">
          <nav className="annr-chk-crumb" aria-label="Checkout progress">
            <a href="/collections/unique-campaign/index.html" style={{ color: "inherit", textDecoration: "none" }}>Archive</a>
            <span>/</span>
            <span className="active">Contact &amp; Delivery</span>
            <span>/</span>
            <span className="active">Continue to WhatsApp</span>
          </nav>

          {formError && (
            <div className="annr-chk-error" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handlePlaceOrder}>
            {/* Section 01: Contact */}
            <section className="annr-chk-section">
              <div className="annr-chk-section-head">
                <h2 className="annr-chk-section-title">
                  <span className="annr-chk-section-step">[01]</span>Contact
                </h2>
                {!vipMember ? (
                  <a href="/account/login/index.html" className="annr-chk-section-link">
                    VIP Member? Sign in
                  </a>
                ) : (
                  <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, color: "#15803d", letterSpacing: 1 }}>
                    ✓ VIP RECOGNIZED ({vipMember.tier})
                  </span>
                )}
              </div>

              <div className="annr-chk-grid-2">
                <div className="annr-chk-field">
                  <label htmlFor="chk-email">Email Address *</label>
                  <input
                    id="chk-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="annr-chk-field">
                  <label htmlFor="chk-phone">Mobile Number (Bangladesh) *</label>
                  <input
                    id="chk-phone"
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section 02: Delivery Address */}
            <section className="annr-chk-section">
              <div className="annr-chk-section-head">
                <h2 className="annr-chk-section-title">
                  <span className="annr-chk-section-step">[02]</span>Delivery Address
                </h2>
                <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, color: "#737373", letterSpacing: 1 }}>
                  BANGLADESH NATIONWIDE
                </span>
              </div>

              <div className="annr-chk-stack">
                <div className="annr-chk-field">
                  <label htmlFor="chk-name">Full Name *</label>
                  <input
                    id="chk-name"
                    type="text"
                    required
                    placeholder="Enter recipient full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="annr-chk-grid-2">
                  <div className="annr-chk-field">
                    <label htmlFor="chk-division">Division *</label>
                    <select id="chk-division" value={division} onChange={(e) => handleDivisionChange(e.target.value)}>
                      {BD_DIVISIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="annr-chk-field">
                    <label htmlFor="chk-district">District (Zilla) *</label>
                    <select id="chk-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                      {availableDistricts.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="annr-chk-grid-2">
                  <div className="annr-chk-field">
                    <label htmlFor="chk-upazila">Thana / Area</label>
                    <input
                      id="chk-upazila"
                      type="text"
                      placeholder="e.g. Dhanmondi, Banani, Uttara"
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                    />
                  </div>
                  <div className="annr-chk-field">
                    <label htmlFor="chk-notes">Delivery Note (Optional)</label>
                    <input
                      id="chk-notes"
                      type="text"
                      placeholder="Call before arrival, gate code, etc."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="annr-chk-field">
                  <label htmlFor="chk-address">Full Street Address *</label>
                  <textarea
                    id="chk-address"
                    rows={2}
                    required
                    placeholder="House, road, sector, apartment / floor"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section 03: Payment Method */}
            <section className="annr-chk-section">
              <div className="annr-chk-section-head">
                <h2 className="annr-chk-section-title">
                  <span className="annr-chk-section-step">[03]</span>Payment Method
                </h2>
                <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, color: "#737373", letterSpacing: 1 }}>
                  ALL TRANSACTIONS ENCRYPTED
                </span>
              </div>

              <div className="annr-chk-pay-list">
                <label className={`annr-chk-pay-opt ${paymentMethod === "cod" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span className="annr-chk-radio" aria-hidden="true" />
                  <div style={{ flex: 1 }}>
                    <div className="annr-chk-pay-title">
                      Cash on Delivery (COD)
                      <span className="annr-chk-pay-pill">Recommended</span>
                    </div>
                    <div className="annr-chk-pay-sub">Inspect package upon doorstep delivery and pay in cash.</div>
                  </div>
                </label>

                <label className={`annr-chk-pay-opt ${paymentMethod === "bkash" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "bkash"}
                    onChange={() => setPaymentMethod("bkash")}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span className="annr-chk-radio" aria-hidden="true" />
                  <div style={{ flex: 1 }}>
                    <div className="annr-chk-pay-title">
                      bKash Payment
                      <span className="annr-chk-pay-pill">MFS · TrxID</span>
                    </div>
                    <div className="annr-chk-pay-sub">Send Money / Merchant payment to official AnnR bKash wallet.</div>
                  </div>
                </label>

                <label className={`annr-chk-pay-opt ${paymentMethod === "nagad" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "nagad"}
                    onChange={() => setPaymentMethod("nagad")}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span className="annr-chk-radio" aria-hidden="true" />
                  <div style={{ flex: 1 }}>
                    <div className="annr-chk-pay-title">
                      Nagad Payment
                      <span className="annr-chk-pay-pill">MFS · TrxID</span>
                    </div>
                    <div className="annr-chk-pay-sub">Instant digital transfer to official AnnR Nagad wallet.</div>
                  </div>
                </label>

                {paymentMethod !== "cod" && (
                  <div className="annr-chk-mfs-box">
                    <div style={{ fontSize: 12.5, color: "#262626", marginBottom: 10, fontFamily: "-apple-system, sans-serif", lineHeight: 1.45 }}>
                      Send <strong>Tk {total.toLocaleString()} BDT</strong> via {formatPaymentMethodLabel(paymentMethod)} to{" "}
                      <strong style={{ fontFamily: "'FK Grotesk SemiMono', monospace", letterSpacing: 0.8 }}>{ANNR_WHATSAPP_DISPLAY}</strong>{" "}
                      or confirm payment directly in WhatsApp after clicking Continue.
                    </div>
                    <div className="annr-chk-field">
                      <label htmlFor="chk-trx">Transaction ID (TrxID — Optional)</label>
                      <input
                        id="chk-trx"
                        type="text"
                        placeholder="Optional — or share screenshot in WhatsApp"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        style={{ fontFamily: "'FK Grotesk SemiMono', monospace", letterSpacing: 1 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              className="annr-chk-submit"
              disabled={orderSubmitting || items.length === 0}
            >
              <span style={{ color: "#25D366", display: "inline-flex" }}>
                <WhatsAppIcon size={18} />
              </span>
              <span>
                {orderSubmitting
                  ? "Opening WhatsApp Order…"
                  : `Continue to WhatsApp · Tk ${total.toLocaleString()} BDT →`}
              </span>
            </button>
            <p className="annr-chk-wa-caption">
              Sends all structured order, contact &amp; delivery details directly to AnnR WhatsApp ({ANNR_WHATSAPP_DISPLAY})
            </p>
          </form>

          <footer className="annr-chk-footer">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <a href="/pages/shipping-policy/index.html">Shipping Policy</a>
              <a href="/pages/return-policy/index.html">Returns</a>
              <a href="/pages/legal-privacy/index.html">Privacy</a>
            </div>
            <div>
              Created by <a href="https://ratul.site" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: "#0a0a0a" }}>Ratul</a>
            </div>
          </footer>
        </main>

        {/* Right Column: Classic Editorial Alabaster Order Summary */}
        <aside className="annr-chk-aside">
          <div className="annr-chk-aside-sticky">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h2 className="annr-chk-section-title">Order Summary</h2>
              <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 11, color: "#737373", letterSpacing: 1 }}>
                [{items.length < 10 ? `0${items.length}` : items.length}] {items.length === 1 ? "PIECE" : "PIECES"}
              </span>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px dashed #d4d4d0", padding: "24px 18px", margin: "14px 0 20px", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Your Bag Is Empty
                </div>
                <p style={{ fontSize: 12.5, color: "#666", margin: "0 0 14px", fontFamily: "-apple-system, sans-serif" }}>
                  Select an available 1-of-1 archival piece from the Unique Campaign to reserve it for checkout.
                </p>
                <a
                  href="/collections/unique-campaign/index.html"
                  style={{
                    display: "inline-block",
                    background: "#0a0a0a",
                    color: "#ffffff",
                    padding: "10px 18px",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  Browse Unique Archive →
                </a>
              </div>
            ) : (
              <div>
                {items.map((item) => (
                  <div key={item.id} className="annr-chk-item">
                    <div className="annr-chk-item-thumb">
                      <img
                        src={item.image || "/_ext/annr-template-001.png"}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/_ext/annr-template-001.png";
                        }}
                      />
                      <span className="annr-chk-item-qty">1 OF 1</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.code && (
                        <div style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 9.5, color: "#e05a2b", letterSpacing: 1.3, marginBottom: 3 }}>
                          {item.code}
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#0a0a0a", lineHeight: 1.3 }}>
                        {item.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                        {item.showSize !== false && item.size && (
                          <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, color: "#666" }}>
                            SIZE {item.size}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontFamily: "'FK Grotesk SemiMono', monospace",
                            fontSize: 10,
                            color: "#737373",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 13, fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap" }}>
                      Tk {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Promo / VIP Referral Code */}
            <form onSubmit={handleApplyCoupon} className="annr-chk-coupon-row">
              <input
                type="text"
                placeholder="Promo / VIP code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <button type="submit" disabled={couponApplying || !couponCode.trim()}>
                {couponApplying ? "…" : "Apply"}
              </button>
            </form>

            {appliedCoupon && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  padding: "9px 12px",
                  fontSize: 11.5,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{appliedCoupon.code}</strong> applied (-Tk {appliedCoupon.discountAmount.toLocaleString()})
                  {appliedCoupon.referrerName && (
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>Referred by {appliedCoupon.referrerName}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                  style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            )}

            {couponError && (
              <div style={{ color: "#b91c1c", fontSize: 11.5, marginBottom: 12, fontFamily: "-apple-system, sans-serif" }}>
                {couponError}
              </div>
            )}

            {/* ANNR VIP Points Wallet Redemption */}
            {loyaltySettings.program_enabled && loyaltySettings.redemption_enabled && (
              <div className="annr-chk-vip-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "#0a0a0a", textTransform: "uppercase" }}>
                    ANNR VIP Points Wallet
                  </span>
                  {vipMember ? (
                    <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                      {vipMember.available_points} PTS (৳{Math.round(vipMember.available_points * redemptionCap.pointValueBdt)})
                    </span>
                  ) : (
                    <a href="/account/login/index.html" className="annr-chk-section-link" style={{ fontSize: 10 }}>
                      Join VIP (+100 PTS)
                    </a>
                  )}
                </div>

                {!vipMember ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#666666", lineHeight: 1.45, fontFamily: "-apple-system, sans-serif" }}>
                    Enter your registered VIP email/phone or{" "}
                    <a href="/account/login/index.html" style={{ color: "#0a0a0a", fontWeight: 600 }}>sign in to the VIP Vault</a>{" "}
                    to redeem points on this order.
                  </p>
                ) : !redemptionCap.canRedeem ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#666666", fontFamily: "-apple-system, sans-serif" }}>
                    {redemptionCap.reason}
                  </p>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: "#404040", marginBottom: 8, fontFamily: "-apple-system, sans-serif" }}>
                      Redeem up to <strong>{redemptionCap.maxPoints} PTS</strong> (<strong>-৳{redemptionCap.maxDiscountBdt}</strong>):
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="range"
                        min={0}
                        max={redemptionCap.maxPoints}
                        step={10}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                        style={{ flex: 1, accentColor: "#0a0a0a" }}
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
                          background: "#ffffff",
                          border: "1px solid #d4d4d0",
                          color: "#0a0a0a",
                          padding: "6px",
                          fontSize: 12,
                          fontFamily: "'FK Grotesk SemiMono', monospace",
                          textAlign: "center",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPointsToRedeem(pointsToRedeem === redemptionCap.maxPoints ? 0 : redemptionCap.maxPoints)
                        }
                        style={{
                          background: pointsToRedeem > 0 ? "#0a0a0a" : "#ecece8",
                          color: pointsToRedeem > 0 ? "#ffffff" : "#0a0a0a",
                          border: "1px solid #0a0a0a",
                          padding: "6px 10px",
                          fontFamily: "'FK Grotesk SemiMono', monospace",
                          fontSize: 10,
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {pointsToRedeem === redemptionCap.maxPoints ? "Clear" : "Max"}
                      </button>
                    </div>
                    {pointsDiscountBdt > 0 && (
                      <div style={{ fontSize: 11.5, color: "#15803d", marginTop: 8, fontWeight: 600 }}>
                        ✓ Redeeming {pointsToRedeem} PTS (-Tk {pointsDiscountBdt.toLocaleString()} BDT)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Itemized Totals */}
            <div className="annr-chk-totals">
              <div className="annr-chk-total-row">
                <span>Subtotal</span>
                <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", color: "#0a0a0a" }}>
                  Tk {subtotal.toLocaleString()} BDT
                </span>
              </div>
              {appliedCoupon && (
                <div className="annr-chk-total-row" style={{ color: "#15803d" }}>
                  <span>Promo / Referral ({appliedCoupon.code})</span>
                  <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace" }}>
                    -Tk {couponDiscountBdt.toLocaleString()}
                  </span>
                </div>
              )}
              {pointsDiscountBdt > 0 && (
                <div className="annr-chk-total-row" style={{ color: "#e05a2b" }}>
                  <span>ANNR VIP Points ({pointsToRedeem} PTS)</span>
                  <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace" }}>
                    -Tk {pointsDiscountBdt.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="annr-chk-total-row">
                <span>Shipping ({district})</span>
                <span style={{ fontFamily: "'FK Grotesk SemiMono', monospace", color: shippingFee === 0 ? "#15803d" : "#0a0a0a" }}>
                  {shippingFee === 0 ? "FREE" : `Tk ${shippingFee} BDT`}
                </span>
              </div>

              <div className="annr-chk-grand">
                <div>
                  <span style={{ fontFamily: "'Druk Wide', 'NB Architekt Std', sans-serif", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Total
                  </span>
                  <span style={{ display: "block", fontFamily: "'FK Grotesk SemiMono', monospace", fontSize: 10, color: "#737373", marginTop: 2 }}>
                    INCL. ALL TAXES · BDT
                  </span>
                </div>
                <span style={{ fontFamily: "'NB Architekt Std', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
                  Tk {total.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: "#666" }}>BDT</span>
                </span>
              </div>

              {projectedTotalEarnedPoints > 0 && items.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "#ffffff",
                    border: "1px solid #e2e2dd",
                    borderLeft: "2px solid #0a0a0a",
                    fontSize: 11,
                    color: "#262626",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: "'FK Grotesk SemiMono', monospace",
                  }}
                >
                  <span>VIP REWARD ON COMPLETION</span>
                  <strong style={{ color: "#0a0a0a" }}>+{projectedTotalEarnedPoints} PTS</strong>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
