import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as setSite, F as uid, L as useAdmin, n as BLOCKS } from "./store-CG_wgU4l.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { d as move, s as OrderBtns } from "./fields-C6he3K7U.mjs";
import { t as Route } from "./admin.website_._id-RI9Fp05t.mjs";
import { t as PageView } from "./PageView-Bh5eGda0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.website_._id-xGTTbtWl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function EditPage() {
	const { id } = Route.useParams();
	const s = useAdmin();
	const [device, setDevice] = (0, import_react.useState)("100%");
	const page = s.site.customPages.find((p) => p.id === id);
	if (!page) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Page not found",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			className: "link",
			to: "/admin/website",
			children: "Back to pages"
		})
	});
	const save = (p) => setSite("customPages", s.site.customPages.map((x) => x.id === id ? {
		...x,
		...p
	} : x));
	const setB = (blocks) => save({ blocks });
	const upB = (bid, p) => setB(page.blocks.map((b) => b.id === bid ? {
		...b,
		...p
	} : b));
	const errors = page.blocks.map((b) => BLOCKS[b.type].validate(b)).filter(Boolean);
	const imgs = s.site.media;
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
					to: "/admin/website",
					label: "← Website Pages"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: page.title })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: "adm-btn ghost",
					to: "/admin/website",
					children: "All pages"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: page.status,
					onChange: (e) => save({ status: e.target.value }),
					style: { width: 140 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "draft",
						children: "draft"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "published",
						children: "published"
					})]
				})]
			})]
		}),
		errors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-err",
			style: { marginBottom: 12 },
			children: ["Fix before publishing: ", errors.join(" · ")]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Page details",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-grid",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: page.title,
							onChange: (e) => save({ title: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: page.seoTitle,
							onChange: (e) => save({ seoTitle: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: page.seoDescription,
							onChange: (e) => save({ seoDescription: e.target.value })
						})]
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "grid",
				gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
				gap: 18
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [page.blocks.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-row",
						style: {
							justifyContent: "space-between",
							marginBottom: 10
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: BLOCKS[b.type].label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "adm-row",
							style: { gap: 4 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
									i,
									n: page.blocks.length,
									onMove: (to) => setB(move(page.blocks, i, to))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "adm-btn ghost sm",
									onClick: () => setB([
										...page.blocks.slice(0, i + 1),
										{
											...structuredClone(b),
											id: uid()
										},
										...page.blocks.slice(i + 1)
									]),
									children: "Copy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "adm-btn danger sm",
									onClick: () => confirm("Remove block?") && setB(page.blocks.filter((x) => x.id !== b.id)),
									children: "✕"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockEditor, {
						b,
						up: (p) => upB(b.id, p),
						images: imgs.map((m) => ({
							name: m.name,
							url: m.url
						}))
					}),
					BLOCKS[b.type].validate(b) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
						className: "adm-err",
						children: BLOCKS[b.type].validate(b)
					})
				]
			}, b.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				children: Object.keys(BLOCKS).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "adm-btn ghost sm",
					onClick: () => setB([...page.blocks, {
						...BLOCKS[t].blank(),
						id: uid()
					}]),
					children: ["+ ", BLOCKS[t].label]
				}, t))
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Preview",
				action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "adm-row",
					style: { gap: 4 },
					children: [
						["Desktop", "100%"],
						["Tablet", "768px"],
						["Mobile", "375px"]
					].map(([l, w]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `adm-btn sm ${device === w ? "" : "ghost"}`,
						onClick: () => setDevice(w),
						children: l
					}, l))
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						border: "1.5px solid var(--line)",
						borderRadius: 8,
						overflow: "auto",
						maxHeight: 700,
						background: "#ffffff"
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							width: device,
							maxWidth: "100%",
							margin: "0 auto"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageView, {
							page,
							products: s.products.map((p) => ({
								handle: p.handle,
								title: p.title,
								price: p.price,
								image: p.images[0] || "",
								status: p.status
							}))
						})
					})
				})
			})]
		})
	] });
}
function BlockEditor({ b, up, images }) {
	const rec = b;
	const t = (k, label, area = false) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		style: area ? { gridColumn: "1/-1" } : void 0,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), area ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			value: rec[k] || "",
			onChange: (e) => up({ [k]: e.target.value })
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value: rec[k] || "",
			onChange: (e) => up({ [k]: e.target.value })
		})]
	});
	const sel = (k, label, opts) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			value: rec[k] || "",
			onChange: (e) => up({ [k]: e.target.value }),
			children: opts.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: o }, o))
		})]
	});
	switch (b.type) {
		case "heading": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [
				t("text", "Text"),
				sel("level", "Size", [
					"h1",
					"h2",
					"h3"
				]),
				sel("align", "Align", [
					"left",
					"center",
					"right"
				])
			]
		});
		case "text": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [t("text", "Text", true), sel("align", "Align", [
				"left",
				"center",
				"right"
			])]
		});
		case "image": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Image" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: b.url,
						onChange: (e) => up({ url: e.target.value }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Choose from media…"
						}), images.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: m.url,
							children: m.name
						}, m.url))]
					})]
				}),
				t("alt", "Alt text"),
				t("caption", "Caption")
			]
		});
		case "button": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [t("label", "Label"), t("url", "Link")]
		});
		case "products": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [
				t("title", "Title"),
				t("handles", "Product handles (comma separated, empty = newest)"),
				t("limit", "How many")
			]
		});
		case "gallery": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			children: [t("images", "Image links (one per line)", true), sel("columns", "Columns", [
				"2",
				"3",
				"4"
			])]
		});
		case "spacer": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-grid",
			children: sel("size", "Height", [
				"20",
				"40",
				"80",
				"120"
			])
		});
		case "faq": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [b.items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-grid",
			style: { marginBottom: 8 },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Question" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: it.q,
						onChange: (e) => up({ items: b.items.map((x) => x.id === it.id ? {
							...x,
							q: e.target.value
						} : x) })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Answer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: it.a,
						onChange: (e) => up({ items: b.items.map((x) => x.id === it.id ? {
							...x,
							a: e.target.value
						} : x) })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "adm-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
						i,
						n: b.items.length,
						onMove: (to) => up({ items: move(b.items, i, to) })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger sm",
						onClick: () => up({ items: b.items.filter((x) => x.id !== it.id) }),
						children: "✕"
					})]
				})
			]
		}, it.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "adm-btn ghost sm",
			onClick: () => up({ items: [...b.items, {
				id: uid(),
				q: "",
				a: ""
			}] }),
			children: "+ Question"
		})] });
	}
}
//#endregion
export { EditPage as component };
