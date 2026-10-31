import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as PageView } from "./PageView-Bh5eGda0.mjs";
import { t as Route } from "./p._slug-DGuu_Tga.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/p._slug-CeI5CBgv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/i;
function CustomPageRoute() {
	const { slug } = Route.useParams();
	const [data, setData] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!SAFE_SLUG.test(slug)) {
			setData({
				page: null,
				products: []
			});
			return;
		}
		const preview = new URLSearchParams(location.search).get("preview") === "1";
		try {
			const cfg = JSON.parse(localStorage.getItem(preview ? "shihiko-site-draft" : "shihiko-site-config") || "null");
			const page = (cfg?.site?.customPages || []).find((p) => p.slug === slug && (preview || p.status === "published")) || null;
			setData({
				page,
				products: cfg?.catalog || []
			});
			if (page) document.title = page.seoTitle || `${page.title} | AnnR`;
		} catch {
			setData({
				page: null,
				products: []
			});
		}
	}, [slug]);
	if (!data) return null;
	if (!data.page) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			fontFamily: "'Druk Wide', sans-serif",
			padding: 80,
			textAlign: "center",
			textTransform: "uppercase"
		},
		children: [
			"Page not found",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/home.html",
				style: {
					fontSize: 12,
					color: "#000"
				},
				children: "Home"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				borderBottom: "1px solid #000",
				padding: "14px 24px",
				fontFamily: "'Druk Wide', sans-serif",
				textTransform: "uppercase"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/home.html",
				style: {
					color: "#000",
					textDecoration: "none"
				},
				children: "AnnR"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageView, {
			page: data.page,
			products: data.products
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				borderTop: "1px solid #000",
				padding: "16px 24px",
				fontFamily: "'NB Architekt Std', sans-serif",
				fontSize: 11,
				textTransform: "uppercase",
				display: "flex",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: 8
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "COPYRIGHT © 2026 AnnR, Inc. ALL RIGHTS RESERVED." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["created by ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "https://ratul.site",
				target: "_blank",
				rel: "noopener noreferrer",
				style: {
					color: "#000",
					fontWeight: 700,
					textDecoration: "underline"
				},
				children: "Ratul"
			})] })]
		})
	] });
}
//#endregion
export { CustomPageRoute as component };
