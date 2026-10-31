import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as setSite, F as uid, L as useAdmin, j as setState } from "./store-CNEGzpjs.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { d as move, s as OrderBtns } from "./fields-CAbwAx7K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.website-D7DoI-qQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function WebsitePagesManager() {
	const s = useAdmin();
	const cps = s.site.customPages || [];
	const hidden = s.site.hiddenPages || [];
	const [tab, setTab] = (0, import_react.useState)("all");
	const [search, setSearch] = (0, import_react.useState)("");
	const setCps = (l) => setSite("customPages", l);
	const setHiddenBatch = (paths, hide) => {
		let next = [...hidden];
		paths.forEach((p) => {
			[
				p,
				p.replace(/\/index\.html$/, ""),
				p.replace(/\/index\.html$/, "") + "/index.html",
				p.replace(/\/index\.html$/, "") + "/"
			].forEach((v) => {
				if (hide) {
					if (!next.includes(v)) next.push(v);
				} else next = next.filter((x) => x !== v);
			});
		});
		setSite("hiddenPages", next);
	};
	const toggleHidden = (path) => {
		const isHidden = hidden.includes(path) || hidden.includes(path.replace(/\/index\.html$/, ""));
		setHiddenBatch([path], !isHidden);
	};
	const slugOk = (slug, id) => /^[a-z0-9-]+$/.test(slug) && !cps.some((c) => c.slug === slug && c.id !== id);
	const addPage = () => {
		const n = cps.length + 1;
		const newPage = {
			id: uid(),
			slug: `page-${uid()}`,
			title: `Custom Page ${n}`,
			status: "draft",
			showInNav: false,
			seoTitle: "",
			seoDescription: "",
			blocks: [{
				id: uid(),
				type: "heading",
				text: `Custom Page ${n}`,
				level: "h1",
				align: "left"
			}]
		};
		setCps([...cps, newPage]);
	};
	const pagesList = [
		{
			category: "store",
			title: "Home Page",
			url: "/home.html",
			key: "home",
			visible: !s.site.technical.maintenance,
			canToggle: false,
			editLink: "/admin/sections"
		},
		...s.pages.map((p) => {
			const isHidden = p.visible === false || hidden.includes(`/pages/${p.handle}`) || hidden.includes(`/pages/${p.handle}/index.html`);
			return {
				category: "pages",
				title: p.title,
				url: `/pages/${p.handle}/index.html`,
				key: p.handle,
				visible: !isHidden,
				canToggle: true,
				editLink: "/admin/pages"
			};
		}),
		...s.collections.map((c) => {
			const isHidden = c.visible === false || hidden.includes(`/collections/${c.handle}`) || hidden.includes(`/collections/${c.handle}/index.html`);
			return {
				category: "collections",
				title: `Collection: ${c.title}`,
				url: `/collections/${c.handle}/index.html`,
				key: `col-${c.handle}`,
				visible: !isHidden,
				canToggle: true,
				editLink: "/admin/collections"
			};
		}),
		{
			category: "store",
			title: "VIP Account Login",
			url: "/account/login/index.html",
			key: "account-login",
			visible: !hidden.includes("/account/login/index.html"),
			canToggle: true,
			editLink: "/admin/forms"
		},
		{
			category: "store",
			title: "VIP Account Register",
			url: "/account/register/index.html",
			key: "account-register",
			visible: !hidden.includes("/account/register/index.html"),
			canToggle: true,
			editLink: "/admin/forms"
		},
		{
			category: "store",
			title: "Search Results Page",
			url: "/search/index.html",
			key: "search",
			visible: !hidden.includes("/search/index.html"),
			canToggle: true,
			editLink: "/admin/sections"
		},
		...cps.map((cp) => ({
			category: "custom",
			title: cp.title,
			url: `/p/${cp.slug}`,
			key: `cp-${cp.id}`,
			visible: cp.status === "published",
			canToggle: true,
			editLink: `/admin/website/${cp.id}`,
			isCustom: true,
			customPage: cp
		}))
	];
	const handleToggle = (item) => {
		if (!item.canToggle) return;
		if (item.isCustom && item.customPage) {
			const nextStatus = item.customPage.status === "published" ? "draft" : "published";
			setCps(cps.map((x) => x.id === item.customPage.id ? {
				...x,
				status: nextStatus
			} : x));
			return;
		}
		if (s.pages.find((p) => p.handle === item.key)) {
			const nextVisible = !item.visible;
			setState((prev) => ({
				...prev,
				pages: prev.pages.map((p) => p.handle === item.key ? {
					...p,
					visible: nextVisible
				} : p)
			}));
			setHiddenBatch([`/pages/${item.key}`, `/pages/${item.key}/index.html`], !nextVisible);
			return;
		}
		if (item.key.startsWith("col-")) {
			const colHandle = item.key.replace("col-", "");
			const nextVisible = !item.visible;
			setState((prev) => ({
				...prev,
				collections: prev.collections.map((c) => c.handle === colHandle ? {
					...c,
					visible: nextVisible
				} : c)
			}));
			setHiddenBatch([`/collections/${colHandle}`, `/collections/${colHandle}/index.html`], !nextVisible);
			return;
		}
		toggleHidden(item.url);
	};
	const filteredPages = pagesList.filter((p) => {
		if (tab !== "all" && p.category !== tab) return false;
		if (search.trim()) {
			const q = search.toLowerCase();
			return p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
		}
		return true;
	});
	const visibleTotal = pagesList.filter((p) => p.visible).length;
	const hiddenTotal = pagesList.length - visibleTotal;
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Website Pages & Visibility" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { marginTop: 4 },
					children: "Control visibility for every page on the website. Show or hide individual collections, store pages, or create and publish custom block pages."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				style: { gap: 8 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn",
					onClick: addPage,
					children: "+ New Custom Page"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: 16,
				flexWrap: "wrap",
				gap: 12
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: 6,
					flexWrap: "wrap"
				},
				children: [
					{
						id: "all",
						label: `All (${pagesList.length})`
					},
					{
						id: "store",
						label: "Store Pages"
					},
					{
						id: "collections",
						label: `Collections (${s.collections.length})`
					},
					{
						id: "pages",
						label: `Info Pages (${s.pages.length})`
					},
					{
						id: "custom",
						label: `Custom Pages (${cps.length})`
					}
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setTab(t.id),
					className: `adm-btn sm ${tab === t.id ? "" : "ghost"}`,
					style: { fontWeight: tab === t.id ? 700 : 400 },
					children: t.label
				}, t.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					style: {
						fontSize: 11,
						fontFamily: "'FK Grotesk SemiMono', monospace",
						color: "#666"
					},
					children: [
						visibleTotal,
						" visible · ",
						hiddenTotal,
						" hidden"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "search",
					placeholder: "Search pages by title or URL...",
					value: search,
					onChange: (e) => setSearch(e.target.value),
					style: {
						width: 240,
						padding: "6px 10px",
						fontSize: 12
					}
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: `Page Directory (${filteredPages.length})`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { width: "30%" },
					children: "Page Title"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Address / Route" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { width: 110 },
					children: "Visibility"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { width: 90 },
					children: "Action"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { width: 140 },
					children: "Manage"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [filteredPages.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				style: { opacity: item.visible ? 1 : .6 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: item.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 10,
							opacity: .5,
							fontFamily: "'FK Grotesk SemiMono', monospace",
							textTransform: "uppercase"
						},
						children: item.category
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "link",
						href: item.url,
						target: "_blank",
						rel: "noreferrer",
						style: { fontSize: 12 },
						children: item.url
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `adm-tag ${item.visible ? "active" : "draft"}`,
						style: {
							fontSize: 10,
							padding: "2px 8px"
						},
						children: item.visible ? "VISIBLE" : "HIDDEN"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: item.canToggle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: `adm-btn sm ${item.visible ? "ghost" : ""}`,
						onClick: () => handleToggle(item),
						style: {
							minWidth: 64,
							fontSize: 11
						},
						children: item.visible ? "Hide" : "Show"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 11,
							opacity: .5
						},
						children: "Always"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-row",
						style: { gap: 6 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							className: "adm-btn ghost sm",
							to: item.editLink,
							children: "Edit"
						}), item.isCustom && item.customPage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost sm",
							style: { color: "#c00" },
							onClick: () => confirm(`Delete custom page "${item.title}"?`) && setCps(cps.filter((x) => x.id !== item.customPage.id)),
							children: "Delete"
						})]
					}) })
				]
			}, item.url)), !filteredPages.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				colSpan: 5,
				style: {
					textAlign: "center",
					padding: "32px 12px",
					color: "#888"
				},
				children: "No pages match your search criteria."
			}) })] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { marginTop: 12 },
				children: "Pages toggled to \"Hidden\" immediately become inaccessible on the storefront and display AnnR's custom unavailable screen."
			})]
		}),
		cps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: `Custom Block-Based Pages (${cps.length})`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { width: 40 } }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Title" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "URL Slug" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Show in Menu" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { width: 180 },
					children: "Actions"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: cps.map((c, i) => {
				const up = (p) => setCps(cps.map((x) => x.id === c.id ? {
					...x,
					...p
				} : x));
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
						i,
						n: cps.length,
						onMove: (to) => setCps(move(cps, i, to))
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: c.title,
						onChange: (e) => up({ title: e.target.value }),
						style: { fontWeight: 600 }
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: c.slug,
							"aria-invalid": !slugOk(c.slug, c.id),
							onChange: (e) => up({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
						}),
						!slugOk(c.slug, c.id) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
							className: "adm-err",
							children: "Already used"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
							className: "adm-hint",
							children: ["/p/", c.slug]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: c.status,
						onChange: (e) => up({ status: e.target.value }),
						style: { fontSize: 11 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "draft",
							children: "draft"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "published",
							children: "published"
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: c.showInNav,
						onChange: (e) => up({ showInNav: e.target.checked })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-row",
						style: { gap: 4 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								className: "adm-btn sm",
								to: "/admin/website/$id",
								params: { id: c.id },
								children: "Builder"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn ghost sm",
								onClick: () => setCps([
									...cps.slice(0, i + 1),
									{
										...structuredClone(c),
										id: uid(),
										slug: `${c.slug}-copy`,
										title: `${c.title} (Copy)`,
										status: "draft"
									},
									...cps.slice(i + 1)
								]),
								children: "Copy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn danger sm",
								onClick: () => confirm(`Delete "${c.title}"?`) && setCps(cps.filter((x) => x.id !== c.id)),
								children: "Delete"
							})
						]
					}) })
				] }, c.id);
			}) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { marginTop: 12 },
				children: "Custom pages support full modular block layouts (headings, rich text, images, FAQ accordions, buttons, product showcases, and galleries)."
			})]
		})
	] });
}
//#endregion
export { WebsitePagesManager as component };
