import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { t as IntegrationsCard } from "./IntegrationsCard-kGiRSFvJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.integrations-BHLI2hrl.js
var import_jsx_runtime = require_jsx_runtime();
function Integrations() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-top",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Integrations" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Services the store uses or will use. Nothing is connected from this panel yet, so every status is honest: Not connected."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrationsCard, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Already working through the live store",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: { marginTop: 0 },
				children: "Cart, checkout, payment, VIP account login and search are handled by the live Shopify store, not by this panel."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				className: "link",
				to: "/admin/analytics/$report",
				params: { report: "settings" },
				children: "Analytics providers"
			})]
		})
	] });
}
//#endregion
export { Integrations as component };
