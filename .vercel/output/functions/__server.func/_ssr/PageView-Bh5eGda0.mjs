import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as safeUrl, t as safeImageUrl } from "./sanitize-BCjiE7t3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PageView-Bh5eGda0.js
var import_jsx_runtime = require_jsx_runtime();
var fix = (u) => safeImageUrl(u.startsWith("//") ? "https:" + u : u) || void 0;
var safe = (u) => safeUrl(u);
function PageView({ page, products }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			fontFamily: "'NB Architekt Std', monospace",
			color: "#000",
			background: "#fff",
			padding: "40px 24px",
			maxWidth: 1200,
			margin: "0 auto",
			fontSize: 13
		},
		children: page.blocks.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockView, {
			b,
			products
		}, b.id))
	});
}
var SAFE_LEVELS = /* @__PURE__ */ new Set([
	"h1",
	"h2",
	"h3"
]);
var SAFE_ALIGNS = /* @__PURE__ */ new Set([
	"left",
	"center",
	"right"
]);
var SAFE_HANDLE = /^[a-z0-9][a-z0-9-]{0,99}$/i;
function BlockView({ b, products }) {
	const H = {
		fontFamily: "'Druk Wide', sans-serif",
		textTransform: "uppercase",
		margin: "0 0 16px",
		fontWeight: 500
	};
	switch (b.type) {
		case "heading": {
			const T = SAFE_LEVELS.has(b.level) ? b.level : "h2";
			const align = SAFE_ALIGNS.has(b.align) ? b.align : "left";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(T, {
				style: {
					...H,
					fontSize: T === "h1" ? 34 : T === "h2" ? 24 : 16,
					textAlign: align
				},
				children: String(b.text ?? "").slice(0, 500)
			});
		}
		case "text": {
			const align = SAFE_ALIGNS.has(b.align) ? b.align : "left";
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: {
					whiteSpace: "pre-wrap",
					lineHeight: 1.6,
					textAlign: align,
					margin: "0 0 16px"
				},
				children: String(b.text ?? "").slice(0, 2e4)
			});
		}
		case "image": {
			const src = fix(String(b.url ?? ""));
			return src ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
				style: { margin: "0 0 20px" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src,
					alt: String(b.alt ?? "").slice(0, 200),
					style: {
						width: "100%",
						display: "block"
					}
				}), b.caption && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
					style: {
						fontSize: 10,
						marginTop: 6,
						textTransform: "uppercase"
					},
					children: String(b.caption).slice(0, 300)
				})]
			}) : null;
		}
		case "button": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: safe(b.url),
			rel: "noopener noreferrer",
			style: {
				display: "inline-block",
				background: "#000",
				color: "#fff",
				padding: "12px 22px",
				textDecoration: "none",
				textTransform: "uppercase",
				fontSize: 11,
				letterSpacing: 1
			},
			children: String(b.label ?? "").slice(0, 80)
		}) });
		case "spacer": {
			const h = Math.min(Math.max(Number(b.size) || 40, 8), 400);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: h } });
		}
		case "faq": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: { marginBottom: 20 },
			children: (Array.isArray(b.items) ? b.items.slice(0, 50) : []).map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				style: {
					borderBottom: "1px solid #000",
					padding: "12px 0"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
					style: {
						cursor: "pointer",
						textTransform: "uppercase"
					},
					children: String(it.q ?? "").slice(0, 300)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: { marginTop: 8 },
					children: String(it.a ?? "").slice(0, 5e3)
				})]
			}, it.id))
		});
		case "gallery": {
			const cols = Math.min(Math.max(Math.floor(Number(b.columns) || 3), 1), 6);
			const imgs = String(b.images ?? "").split("\n").map((s) => fix(s.trim())).filter((u) => Boolean(u)).slice(0, 24);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					display: "grid",
					gridTemplateColumns: `repeat(${cols}, 1fr)`,
					gap: 10,
					marginBottom: 20
				},
				children: imgs.map((u, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: u,
					alt: "",
					style: {
						width: "100%",
						aspectRatio: "3/4",
						objectFit: "cover"
					}
				}, `${u}-${i}`))
			});
		}
		case "products": {
			const limit = Math.min(Math.max(Math.floor(Number(b.limit) || 4), 1), 24);
			const hs = String(b.handles ?? "").split(",").map((h) => h.trim()).filter((h) => SAFE_HANDLE.test(h));
			const list = (hs.length ? hs.map((h) => products.find((p) => p.handle === h)).filter(Boolean) : products).filter((p) => p.status === "active" && SAFE_HANDLE.test(p.handle)).slice(0, limit);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: { marginBottom: 24 },
				children: [b.title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					style: {
						...H,
						fontSize: 14
					},
					children: String(b.title).slice(0, 120)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
						gap: 14
					},
					children: list.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: `/products/${encodeURIComponent(p.handle)}/index.html`,
						style: {
							color: "#000",
							textDecoration: "none"
						},
						children: [
							p.image && fix(p.image) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: fix(p.image),
								alt: String(p.title ?? "").slice(0, 200),
								style: {
									width: "100%",
									aspectRatio: "3/4",
									objectFit: "cover",
									background: "#f2f2f2"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									textTransform: "uppercase",
									marginTop: 6
								},
								children: String(p.title ?? "").slice(0, 200)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: { fontSize: 11 },
								children: ["Tk ", String(p.price ?? "").replace(/\.00$/, "")]
							})
						]
					}, p.handle))
				})]
			});
		}
		default: return null;
	}
}
//#endregion
export { PageView as t };
