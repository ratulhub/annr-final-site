import { REPORTS } from "../analytics/reports";
// Admin sidebar structure. Items with `to` are working pages; items with `module`
// open the module overview page and are labelled with the part that completes them.
export type NavItem = { label: string; to?: string; module?: string; soon?: string; report?: string };
export type NavGroup = { group: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { group: "Overview", items: [{ label: "Dashboard", to: "/admin" }, { label: "Preview & publish", to: "/admin/publish" }] },
  { group: "Store", items: [
    { label: "Products", to: "/admin/products" }, { label: "Collections", to: "/admin/collections" },
    { label: "Campaigns & Events", to: "/admin/events" },
    { label: "Orders", to: "/admin/orders" }, { label: "Customers", to: "/admin/customers" }, { label: "Discounts", to: "/admin/discounts" },
  ] },
  { group: "Website & Pages", items: [{ label: "Website pages", to: "/admin/website" }, { label: "Page sections", to: "/admin/sections" }] },
  { group: "Content Management", items: [{ label: "Page text & policies", to: "/admin/pages" }, { label: "Banners, popups & replacements", to: "/admin/content" }] },
  { group: "Design & Appearance", items: [{ label: "Appearance", to: "/admin/theme" }] },
  { group: "Media Library", items: [{ label: "Media", to: "/admin/media" }] },
  { group: "Navigation & Footer", items: [{ label: "Header & footer", to: "/admin/navigation" }] },
  { group: "Forms & Submissions", items: [{ label: "Forms", to: "/admin/forms" }] },
  { group: "SEO & Discoverability", items: [{ label: "SEO", to: "/admin/seo" }] },
  { group: "Website Settings", items: [{ label: "Settings", to: "/admin/settings" }] },
  { group: "Integrations", items: [{ label: "Integrations", to: "/admin/integrations" }] },
  { group: "Analytics", items: REPORTS.map((r) => ({ label: r.title.replace("Analytics overview", "Overview").replace("Analytics settings", "Settings"), report: r.id })) },
  { group: "Users & Permissions", items: [{ label: "Users & roles", to: "/admin/users" }] },
  { group: "Activity & Audit History", items: [{ label: "Activity Log", to: "/admin/activity" }] },
  { group: "Security", items: [{ label: "Security Center", to: "/admin/security" }] },
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
