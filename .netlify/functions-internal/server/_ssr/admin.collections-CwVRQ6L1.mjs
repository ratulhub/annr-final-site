import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { F as uid, L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { c as Toggle, n as BackBtn, o as Select, r as Card, s as Text, t as Area } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.collections-CwVRQ6L1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Collections() {
	const s = useAdmin();
	const [open, setOpen] = (0, import_react.useState)(null);
	const visibleCount = s.collections.filter((c) => c.visible).length;
	const up = (h, patch) => setState((x) => {
		let hidden = x.site.hiddenPages || [];
		if (patch.visible !== void 0) {
			const paths = [
				`/collections/${h}`,
				`/collections/${h}/index.html`,
				`/collections/${h}/`
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
			collections: x.collections.map((c) => c.handle === h ? {
				...c,
				...patch
			} : c)
		};
	});
	const add = () => {
		const h = "new-collection-" + uid();
		setState((x) => ({
			...x,
			collections: [{
				handle: h,
				title: "New collection",
				description: "",
				image: "",
				visible: true,
				sort: "manual",
				products: [],
				seoTitle: "",
				seoDescription: ""
			}, ...x.collections]
		}));
		setOpen(h);
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
					"Collections (",
					s.collections.length,
					")"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { margin: "2px 0 0" },
					children: "Group products into catalog categories and lookbooks"
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn primary",
					onClick: add,
					children: "Add collection"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-stat",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Active collections" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: visibleCount }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [s.collections.length - visibleCount, " hidden from store"] })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-stat",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total products" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: s.products.length }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Available to categorize" })
				]
			})]
		}),
		s.collections.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: c.title,
			subtitle: `/${c.handle} · ${c.products.length} products assigned`,
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `adm-tag ${c.visible ? "active" : "draft"}`,
						children: c.visible ? "Visible" : "Hidden"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `adm-btn sm ${c.visible ? "ghost" : ""}`,
						onClick: () => up(c.handle, { visible: !c.visible }),
						children: c.visible ? "Hide" : "Make Visible"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "adm-btn ghost sm",
						onClick: () => setOpen(open === c.handle ? null : c.handle),
						children: open === c.handle ? "Close Editor" : "Edit Details"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: `/collections/${c.handle}/index.html`,
						target: "_blank",
						rel: "noreferrer",
						className: "adm-btn ghost sm",
						children: "Preview ↗"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "adm-btn danger sm",
						onClick: () => confirm(`Delete collection "${c.title}"?`) && setState((x) => ({
							...x,
							collections: x.collections.filter((y) => y.handle !== c.handle)
						})),
						children: "Delete"
					})
				]
			}),
			children: open === c.handle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: { marginTop: 14 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
								label: "Title",
								value: c.title,
								onChange: (v) => up(c.handle, { title: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
								label: "Cover Image URL",
								value: c.image,
								onChange: (v) => up(c.handle, { image: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
								label: "Sort Products Order",
								value: c.sort,
								options: [
									"manual",
									"best selling",
									"newest",
									"price low-high",
									"price high-low",
									"a-z"
								],
								onChange: (v) => up(c.handle, { sort: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								label: "Visible on Storefront",
								value: c.visible,
								onChange: (v) => up(c.handle, { visible: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								label: "Description",
								value: c.description,
								onChange: (v) => up(c.handle, { description: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
								label: "SEO Meta Title",
								value: c.seoTitle,
								onChange: (v) => up(c.handle, { seoTitle: v })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								label: "SEO Meta Description",
								value: c.seoDescription,
								onChange: (v) => up(c.handle, { seoDescription: v })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: { margin: "20px 0 10px" },
						children: "Assign Products to This Collection"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
							gap: 8,
							padding: 12,
							background: "var(--soft)",
							borderRadius: 6
						},
						children: s.products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: p.title,
							value: c.products.includes(p.handle),
							onChange: (v) => up(c.handle, { products: v ? [...c.products, p.handle] : c.products.filter((h) => h !== p.handle) })
						}, p.handle))
					})
				]
			})
		}, c.handle))
	] });
}
//#endregion
export { Collections as component };
