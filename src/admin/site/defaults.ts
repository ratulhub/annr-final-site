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
        { ...link("New In", "/collections/all/index.html?sort_by=created-descending"), original: 0, device: "all" },
        { ...link("Shop", ""), original: 1, device: "all" },
        { ...link("Collections", ""), original: 2, device: "all" },
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
    media: catalog.products.filter((p) => p.image).map((p) => ({ id: id(), name: p.title, url: p.image, alt: p.title, caption: "", type: "image", size: 0, source: "store" as const, addedAt: "" })),
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
      { id: "shopify", name: "Shopify (cart & checkout)", kind: "Commerce", status: "not connected", note: "Cart and checkout currently pass through to the live store." },
      { id: "analytics", name: "Analytics provider", kind: "Analytics", status: "not connected", note: "Planned for Part 3." },
      { id: "email", name: "Email service", kind: "Email", status: "not connected", note: "Needed before forms can send messages." },
      { id: "storage", name: "File storage", kind: "Storage", status: "not connected", note: "Uploads are kept in this browser only." },
      { id: "payments", name: "Payments", kind: "Payments", status: "not connected", note: "Handled by Shopify checkout today." },
    ],
    hiddenPages: [],
    customPages: [],
  };
}
