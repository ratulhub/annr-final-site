import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { a as RowList, n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.discounts-CwRZzEbv.js
var import_jsx_runtime = require_jsx_runtime();
function Discounts() {
	const s = useAdmin();
	const activeCount = s.discounts.filter((d) => d.active).length;
	const totalUses = s.discounts.reduce((sum, d) => sum + (Number(d.uses) || 0), 0);
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
					"Promotions & Discounts (",
					s.discounts.length,
					")"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { margin: "2px 0 0" },
					children: "Create coupon codes, percentage sales, and free shipping vouchers"
				})] })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Active discount codes" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: activeCount }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [s.discounts.length - activeCount, " inactive / expired"] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total redemptions" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: totalUses }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Times discounts applied" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Supported types" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "4" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "% Off, ৳ Flat, Free shipping, BOGO" })
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Discounts",
			subtitle: "Manage active coupon codes, set minimum order values, and schedule expiration dates",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowList, {
				rows: s.discounts,
				onChange: (r) => setState((x) => ({
					...x,
					discounts: r
				})),
				blank: {
					code: "",
					type: "percentage",
					value: "10",
					minOrder: "0",
					uses: 0,
					limit: "",
					active: true,
					starts: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
					ends: ""
				},
				fields: [
					{
						key: "code",
						label: "Coupon Code"
					},
					{
						key: "type",
						label: "Discount Type",
						type: [
							"percentage",
							"fixed amount",
							"free shipping",
							"buy x get y"
						]
					},
					{
						key: "value",
						label: "Value (% or ৳)"
					},
					{
						key: "minOrder",
						label: "Min Order Amount (৳)"
					},
					{
						key: "limit",
						label: "Max Total Uses"
					},
					{
						key: "uses",
						label: "Times Used",
						type: "number"
					},
					{
						key: "starts",
						label: "Start Date"
					},
					{
						key: "ends",
						label: "End Date"
					},
					{
						key: "active",
						label: "Active?",
						type: "bool"
					}
				]
			})
		})
	] });
}
//#endregion
export { Discounts as component };
