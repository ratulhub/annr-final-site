//#region node_modules/.nitro/vite/services/ssr/assets/permissions-B5x35gQ-.js
var ROLES = [
	"super_admin",
	"admin",
	"content_manager",
	"product_manager",
	"order_manager",
	"marketing_manager",
	"analytics_viewer",
	"support_agent"
];
var PERMISSIONS = [
	"catalog.read",
	"catalog.write",
	"inventory.write",
	"pricing.write",
	"content.read",
	"content.write",
	"site.publish",
	"orders.read",
	"orders.write",
	"refunds.issue",
	"customers.read",
	"customers.write",
	"marketing.write",
	"analytics.read",
	"data.export",
	"media.write",
	"settings.write",
	"integrations.write",
	"users.manage",
	"roles.manage",
	"security.read",
	"security.write",
	"audit.read"
];
var ALL = [...PERMISSIONS];
var ROLE_PERMISSIONS = {
	super_admin: ALL,
	admin: ALL.filter((p) => !["roles.manage", "security.write"].includes(p)),
	content_manager: [
		"catalog.read",
		"content.read",
		"content.write",
		"site.publish",
		"media.write"
	],
	product_manager: [
		"catalog.read",
		"catalog.write",
		"inventory.write",
		"pricing.write",
		"media.write",
		"content.read"
	],
	order_manager: [
		"orders.read",
		"orders.write",
		"customers.read",
		"catalog.read"
	],
	marketing_manager: [
		"marketing.write",
		"content.read",
		"content.write",
		"analytics.read",
		"catalog.read"
	],
	analytics_viewer: ["analytics.read"],
	support_agent: [
		"orders.read",
		"customers.read",
		"catalog.read"
	]
};
function can(role, perm) {
	return !!role && (ROLE_PERMISSIONS[role] ?? []).includes(perm);
}
function canAssignRole(actorRole, actorId, targetId) {
	return actorRole === "super_admin" && actorId !== targetId;
}
var ROUTE_PERMISSION = [
	["/admin/security", "security.read"],
	["/admin/users", "users.manage"],
	["/admin/activity", "audit.read"],
	["/admin/products", "catalog.read"],
	["/admin/collections", "catalog.read"],
	["/admin/events", "marketing.write"],
	["/admin/orders", "orders.read"],
	["/admin/customers", "customers.read"],
	["/admin/discounts", "marketing.write"],
	["/admin/analytics", "analytics.read"],
	["/admin/settings", "settings.write"],
	["/admin/integrations", "integrations.write"],
	["/admin/publish", "site.publish"],
	["/admin/media", "media.write"],
	["/admin/seo", "content.write"],
	["/admin/forms", "content.read"],
	["/admin/website", "content.read"],
	["/admin/sections", "content.read"],
	["/admin/content", "content.read"],
	["/admin/pages", "content.read"],
	["/admin/navigation", "content.read"],
	["/admin/theme", "content.read"]
];
function permissionForPath(path) {
	return ROUTE_PERMISSION.find(([p]) => path === p || path.startsWith(p + "/"))?.[1] ?? null;
}
//#endregion
export { canAssignRole as a, can as i, ROLES as n, permissionForPath as o, ROLE_PERMISSIONS as r, PERMISSIONS as t };
