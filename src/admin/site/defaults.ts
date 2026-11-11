import catalog from "../catalog.json";
import { TEMPLATES } from "./registry";
import type { SiteConfig } from "./types";

const id = () => Math.random().toString(36).slice(2, 9);
const link = (label: string, url: string, newTab = false) => ({ id: id(), label, url, newTab, visible: true });

// Defaults copy what the original store shows today, so publishing untouched changes nothing.
export function siteDefaults(): SiteConfig {
  const sections: SiteConfig["sections"] = {};
  for (const [k, t] of Object.entries(TEMPLATES)) sections[k] = t.sections.map((s) => ({ ...s }));
  return {
    general: { siteName: "AnnR", tagline: "", description: "", logoUrl: "", logoAlt: "AnnR", secondaryLogo: "", favicon: "", contactEmail: "support@annr.com", contactLabel: "CONTACT US:", phone: "", address: "", locale: "en", timezone: "Asia/Dhaka", copyright: "COPYRIGHT © 2026 AnnR, Inc. ALL RIGHTS RESERVED." },
    design: { background: "", text: "", accent: "", buttonBg: "", buttonText: "", headingFont: "", bodyFont: "", fontScale: "", buttonRadius: "", inputRadius: "", containerWidth: "", headerBg: "", headerText: "", footerBg: "", footerText: "", mode: "light" },
    header: {
      items: [
        { ...link("Unique Campaign", "/collections/unique-campaign/index.html"), original: 0, device: "all" },
        { ...link("Categories", "/collections/all/index.html"), original: 1, device: "all" },
        { ...link("Collections", "/collections/unique-campaign/index.html"), original: 2, device: "all" },
      ],
      showVip: true, showCart: true, ctaLabel: "", ctaUrl: "", sticky: true,
    },
    footer: {
      columns: [
        { id: id(), title: "NAVIGATION:", visible: true, links: [link("shop", "/collections/all/index.html"), link("drop", "/home.html"), link("FAQ", "/pages/faq/index.html")] },
        { id: id(), title: "INFO:", visible: true, links: [link("Legal & Privacy", "/pages/legal-privacy/index.html"), link("Shipping", "/pages/shipping-policy/index.html"), link("Returns", "/pages/return-policy/index.html")] },
        { id: id(), title: "SOCIAL:", visible: true, links: [link("INSTAGRAM", "https://www.instagram.com/annrclo/", true), link("FACEBOOK", "https://www.facebook.com/shopannr/", true), link("TIKTOK", "https://www.tiktok.com/@annr.com", true), link("discord", "https://discord.com/invite/annr", true)] },
      ],
      showSubscribe: true, showEmail: true, showPayments: true,
    },
    announcement: { on: false, text: "", url: "", background: "#000000", color: "#ffffff", device: "all" },
    popup: { on: false, title: "", text: "", button: "", url: "", delaySec: "3", showOnce: true },
    cookie: { on: false, text: "We use cookies to improve your experience.", button: "OK", policyUrl: "/pages/legal-privacy/index.html" },
    sections,
    texts: [],
    images: [],
    media: (catalog.products as any[]).filter((p) => p && p.image).map((p) => ({ id: id(), name: p.title, url: p.image, alt: p.title, caption: "", type: "image", size: 0, source: "store" as const, addedAt: "" })),
    forms: [
      { id: "newsletter", name: "Newsletter (footer)", where: "Every page footer", title: "STAY CONNECTED", button: "subscribe", success: "", error: "", consent: "", fields: [{ id: id(), key: "email", label: "Email", placeholder: "enter your e-mail", required: true, enabled: true }] },
      { id: "vip-login", name: "VIP login", where: "/account/login", title: "", button: "", success: "", error: "", consent: "", fields: [{ id: id(), key: "email", label: "Email", placeholder: "", required: true, enabled: true }, { id: id(), key: "password", label: "Password", placeholder: "", required: true, enabled: true }] },
      { id: "vip-register", name: "VIP signup", where: "/account/register", title: "", button: "", success: "", error: "", consent: "", fields: [] },
      { id: "search", name: "Search", where: "Header search", title: "", button: "", success: "", error: "", consent: "", fields: [{ id: id(), key: "q", label: "Search", placeholder: "", required: false, enabled: true }] },
    ],
    seo: { titlePattern: "", homeTitle: "", defaultDescription: "", ogImage: "", canonicalBase: "https://annr.com", noindex: false, robots: "User-agent: *\nAllow: /", structuredData: true },
    social: { instagram: "https://www.instagram.com/annrclo/", facebook: "https://www.facebook.com/shopannr/", tiktok: "https://www.tiktok.com/@annr.com", discord: "https://discord.com/invite/annr", youtube: "", x: "" },
    technical: { maintenance: false, maintenanceTitle: "AnnR", maintenanceText: "We'll be back soon", pageTransition: true, cartDrawer: true, productLabels: true, notFoundTitle: "Page not found", notFoundText: "", customCss: "" },
    integrations: [
      { id: "checkout", name: "Direct 1-of-1 Checkout", kind: "Commerce", status: "connected", note: "Orders place directly via /checkout & Supabase RPCs." },
      { id: "analytics", name: "Analytics provider", kind: "Analytics", status: "not connected", note: "Privacy-safe local tracking enabled." },
      { id: "email", name: "Email service", kind: "Email", status: "not connected", note: "Connect transactional email via Edge Functions." },
      { id: "storage", name: "File storage", kind: "Storage", status: "connected", note: "Supabase public-media bucket (<= 400 KB) + URL links." },
      { id: "payments", name: "Payments", kind: "Payments", status: "connected", note: "Cash on Delivery / MFS confirmation." },
    ],
    hiddenPages: [],
    customPages: [],
    events: [],
    ballDrop: {
      enabled: false,
      title: "TAP TO DROP",
      subtitle: "Try your luck to unlock instant exclusive discounts and free items.",
      buttonText: "TRY YOUR LUCK",
      modelImage: "/cdn/shop/files/ball-drop-model.jpg",
      autoPopup: false,
      autoPopupDelay: 5,
      showFloatingTrigger: false,
      prizes: [
        { id: "p1", label: "Free item", couponCode: "FREEGIFT", discount: "Free Item", weight: 10, color: "#e10600" },
        { id: "p2", label: "5% off", couponCode: "LUCK5", discount: "5%", weight: 35, color: "#3b82f6" },
        { id: "p3", label: "Free shipping", couponCode: "FREESHIP", discount: "Free Shipping", weight: 20, color: "#10b981" },
        { id: "p4", label: "৳500 off", couponCode: "ANNR500", discount: "৳500", weight: 15, color: "#8b5cf6" },
        { id: "p5", label: "10% off", couponCode: "LUCK10", discount: "10%", weight: 20, color: "#f59e0b" },
      ],
    },
    loyalty: {
      program_enabled: true,
      points_per_referral_order: 100,
      point_value_bdt: 1.0,
      friend_discount_percent: 10,
      min_withdrawal_points: 100,
    },
  };
}
