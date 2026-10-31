import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as MODULES } from "./navigation-BwBMnIrm.mjs";
import { n as BackBtn } from "./ui-B5PZnb8M.mjs";
import { t as Route } from "./admin.m._module-DiH3gYuQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.m._module-J8xv8mnp.js
var import_jsx_runtime = require_jsx_runtime();
function ModulePage() {
	const { module } = Route.useParams();
	const m = MODULES[module];
	if (!m) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "adm-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Section not found" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			className: "link",
			to: "/admin",
			children: "Back to dashboard"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: m.title })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "adm-tag on",
			children: ["Active · ", m.part]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "adm-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Module capabilities" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				style: { margin: "10px 0 0 18px" },
				children: m.plan.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: p }, p))
			}),
			m.now && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: { marginTop: 14 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					className: "adm-btn",
					to: m.now.to,
					children: [m.now.label, " →"]
				})
			})
		]
	})] });
}
//#endregion
export { ModulePage as component };
