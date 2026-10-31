// Role-based permissions for the admin. In the demo this only drives the UI (read-only states, denied pages).
// The REAL enforcement is the database: database/sql/03_rbac.sql defines the same roles and
// permissions, and every RLS policy calls public.has_permission(). Keep the two lists in sync.

export const ROLES = [
  "super_admin", "admin", "content_manager", "product_manager", "order_manager",
  "marketing_manager", "analytics_viewer", "support_agent",
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "catalog.read", "catalog.write", "inventory.write", "pricing.write",
  "content.read", "content.write", "site.publish",
  "orders.read", "orders.write", "refunds.issue",
  "customers.read", "customers.write",
  "marketing.write", "analytics.read", "data.export",
  "media.write", "settings.write", "integrations.write",
  "users.manage", "roles.manage", "security.read", "security.write", "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ALL,
  // Everything except managing privileged roles and security settings.
  admin: ALL.filter((p) => !["roles.manage", "security.write"].includes(p)),
  content_manager: ["catalog.read", "content.read", "content.write", "site.publish", "media.write"],
  product_manager: ["catalog.read", "catalog.write", "inventory.write", "pricing.write", "media.write", "content.read"],
  order_manager: ["orders.read", "orders.write", "customers.read", "catalog.read"],
  marketing_manager: ["marketing.write", "content.read", "content.write", "analytics.read", "catalog.read"],
  analytics_viewer: ["analytics.read"],
  support_agent: ["orders.read", "customers.read", "catalog.read"],
};

export function can(role: Role | null | undefined, perm: Permission): boolean {
  return !!role && (ROLE_PERMISSIONS[role] ?? []).includes(perm);
}

// Only a super_admin may grant or revoke roles, and nobody may change their own role.
export function canAssignRole(actorRole: Role | null, actorId: string, targetId: string): boolean {
  return actorRole === "super_admin" && actorId !== targetId;
}

// Which permission each admin page needs (prefix match on the path).
export const ROUTE_PERMISSION: [string, Permission][] = [
  ["/admin/security", "security.read"], ["/admin/users", "users.manage"], ["/admin/activity", "audit.read"],
  ["/admin/products", "catalog.read"], ["/admin/collections", "catalog.read"], ["/admin/events", "marketing.write"],
  ["/admin/orders", "orders.read"], ["/admin/customers", "customers.read"], ["/admin/discounts", "marketing.write"],
  ["/admin/analytics", "analytics.read"], ["/admin/settings", "settings.write"], ["/admin/integrations", "integrations.write"],
  ["/admin/publish", "site.publish"], ["/admin/media", "media.write"], ["/admin/seo", "content.write"],
  ["/admin/forms", "content.read"], ["/admin/website", "content.read"], ["/admin/sections", "content.read"],
  ["/admin/content", "content.read"], ["/admin/pages", "content.read"], ["/admin/navigation", "content.read"],
  ["/admin/theme", "content.read"],
];
export function permissionForPath(path: string): Permission | null {
  return ROUTE_PERMISSION.find(([p]) => path === p || path.startsWith(p + "/"))?.[1] ?? null;
}
