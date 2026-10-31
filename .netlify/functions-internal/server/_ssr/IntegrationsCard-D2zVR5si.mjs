import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite } from "./store-CNEGzpjs.mjs";
import { r as Card } from "./ui-D23-eAUw.mjs";
import { f as useSite } from "./fields-CAbwAx7K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/IntegrationsCard-D2zVR5si.js
var import_jsx_runtime = require_jsx_runtime();
function IntegrationsCard() {
	const site = useSite();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Integrations",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Service" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Type" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Notes" })
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: site.integrations.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: i.name }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: i.kind }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-tag",
				children: "Not connected"
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: i.note,
				onChange: (e) => setSite("integrations", site.integrations.map((x) => x.id === i.id ? {
					...x,
					note: e.target.value
				} : x))
			}) })
		] }, i.id)) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "No keys are stored here. Real connections need a backend so secrets stay private."
		})]
	});
}
//#endregion
export { IntegrationsCard as t };
