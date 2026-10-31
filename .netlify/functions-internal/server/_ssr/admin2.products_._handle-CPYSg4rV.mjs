import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { a as RowList, c as Toggle, n as BackBtn, o as Select, r as Card, s as Text, t as Area } from "./ui-D23-eAUw.mjs";
import { n as storeFile } from "./media-DsiAOlfE.mjs";
import { t as safeImageUrl } from "./sanitize-BCjiE7t3.mjs";
import { t as Route } from "./admin.products_._handle-v6t-Uy0N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin2.products_._handle-CPYSg4rV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Edit() {
	const { handle } = Route.useParams();
	const s = useAdmin();
	const nav = useNavigate();
	const p = s.products.find((x) => x.handle === handle);
	const [img, setImg] = (0, import_react.useState)("");
	const [imgErr, setImgErr] = (0, import_react.useState)("");
	if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Product not found. ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		className: "link",
		to: "/admin/products",
		children: "Back"
	})] });
	const up = (patch) => setState((x) => ({
		...x,
		products: x.products.map((y) => y.handle === handle ? {
			...y,
			...patch
		} : y)
	}));
	const toggleCol = (h) => up({ collections: p.collections.includes(h) ? p.collections.filter((c) => c !== h) : [...p.collections, h] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin/products",
					label: "← Products"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: p.title })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "adm-saved",
						children: "Auto-saved"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "adm-btn ghost",
						href: `/products/${p.handle}/index.html`,
						target: "_blank",
						rel: "noreferrer",
						children: "View"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: () => {
							const h = p.handle + "-copy";
							setState((x) => ({
								...x,
								products: [{
									...p,
									handle: h,
									title: p.title + " (copy)",
									status: "draft"
								}, ...x.products]
							}));
							nav({
								to: "/admin/products/$handle",
								params: { handle: h }
							});
						},
						children: "Duplicate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger",
						onClick: () => {
							if (confirm("Delete this product?")) {
								setState((x) => ({
									...x,
									products: x.products.filter((y) => y.handle !== handle)
								}));
								nav({ to: "/admin/products" });
							}
						},
						children: "Delete"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Details",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Title",
						value: p.title,
						onChange: (v) => up({ title: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
						label: "Status",
						value: p.status,
						options: [
							"active",
							"draft",
							"archived"
						],
						onChange: (v) => up({ status: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Vendor",
						value: p.vendor,
						onChange: (v) => up({ vendor: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Product type",
						value: p.type,
						onChange: (v) => up({ type: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Tags (comma separated)",
						value: p.tags,
						onChange: (v) => up({ tags: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Badge (e.g. NEW, SOLD OUT)",
						value: p.badge,
						onChange: (v) => up({ badge: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
						label: "Description",
						value: p.description,
						onChange: (v) => up({ description: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
						label: "Size chart / extra info",
						value: p.sizeChart,
						onChange: (v) => up({ sizeChart: v })
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Pricing",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Price",
						value: p.price,
						onChange: (v) => up({ price: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Compare-at price",
						value: p.compareAt,
						onChange: (v) => up({ compareAt: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
						label: "Currency",
						value: p.currency,
						options: [
							"BDT",
							"USD",
							"EUR",
							"INR"
						],
						onChange: (v) => up({ currency: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "Weight (kg)",
						value: p.weight,
						onChange: (v) => up({ weight: v })
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Images",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-thumbs",
					children: p.images.map((src, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src,
							alt: ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => up({ images: p.images.filter((_, j) => j !== i) }),
							children: "✕"
						}),
						i > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							style: {
								left: 2,
								right: "auto"
							},
							onClick: () => {
								const a = [...p.images];
								const tmp = a[i - 1];
								a[i - 1] = a[i];
								a[i] = tmp;
								up({ images: a });
							},
							children: "←"
						})
					] }, src + i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					style: { marginTop: 12 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							placeholder: "Image URL",
							value: img,
							onChange: (e) => {
								setImg(e.target.value);
								setImgErr("");
							},
							style: { maxWidth: 400 }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost",
							onClick: () => {
								const clean = safeImageUrl(img);
								if (!clean) {
									setImgErr("Enter a valid / or https:// image URL (SVG is not allowed).");
									return;
								}
								setImgErr("");
								up({ images: [...p.images, clean] });
								setImg("");
							},
							children: "Add URL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-btn ghost",
							children: ["Upload", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "image/*",
								hidden: true,
								onChange: async (e) => {
									const f = e.target.files?.[0];
									if (!f) return;
									setImgErr("");
									try {
										const url = await storeFile(f);
										up({ images: [...p.images, url] });
									} catch (err) {
										setImgErr(err.message);
									}
								}
							})]
						})
					]
				}),
				imgErr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-err",
					style: { marginTop: 8 },
					children: imgErr
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Variants & inventory",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { marginBottom: 12 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						label: "Track stock",
						value: p.trackStock,
						onChange: (v) => up({ trackStock: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						label: "Sell when out of stock",
						value: p.allowBackorder,
						onChange: (v) => up({ allowBackorder: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						label: "Featured",
						value: p.featured,
						onChange: (v) => up({ featured: v })
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowList, {
				rows: p.variants,
				onChange: (v) => up({ variants: v }),
				blank: {
					option: "",
					sku: "",
					price: p.price,
					stock: 0
				},
				fields: [
					{
						key: "option",
						label: "Option / size"
					},
					{
						key: "sku",
						label: "SKU"
					},
					{
						key: "price",
						label: "Price"
					},
					{
						key: "stock",
						label: "Stock",
						type: "number"
					}
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Collections",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				children: s.collections.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					label: c.title,
					value: p.collections.includes(c.handle),
					onChange: () => toggleCol(c.handle)
				}, c.handle))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Search engine listing",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "URL handle",
						value: p.handle,
						onChange: (v) => {
							up({ handle: v });
							nav({
								to: "/admin/products/$handle",
								params: { handle: v },
								replace: true
							});
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
						label: "SEO title",
						value: p.seoTitle,
						onChange: (v) => up({ seoTitle: v })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
						label: "SEO description",
						value: p.seoDescription,
						onChange: (v) => up({ seoDescription: v })
					})
				]
			})
		})
	] });
}
//#endregion
export { Edit as component };
