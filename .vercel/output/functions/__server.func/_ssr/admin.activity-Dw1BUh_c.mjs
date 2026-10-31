import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { L as useAdmin, m as clearActivity } from "./store-CG_wgU4l.mjs";
import { n as BackBtn } from "./ui-B5PZnb8M.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.activity-Dw1BUh_c.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ActivityLog() {
	const s = useAdmin();
	const [q, setQ] = (0, import_react.useState)("");
	const [sec, setSec] = (0, import_react.useState)("all");
	const log = s.activity || [];
	const sections = ["all", ...Array.from(new Set(log.map((a) => a.section)))];
	const list = log.filter((a) => (sec === "all" || a.section === sec) && (a.item + " " + a.fields).toLowerCase().includes(q.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
					"Activity Log (",
					log.length,
					")"
				] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn danger",
				onClick: () => confirm("Clear the whole activity log?") && clearActivity(),
				children: "Clear log"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			style: { marginBottom: 10 },
			children: "Demo history saved in this browser. It can be cleared, so it is not a tamper-proof security audit trail."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: { marginBottom: 14 },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				placeholder: "Search item or field",
				value: q,
				onChange: (e) => setQ(e.target.value),
				style: { maxWidth: 300 }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value: sec,
				onChange: (e) => setSec(e.target.value),
				style: { maxWidth: 180 },
				children: sections.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: o }, o))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				padding: 0,
				overflowX: "auto"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "When" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Section" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Action" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Item" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Changed fields" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "By" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				colSpan: 6,
				children: "No changes recorded yet."
			}) }), list.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: new Date(a.at).toLocaleString() }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a.section }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "adm-tag" + (a.action === "added" ? " on" : ""),
					children: a.action
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a.item }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a.fields || "—" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a.by })
			] }, a.id))] })] })
		})
	] });
}
//#endregion
export { ActivityLog as component };
