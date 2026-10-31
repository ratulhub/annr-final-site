import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { a as RowList, n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.orders-y2qNXcg7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Orders() {
	const s = useAdmin();
	const rows = s.orders.map((o) => ({ ...o }));
	const [downloadSuccess, setDownloadSuccess] = (0, import_react.useState)(false);
	const totalRevenue = s.orders.reduce((sum, o) => {
		return sum + (parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0);
	}, 0).toLocaleString("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const paidOrders = s.orders.filter((o) => o.payment.toLowerCase() === "paid").length;
	const unfulfilledOrders = s.orders.filter((o) => o.status.toLowerCase() === "unfulfilled").length;
	const exportCSV = () => {
		try {
			const csvRows = [[
				"Order ID",
				"Date",
				"Customer",
				"Email",
				"Items",
				"Total (BDT)",
				"Payment",
				"Status",
				"Address",
				"Note"
			].join(","), ...s.orders.map((o) => [
				`"${o.id}"`,
				`"${o.date}"`,
				`"${o.customer}"`,
				`"${o.email}"`,
				`"${o.items.replace(/"/g, "\"\"")}"`,
				`"${o.total}"`,
				`"${o.payment}"`,
				`"${o.status}"`,
				`"${o.address.replace(/"/g, "\"\"")}"`,
				`"${(o.note || "").replace(/"/g, "\"\"")}"`
			].join(","))];
			const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `annr-orders-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
			document.body.appendChild(link);
			link.click();
			link.remove();
			setDownloadSuccess(true);
			setTimeout(() => setDownloadSuccess(false), 3e3);
		} catch (e) {
			console.error(e);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 14
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
					"Orders (",
					s.orders.length,
					")"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { margin: "2px 0 0" },
					children: "Manage customer purchases, fulfillment, and revenue"
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn ghost",
					onClick: exportCSV,
					title: "Export orders as CSV spreadsheet",
					children: downloadSuccess ? "CSV exported" : "Export CSV"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total revenue" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: ["৳", totalRevenue] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [s.orders.length, " total orders"] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Paid orders" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: paidOrders }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: paidOrders === s.orders.length ? "100% paid" : `${s.orders.length - paidOrders} pending payment` })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-stat",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unfulfilled" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: unfulfilledOrders }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: unfulfilledOrders > 0 ? "Awaiting fulfillment" : "All orders fulfilled" })
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Orders",
			subtitle: "Manage customer orders, shipping details, payment, and fulfillment status",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowList, {
				rows,
				onChange: (r) => setState((x) => ({
					...x,
					orders: r
				})),
				blank: {
					date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
					customer: "",
					email: "",
					total: "0.00",
					status: "Unfulfilled",
					payment: "Pending",
					items: "",
					address: "",
					note: ""
				},
				fields: [
					{
						key: "id",
						label: "Order #"
					},
					{
						key: "date",
						label: "Date"
					},
					{
						key: "customer",
						label: "Customer"
					},
					{
						key: "email",
						label: "Email"
					},
					{
						key: "items",
						label: "Items"
					},
					{
						key: "total",
						label: "Total ৳"
					},
					{
						key: "payment",
						label: "Payment",
						type: [
							"Pending",
							"Paid",
							"COD",
							"Refunded"
						]
					},
					{
						key: "status",
						label: "Fulfillment",
						type: [
							"Unfulfilled",
							"Processing",
							"Shipped",
							"Fulfilled",
							"Cancelled",
							"Returned"
						]
					},
					{
						key: "address",
						label: "Shipping Address"
					},
					{
						key: "note",
						label: "Internal Notes"
					}
				]
			})
		})
	] });
}
//#endregion
export { Orders as component };
