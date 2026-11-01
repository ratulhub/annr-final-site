import { REPORTS } from "../analytics/reports";
// Admin sidebar structure. Items with `to` are working pages; items with `module`
// open the module overview page and are labelled with the part that completes them.
export type NavItem = { label: string; to?: string; module?: string; soon?: string; report?: string; badge?: string };
export type NavGroup = {
  group: string;
  iconKey: "overview" | "orders" | "products" | "marketing" | "store" | "content" | "analytics" | "settings";
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    iconKey: "overview",
    items: [
      { label: "Dashboard", to: "/admin" },
      { label: "Preview & publish", to: "/admin/publish" },
    ],
  },
  {
    group: "Orders & Sales",
    iconKey: "orders",
    items: [
      { label: "Orders", to: "/admin/orders" },
      { label: "Customers", to: "/admin/customers" },
    ],
  },
  {
    group: "Products & Catalog",
    iconKey: "products",
    items: [
      { label: "Products", to: "/admin/products" },
      { label: "Collections", to: "/admin/collections" },
      { label: "Discounts & Coupons", to: "/admin/discounts" },
    ],
  },
  {
    group: "Marketing & Drops",
    iconKey: "marketing",
    items: [
      { label: "VIP Loyalty & Points", to: "/admin/loyalty" },
      { label: "Campaigns & Events", to: "/admin/events" },
      { label: "Promotional Banners", to: "/admin/content" },
    ],
  },
  {
    group: "Online Store",
    iconKey: "store",
    items: [
      { label: "Theme & Design", to: "/admin/theme" },
      { label: "Page Sections", to: "/admin/sections" },
      { label: "Website Pages", to: "/admin/website" },
      { label: "Navigation Menus", to: "/admin/navigation" },
      { label: "Policy & Text Pages", to: "/admin/pages" },
    ],
  },
  {
    group: "Content & Assets",
    iconKey: "content",
    items: [
      { label: "Media Library", to: "/admin/media" },
      { label: "Forms & Inquiries", to: "/admin/forms" },
      { label: "SEO & Discoverability", to: "/admin/seo" },
    ],
  },
  {
    group: "Analytics & Reports",
    iconKey: "analytics",
    items: REPORTS.map((r) => ({
      label: r.title.replace("Analytics overview", "Overview").replace("Analytics settings", "Settings"),
      report: r.id,
    })),
  },
  {
    group: "Settings & Security",
    iconKey: "settings",
    items: [
      { label: "Store Settings", to: "/admin/settings" },
      { label: "Integrations", to: "/admin/integrations" },
      { label: "Users & Roles", to: "/admin/users" },
      { label: "Activity Log", to: "/admin/activity" },
      { label: "Security Center", to: "/admin/security" },
    ],
  },
];

export const MODULES: Record<string, { title: string; part: string; plan: string[]; now?: { label: string; to: string } }> = {
  sections: { title: "Page sections", part: "Part 2", plan: ["Reorder, show or hide sections on each store page", "Edit banner text, images and buttons per section"], now: { label: "Open Page sections editor", to: "/admin/sections" } },
  media: { title: "Media library", part: "Part 2", plan: ["Browse every store image and video", "Upload and replace images used by products and pages"], now: { label: "Open Media library", to: "/admin/media" } },
  forms: { title: "Forms & submissions", part: "Part 2", plan: ["Contact, newsletter and VIP signup forms", "View and export submissions"], now: { label: "Open Forms manager", to: "/admin/forms" } },
  seo: { title: "SEO & discoverability", part: "Part 2", plan: ["Bulk edit page titles and descriptions", "Social sharing images, sitemap and redirects"], now: { label: "Open SEO & discoverability", to: "/admin/seo" } },
  analytics: { title: "Analytics", part: "Part 3", plan: ["Visitors, sales and conversion reports", "Connect a real analytics provider"], now: { label: "Open Analytics overview", to: "/admin/analytics/overview" } },
  integrations: { title: "Integrations", part: "Part 2", plan: ["Shopify checkout, payment and shipping connections", "Social and marketing tools"], now: { label: "Open Integrations", to: "/admin/integrations" } },
  users: { title: "Users & permissions", part: "Part 4", plan: ["Roles with per-section permissions and RBAC enforcement"], now: { label: "Open Users & permissions", to: "/admin/users" } },
};
