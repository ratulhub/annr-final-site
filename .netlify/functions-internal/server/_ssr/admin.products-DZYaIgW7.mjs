import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { F as uid, L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { n as BackBtn } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.products-DZYaIgW7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Products() {
	const s = useAdmin();
	const nav = useNavigate();
	const [q, setQ] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("all");
	const list = s.products.filter((p) => (status === "all" || p.status === status) && p.title.toLowerCase().includes(q.toLowerCase()));
	const add = () => {
		const handle = "new-product-" + uid();
		const p = {
			handle,
			title: "New product",
			description: "",
			price: "0.00",
			compareAt: "",
			currency: "BDT",
			status: "draft",
			vendor: "AnnR",
			type: "",
			tags: "",
			images: [],
			variants: [{
				id: uid(),
				option: "M",
				sku: "",
				price: "0.00",
				stock: 10
			}],
			collections: [],
			seoTitle: "",
			seoDescription: "",
			weight: "",
			badge: "",
			featured: false,
			trackStock: true,
			allowBackorder: false,
			sizeChart: ""
		};
		setState((x) => ({
			...x,
			products: [p, ...x.products]
		}));
		nav({
			to: "/admin/products/$handle",
			params: { handle }
		});
	};
	const duplicate = (orig) => {
		const handle = `${orig.handle}-copy-${uid()}`;
		const p = {
			...orig,
			handle,
			title: `${orig.title} (Copy)`,
			status: "draft",
			variants: orig.variants.map((v) => ({
				...v,
				id: uid(),
				sku: `${v.sku}-COPY`
			}))
		};
		setState((x) => ({
			...x,
			products: [p, ...x.products]
		}));
	};
	const toggleStatus = (p) => {
		const nextStatus = p.status === "active" ? "draft" : "active";
		setState((x) => ({
			...x,
			products: x.products.map((item) => item.handle === p.handle ? {
				...item,
				status: nextStatus
			} : item)
		}));
	};
	const setAll = (st) => setState((x) => ({
		...x,
		products: x.products.map((p) => list.includes(p) ? {
			...p,
			status: st
		} : p)
	}));
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
					"Products (",
					s.products.length,
					")"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "adm-hint",
					style: { margin: "2px 0 0" },
					children: [
						s.products.filter((p) => p.status === "active").length,
						" active · ",
						s.products.filter((p) => p.status === "draft").length,
						" drafts"
					]
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn primary",
					onClick: add,
					children: "Add product"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				padding: 14,
				marginBottom: 16
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { justifyContent: "space-between" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					style: {
						flex: 1,
						minWidth: 260
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							placeholder: "Search products...",
							value: q,
							onChange: (e) => setQ(e.target.value),
							style: { maxWidth: 300 }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: status,
							onChange: (e) => setStatus(e.target.value),
							style: { maxWidth: 160 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: "all",
									children: [
										"All statuses (",
										s.products.length,
										")"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: "active",
									children: [
										"Active only (",
										s.products.filter((p) => p.status === "active").length,
										")"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: "draft",
									children: [
										"Drafts only (",
										s.products.filter((p) => p.status === "draft").length,
										")"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: "archived",
									children: [
										"Archived only (",
										s.products.filter((p) => p.status === "archived").length,
										")"
									]
								})
							]
						}),
						q && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost sm",
							onClick: () => setQ(""),
							children: "Clear"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost sm",
						onClick: () => setAll("active"),
						children: "Set active"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost sm",
						onClick: () => setAll("draft"),
						children: "Set draft"
					})]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				padding: 0,
				overflowX: "auto"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { width: 56 } }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Product" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Price" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Inventory" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Variants" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: {
						textAlign: "right",
						paddingRight: 16
					},
					children: "Actions"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: list.map((p) => {
				const totalStock = p.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0);
				const isLow = totalStock <= 2;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.images[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: p.images[0],
						alt: "",
						style: { borderRadius: 4 }
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							width: 44,
							height: 44,
							background: "var(--p-background)",
							borderRadius: 4,
							border: "1px solid var(--p-border-subdued)",
							display: "grid",
							placeItems: "center",
							fontSize: 10,
							color: "var(--p-text-subdued)"
						},
						children: "No img"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: "link",
						to: "/admin/products/$handle",
						params: { handle: p.handle },
						style: {
							fontSize: 13.5,
							fontWeight: 500
						},
						children: p.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 12,
							color: "var(--p-text-subdued)",
							marginTop: 2
						},
						children: [
							"/",
							p.handle,
							" ",
							p.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "adm-tag",
								style: {
									fontSize: 10,
									padding: "1px 5px",
									marginLeft: 4
								},
								children: p.badge
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => toggleStatus(p),
						title: "Click to toggle status",
						style: {
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 0
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `adm-tag ${p.status === "active" ? "active" : p.status === "draft" ? "draft" : "danger"}`,
							children: p.status
						})
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						style: { fontWeight: 500 },
						children: ["৳", p.price]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: isLow ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "adm-tag danger",
						children: [totalStock, " in stock"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						style: { color: "var(--p-text)" },
						children: [totalStock, " in stock"]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: {
							color: "var(--p-text-subdued)",
							fontSize: 12.5
						},
						children: p.variants.map((v) => v.option).join(", ")
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						style: {
							textAlign: "right",
							paddingRight: 16
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-row",
							style: {
								justifyContent: "flex-end",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									className: "adm-btn ghost sm",
									to: "/admin/products/$handle",
									params: { handle: p.handle },
									children: "Edit"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "adm-btn ghost sm",
									onClick: () => duplicate(p),
									title: "Duplicate this product",
									children: "Duplicate"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "adm-btn danger sm",
									onClick: () => {
										if (confirm(`Delete product "${p.title}"?`)) setState((x) => ({
											...x,
											products: x.products.filter((y) => y.handle !== p.handle)
										}));
									},
									children: "Delete"
								})
							]
						})
					})
				] }, p.handle);
			}) })] })
		})
	] });
}
//#endregion
export { Products as component };
