// Site-wide configuration the store pages read (after Publish).
export type Link = { id: string; label: string; url: string; newTab: boolean; visible: boolean };
export type HeaderItem = Link & { original: number | null; device: "all" | "desktop" | "mobile" };
export type FooterColumn = { id: string; title: string; visible: boolean; links: Link[] };
export type SectionCfg = { key: string; label: string; type: string; visible: boolean; padTop: string; padBottom: string; background: string; align: "" | "left" | "center" | "right"; width: "" | "full" | "contained"; device: "all" | "desktop" | "mobile";
  /** Copy of an original store section (its key). */ copyOf?: string | undefined;
  /** Section added in the admin (not in the original page). */ added?: { kind: "text" | "image" | "cta"; heading: string; text: string; image: string; alt: string; button: string; url: string } | undefined };
export type TextRule = { id: string; find: string; replace: string; scope: string; enabled: boolean };
export type ImageRule = { id: string; from: string; to: string; alt: string; position: "" | "top" | "center" | "bottom"; scope: string; enabled: boolean };
export type MediaItem = { id: string; name: string; url: string; alt: string; caption: string; type: string; size: number; source: "store" | "upload" | "link"; addedAt: string };
export type Block =
  | { id: string; type: "heading"; text: string; level: "h1" | "h2" | "h3"; align: string }
  | { id: string; type: "text"; text: string; align: string }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "faq"; items: { id: string; q: string; a: string }[] }
  | { id: string; type: "products"; title: string; handles: string; limit: string }
  | { id: string; type: "gallery"; images: string; columns: string }
  | { id: string; type: "spacer"; size: string };
export type CustomPage = { id: string; slug: string; title: string; status: "draft" | "published"; showInNav: boolean; seoTitle: string; seoDescription: string; blocks: Block[] };
export type FormField = { id: string; key: string; label: string; placeholder: string; required: boolean; enabled: boolean };
export type FormCfg = { id: string; name: string; where: string; title: string; button: string; success: string; error: string; consent: string; fields: FormField[] };

export type SiteConfig = {
  general: { siteName: string; tagline: string; description: string; logoUrl: string; logoAlt: string; secondaryLogo: string; favicon: string; contactEmail: string; contactLabel: string; phone: string; address: string; locale: string; timezone: string; copyright: string };
  design: { background: string; text: string; accent: string; buttonBg: string; buttonText: string; headingFont: string; bodyFont: string; fontScale: string; buttonRadius: string; inputRadius: string; containerWidth: string; headerBg: string; headerText: string; footerBg: string; footerText: string; mode: "light" | "dark" };
  header: { items: HeaderItem[]; showVip: boolean; showCart: boolean; ctaLabel: string; ctaUrl: string; sticky: boolean };
  footer: { columns: FooterColumn[]; showSubscribe: boolean; showEmail: boolean; showPayments: boolean };
  announcement: { on: boolean; text: string; url: string; background: string; color: string; device: "all" | "desktop" | "mobile" };
  popup: { on: boolean; title: string; text: string; button: string; url: string; delaySec: string; showOnce: boolean };
  cookie: { on: boolean; text: string; button: string; policyUrl: string };
  sections: Record<string, SectionCfg[]>;
  texts: TextRule[];
  images: ImageRule[];
  media: MediaItem[];
  forms: FormCfg[];
  seo: { titlePattern: string; homeTitle: string; defaultDescription: string; ogImage: string; canonicalBase: string; noindex: boolean; robots: string; structuredData: boolean };
  social: { instagram: string; facebook: string; tiktok: string; discord: string; youtube: string; x: string };
  technical: { maintenance: boolean; maintenanceTitle: string; maintenanceText: string; pageTransition: boolean; cartDrawer: boolean; productLabels: boolean; notFoundTitle: string; notFoundText: string; customCss: string };
  integrations: { id: string; name: string; kind: string; status: "not connected"; note: string }[];
  hiddenPages: string[];
  customPages: CustomPage[];
};
