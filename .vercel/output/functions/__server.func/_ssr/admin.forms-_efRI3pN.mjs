import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, F as uid } from "./store-CG_wgU4l.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { a as F, d as move, f as useSite, s as OrderBtns } from "./fields-C6he3K7U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.forms-_efRI3pN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var APPLIED = {
	newsletter: "Title, button, placeholder and consent text update on the store.",
	search: "Placeholder updates on the store.",
	"vip-login": "Title, button, email/password placeholders and consent text update on /account/login; sign-in submission is handled by Shopify.",
	"vip-register": "Title, button and consent text update on /account/register; registration submission is handled by Shopify."
};
function Forms() {
	const site = useSite();
	const [open, setOpen] = (0, import_react.useState)(site.forms[0]?.id);
	const save = (f) => setSite("forms", site.forms.map((x) => x.id === f.id ? f : x));
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Forms & submissions" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-row",
			style: { marginBottom: 14 },
			children: site.forms.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: `adm-btn ${open === f.id ? "" : "ghost"}`,
				onClick: () => setOpen(f.id),
				children: f.name
			}, f.id))
		}),
		site.forms.filter((f) => f.id === open).map((f) => {
			const setF = (fields) => save({
				...f,
				fields
			});
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					title: f.name,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "adm-hint",
						children: [
							"Appears on: ",
							f.where,
							". ",
							APPLIED[f.id]
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Title",
								value: f.title,
								onChange: (title) => save({
									...f,
									title
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Submit button",
								value: f.button,
								onChange: (button) => save({
									...f,
									button
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Success message",
								value: f.success,
								onChange: (success) => save({
									...f,
									success
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Error message",
								value: f.error,
								onChange: (error) => save({
									...f,
									error
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Consent / privacy text",
								value: f.consent,
								onChange: (consent) => save({
									...f,
									consent
								})
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					title: "Fields",
					action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: () => setF([...f.fields, {
							id: uid(),
							key: "field",
							label: "New field",
							placeholder: "",
							required: false,
							enabled: true
						}]),
						children: "+ Add field"
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Label" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Placeholder" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Required" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Enabled" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: f.fields.map((x, i) => {
						const up = (p) => setF(f.fields.map((y) => y.id === x.id ? {
							...y,
							...p
						} : y));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
								i,
								n: f.fields.length,
								onMove: (to) => setF(move(f.fields, i, to))
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: x.label,
								onChange: (e) => up({ label: e.target.value })
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: x.placeholder,
								onChange: (e) => up({ placeholder: e.target.value })
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: x.required,
								onChange: (e) => up({ required: e.target.checked })
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: x.enabled,
								onChange: (e) => up({ enabled: e.target.checked })
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn danger sm",
								onClick: () => confirm("Remove field?") && setF(f.fields.filter((y) => y.id !== x.id)),
								children: "✕"
							}) })
						] }, x.id);
					}) })] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					title: "Submissions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"No submissions. This store's forms send to the live Shopify store, not to this admin, so nothing is recorded here yet. Submissions will appear in ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "public.contact_submissions" }),
						" once the Supabase backend is connected."
					] })
				})
			] }, f.id);
		})
	] });
}
//#endregion
export { Forms as component };
