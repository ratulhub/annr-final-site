import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { F as uid, L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { c as Toggle, n as BackBtn, r as Card, s as Text, t as Area } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.pages-2kFLcwm2.js
var import_jsx_runtime = require_jsx_runtime();
function Pages() {
	const s = useAdmin();
	const up = (h, patch) => setState((x) => {
		let hidden = x.site.hiddenPages || [];
		if (patch.visible !== void 0) {
			const paths = [
				`/pages/${h}`,
				`/pages/${h}/index.html`,
				`/pages/${h}/`
			];
			if (patch.visible === false) paths.forEach((p) => {
				if (!hidden.includes(p)) hidden = [...hidden, p];
			});
			else hidden = hidden.filter((p) => !paths.includes(p));
		}
		return {
			...x,
			site: {
				...x.site,
				hiddenPages: hidden
			},
			pages: x.pages.map((p) => p.handle === h ? {
				...p,
				...patch
			} : p)
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
				"Store Pages & Policies (",
				s.pages.length,
				")"
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { margin: "2px 0 0" },
				children: "Manage FAQ, Terms, Shipping & Privacy policies"
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "adm-btn",
			onClick: () => setState((x) => ({
				...x,
				pages: [{
					handle: "page-" + uid(),
					title: "New page",
					body: "",
					visible: true,
					seoTitle: "",
					seoDescription: ""
				}, ...x.pages]
			})),
			style: {
				background: "var(--red)",
				borderColor: "var(--red)"
			},
			children: "+ Add page"
		})]
	}), s.pages.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: p.title,
		subtitle: `/pages/${p.handle}`,
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `adm-tag ${p.visible ? "active" : "draft"}`,
					children: p.visible ? "Visible" : "Hidden"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `adm-btn sm ${p.visible ? "ghost" : ""}`,
					onClick: () => up(p.handle, { visible: !p.visible }),
					children: p.visible ? "Hide" : "Show"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: `/pages/${p.handle}/index.html`,
					target: "_blank",
					rel: "noreferrer",
					className: "adm-btn ghost sm",
					children: "Preview ↗"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn danger sm",
					onClick: () => confirm(`Delete page "${p.title}"?`) && setState((x) => ({
						...x,
						pages: x.pages.filter((y) => y.handle !== p.handle)
					})),
					children: "Delete"
				})
			]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
					label: "Title",
					value: p.title,
					onChange: (v) => up(p.handle, { title: v })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
					label: "SEO title",
					value: p.seoTitle,
					onChange: (v) => up(p.handle, { seoTitle: v })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					label: "Visible",
					value: p.visible,
					onChange: (v) => up(p.handle, { visible: v })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
					label: "Content",
					value: p.body,
					onChange: (v) => up(p.handle, { body: v })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
					label: "SEO description",
					value: p.seoDescription,
					onChange: (v) => up(p.handle, { seoDescription: v })
				})
			]
		})
	}, p.handle))] });
}
//#endregion
export { Pages as component };
