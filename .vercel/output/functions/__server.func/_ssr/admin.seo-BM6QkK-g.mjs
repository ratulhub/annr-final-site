import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin, j as setState } from "./store-CG_wgU4l.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { a as F, l as UrlF, n as Chk, o as Obj, t as Big } from "./fields-C6he3K7U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.seo-BM6QkK-g.js
var import_jsx_runtime = require_jsx_runtime();
function Seo() {
	const s = useAdmin();
	const rows = [
		...s.pages.map((p) => ({
			kind: "pages",
			...p
		})),
		...s.collections.map((c) => ({
			kind: "collections",
			...c
		})),
		...s.products.map((p) => ({
			kind: "products",
			...p
		}))
	];
	const up = (r, k, v) => setState((x) => ({
		...x,
		[r.kind]: x[r.kind].map((y) => y.handle === r.handle ? {
			...y,
			[k]: v
		} : y)
	}));
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "SEO & discoverability" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Site defaults",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "seo",
				children: (v, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Home page title",
							value: v.homeTitle,
							onChange: (homeTitle) => set({ homeTitle }),
							placeholder: "Original title"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Title pattern",
							value: v.titlePattern,
							onChange: (titlePattern) => set({ titlePattern }),
							placeholder: "{title} | AnnR",
							validate: (t) => !t || t.includes("{title}") ? null : "Must include {title}"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Social sharing image",
							value: v.ogImage,
							onChange: (ogImage) => set({ ogImage })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Canonical domain",
							value: v.canonicalBase,
							onChange: (canonicalBase) => set({ canonicalBase })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Hide whole site from search engines",
							value: v.noindex,
							onChange: (noindex) => set({ noindex })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Product structured data",
							value: v.structuredData,
							onChange: (structuredData) => set({ structuredData })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Big, {
							label: "Default description (pages without one)",
							value: v.defaultDescription,
							onChange: (defaultDescription) => set({ defaultDescription }),
							rows: 2
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Big, {
							label: "robots.txt (saved for when the site has a server)",
							value: v.robots,
							onChange: (robots) => set({ robots }),
							rows: 3
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: `Page SEO (${rows.length})`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Type" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Page" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Search title" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Search description" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.kind.slice(0, -1) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.kind === "products" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: "link",
					to: "/admin/products/$handle",
					params: { handle: r.handle },
					children: r.title
				}) : r.title }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: r.seoTitle,
					onChange: (e) => up(r, "seoTitle", e.target.value)
				}), r.seoTitle.length > 60 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
					className: "adm-hint",
					children: [r.seoTitle.length, "/60"]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: r.seoDescription,
					onChange: (e) => up(r, "seoDescription", e.target.value)
				}), !r.seoDescription && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
					className: "adm-err",
					children: "Missing"
				})] })
			] }, r.kind + r.handle)) })] })
		})
	] });
}
//#endregion
export { Seo as component };
