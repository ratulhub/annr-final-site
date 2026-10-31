import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as setSite, F as uid, L as useAdmin, N as siteDefaults, j as setState } from "./store-CG_wgU4l.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { a as F, d as move, f as useSite, l as UrlF, n as Chk, o as Obj, s as OrderBtns, u as isUrl } from "./fields-C6he3K7U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.navigation-DPutPa_i.js
var import_jsx_runtime = require_jsx_runtime();
var NAVBAR_HANDLES = [
	"bonsai",
	"golden-goal",
	"samurai",
	"clocked-out",
	"divine",
	"classics",
	"archived"
];
function Navigation() {
	const site = useSite();
	const s = useAdmin();
	const h = site.header, f = site.footer;
	const setItems = (items) => setSite("header", {
		...h,
		items
	});
	const setCols = (columns) => setSite("footer", {
		...f,
		columns
	});
	const dropdownCollections = [...NAVBAR_HANDLES.map((h) => s.collections.find((c) => c.handle === h)).filter(Boolean), ...s.collections.filter((c) => !NAVBAR_HANDLES.includes(c.handle))];
	const upCol = (handle, patch) => setState((x) => ({
		...x,
		collections: x.collections.map((c) => c.handle === handle ? {
			...c,
			...patch
		} : c)
	}));
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
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Navigation, header & footer" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn ghost",
				onClick: () => confirm("Reset header and footer to the original?") && (setSite("header", siteDefaults().header), setSite("footer", siteDefaults().footer)),
				children: "Reset to original"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Header menu",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: () => setItems([...h.items, {
					id: uid(),
					label: "New link",
					url: "/collections/all/index.html",
					newTab: false,
					visible: true,
					original: null,
					device: "all"
				}]),
				children: "+ Add link"
			}),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "“Shop” and “Collections” keep their original drop-down menus; you can rename, hide or move them."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Label" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Link" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "New tab" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Show on" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Visible" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: h.items.map((it, i) => {
				const up = (p) => setItems(h.items.map((x) => x.id === it.id ? {
					...x,
					...p
				} : x));
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
						i,
						n: h.items.length,
						onMove: (to) => setItems(move(h.items, i, to))
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: it.label,
						onChange: (e) => up({ label: e.target.value })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [it.original === 1 || it.original === 2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "adm-hint",
						children: "drop-down menu"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: it.url,
						"aria-invalid": !isUrl(it.url),
						onChange: (e) => up({ url: e.target.value })
					}), !isUrl(it.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
						className: "adm-err",
						children: "Invalid link"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: it.newTab,
						onChange: (e) => up({ newTab: e.target.checked })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: it.device,
						onChange: (e) => up({ device: e.target.value }),
						children: [
							"all",
							"desktop",
							"mobile"
						].map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: o }, o))
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: it.visible,
						onChange: (e) => up({ visible: e.target.checked })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger sm",
						onClick: () => confirm(`Remove “${it.label}”?`) && setItems(h.items.filter((x) => x.id !== it.id)),
						children: "✕"
					}) })
				] }, it.id);
			}) })] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Collections Dropdown Menu (Navbar References)",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "adm-hint",
				children: [
					"These items appear directly under the “Collections” mega-menu and mobile navigation dropdown, as well as the collection category bar. They are live references to your collections in ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Collections" }),
					". When you edit titles or visibility here or in Collections, changes sync everywhere immediately."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Collection" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Handle / Link" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Navbar Display Title" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Visible" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Actions" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: dropdownCollections.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: col.title }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: [
					"/collections/",
					col.handle,
					"/index.html"
				] }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: col.title,
					onChange: (e) => upCol(col.handle, { title: e.target.value }),
					style: { maxWidth: 220 }
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: col.visible !== false,
					onChange: (e) => upCol(col.handle, { visible: e.target.checked })
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/admin/collections",
					className: "adm-btn ghost sm",
					style: { textDecoration: "none" },
					children: "Edit Collection →"
				}) })
			] }, col.handle)) })] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Header options",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "header",
				children: (v, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show VIP button",
							value: v.showVip,
							onChange: (showVip) => set({ showVip })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show cart button",
							value: v.showCart,
							onChange: (showCart) => set({ showCart })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Sticky header",
							value: v.sticky,
							onChange: (sticky) => set({ sticky })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Extra button label",
							value: v.ctaLabel,
							onChange: (ctaLabel) => set({ ctaLabel }),
							hint: "Leave empty for none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Extra button link",
							value: v.ctaUrl,
							onChange: (ctaUrl) => set({ ctaUrl })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Footer columns",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: () => setCols([...f.columns, {
					id: uid(),
					title: "NEW:",
					visible: true,
					links: []
				}]),
				children: "+ Add column"
			}),
			children: f.columns.map((c, ci) => {
				const upC = (p) => setCols(f.columns.map((x) => x.id === c.id ? {
					...x,
					...p
				} : x));
				const setL = (links) => upC({ links });
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-row",
							style: { justifyContent: "space-between" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: c.title,
								onChange: (e) => upC({ title: e.target.value }),
								style: { maxWidth: 240 }
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "adm-row",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
										label: "Visible",
										value: c.visible,
										onChange: (visible) => upC({ visible })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
										i: ci,
										n: f.columns.length,
										onMove: (to) => setCols(move(f.columns, ci, to))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn danger sm",
										onClick: () => confirm(`Delete column “${c.title}”?`) && setCols(f.columns.filter((x) => x.id !== c.id)),
										children: "Delete"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
							style: { marginTop: 10 },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: c.links.map((l, i) => {
								const up = (p) => setL(c.links.map((x) => x.id === l.id ? {
									...x,
									...p
								} : x));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
										i,
										n: c.links.length,
										onMove: (to) => setL(move(c.links, i, to))
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: l.label,
										onChange: (e) => up({ label: e.target.value })
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: l.url,
										"aria-invalid": !isUrl(l.url),
										onChange: (e) => up({ url: e.target.value })
									}), !isUrl(l.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
										className: "adm-err",
										children: "Invalid link"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "adm-check",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: l.newTab,
											onChange: (e) => up({ newTab: e.target.checked })
										}), "new tab"]
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "adm-check",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: l.visible,
											onChange: (e) => up({ visible: e.target.checked })
										}), "visible"]
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn danger sm",
										onClick: () => setL(c.links.filter((x) => x.id !== l.id)),
										children: "✕"
									}) })
								] }, l.id);
							}) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost sm",
							style: { marginTop: 8 },
							onClick: () => setL([...c.links, {
								id: uid(),
								label: "Link",
								url: "/home.html",
								newTab: false,
								visible: true
							}]),
							children: "+ Add link"
						})
					]
				}, c.id);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Footer options",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "footer",
				children: (v, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show newsletter signup",
							value: v.showSubscribe,
							onChange: (showSubscribe) => set({ showSubscribe })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show contact email",
							value: v.showEmail,
							onChange: (showEmail) => set({ showEmail })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show payment icons",
							value: v.showPayments,
							onChange: (showPayments) => set({ showPayments })
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "general",
				children: (g, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					style: { marginTop: 14 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Contact label",
							value: g.contactLabel,
							onChange: (contactLabel) => set({ contactLabel })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Contact email",
							type: "email",
							value: g.contactEmail,
							onChange: (contactEmail) => set({ contactEmail }),
							validate: (v) => /^\S+@\S+\.\S+$/.test(v) ? null : "Enter a valid email"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Copyright line",
							value: g.copyright,
							onChange: (copyright) => set({ copyright })
						})
					]
				})
			})]
		})
	] });
}
//#endregion
export { Navigation as component };
