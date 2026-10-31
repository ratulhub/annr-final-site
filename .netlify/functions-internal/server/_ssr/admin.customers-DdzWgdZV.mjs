import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { a as RowList, n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.customers-DdzWgdZV.js
var import_jsx_runtime = require_jsx_runtime();
function Customers() {
	const s = useAdmin();
	const vipCount = s.customers.filter((c) => c.tier !== "Bronze" || c.tags && c.tags.includes("vip")).length;
	const totalPoints = s.customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
	const blockedCount = s.customers.filter((c) => c.blocked).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-top",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 14
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
					"Customers (",
					s.customers.length,
					")"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { margin: "2px 0 0" },
					children: "Manage customer accounts, VIP loyalty tiers, and reward points"
				})] })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Customers" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: s.customers.length }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Registered shopper accounts" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "VIP members" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: vipCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Silver, Gold & Diamond" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reward points" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: totalPoints.toLocaleString() }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Points in circulation" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Blocked accounts" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: blockedCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: blockedCount > 0 ? "Restricted from ordering" : "No blocked users" })
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Customers",
			subtitle: "Manage customer contact info, loyalty points, VIP tiers, and status",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowList, {
				rows: s.customers,
				onChange: (r) => setState((x) => ({
					...x,
					customers: r
				})),
				blank: {
					name: "",
					email: "",
					phone: "",
					orders: 0,
					points: 0,
					tier: "Bronze",
					tags: "",
					blocked: false
				},
				fields: [
					{
						key: "name",
						label: "Full Name"
					},
					{
						key: "email",
						label: "Email Address"
					},
					{
						key: "phone",
						label: "Phone #"
					},
					{
						key: "orders",
						label: "Order Count",
						type: "number"
					},
					{
						key: "points",
						label: "Reward Points",
						type: "number"
					},
					{
						key: "tier",
						label: "VIP Tier",
						type: [
							"Bronze",
							"Silver",
							"Gold",
							"Diamond"
						]
					},
					{
						key: "tags",
						label: "Customer Tags (e.g. vip, wholesale)"
					},
					{
						key: "blocked",
						label: "Blocked?",
						type: "bool"
					}
				]
			})
		})
	] });
}
//#endregion
export { Customers as component };
