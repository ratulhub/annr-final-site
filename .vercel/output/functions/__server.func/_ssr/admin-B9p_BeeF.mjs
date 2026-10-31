import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link, g as Outlet, p as useLocation, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as login, L as useAdmin, P as touch, S as logAuthEvent, T as publish, b as getSession, w as logout, x as isLoggedIn } from "./store-CG_wgU4l.mjs";
import { n as useDirty } from "./admin.publish-bRC88UrB.mjs";
import { i as can, o as permissionForPath } from "./permissions-B5x35gQ-.mjs";
import { n as NAV_GROUPS } from "./navigation-BwBMnIrm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-B9p_BeeF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GroupIcon({ iconKey }) {
	switch (iconKey) {
		case "overview": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "3",
					y: "3",
					width: "6",
					height: "6",
					rx: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "11",
					y: "3",
					width: "6",
					height: "6",
					rx: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "3",
					y: "11",
					width: "6",
					height: "6",
					rx: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "11",
					y: "11",
					width: "6",
					height: "6",
					rx: "1.5"
				})
			]
		});
		case "orders": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 2 3 6v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6l-3-4z" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "3",
					y1: "6",
					x2: "17",
					y2: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 10a4 4 0 0 1-8 0" })
			]
		});
		case "products": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.5 11.5 10 20l-8-8 8.5-8.5H19v8.5z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "15.5",
				cy: "6.5",
				r: "1.5"
			})]
		});
		case "marketing": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", { points: "10 2 12.5 7.5 18 8.3 14 12.2 15 18 10 15.2 5 18 6 12.2 2 8.3 7.5 7.5 10 2" })
		});
		case "store": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "2",
					y: "3",
					width: "16",
					height: "11",
					rx: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "6",
					y1: "18",
					x2: "14",
					y2: "18"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "10",
					y1: "14",
					x2: "10",
					y2: "18"
				})
			]
		});
		case "content": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "3",
					y: "3",
					width: "14",
					height: "14",
					rx: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "7.5",
					cy: "7.5",
					r: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m17 13-4-4-7 7" })
			]
		});
		case "analytics": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "16",
					y1: "18",
					x2: "16",
					y2: "8"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "10",
					y1: "18",
					x2: "10",
					y2: "4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "4",
					y1: "18",
					x2: "4",
					y2: "12"
				})
			]
		});
		case "settings": return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				opacity: .85,
				flexShrink: 0
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "10",
				cy: "10",
				r: "3"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16.5 13a1 1 0 0 0 .2 1.1l1 1a1.5 1.5 0 0 1-2.1 2.1l-1-1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v1.5a1.5 1.5 0 0 1-3 0v-1.5a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-1 1a1.5 1.5 0 0 1-2.1-2.1l1-1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3.5a1.5 1.5 0 0 1 0-3H5a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-1-1a1.5 1.5 0 0 1 2.1-2.1l1 1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3.5a1.5 1.5 0 0 1 3 0V5a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l1-1a1.5 1.5 0 0 1 2.1 2.1l-1 1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h1.5a1.5 1.5 0 0 1 0 3H16.5a1 1 0 0 0-.9.6z" })]
		});
	}
}
function GlobalSearch() {
	const s = useAdmin();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [term, setTerm] = (0, import_react.useState)("");
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen(true);
				setTimeout(() => inputRef.current?.focus(), 50);
			}
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	const q = term.trim().toLowerCase();
	const matchedProducts = q ? s.products.filter((p) => p.title.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q)).slice(0, 4) : [];
	const matchedOrders = q ? s.orders.filter((o) => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)).slice(0, 3) : [];
	const matchedCustomers = q ? s.customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 3) : [];
	const matchedPages = q ? [
		{
			label: "Dashboard",
			to: "/admin"
		},
		{
			label: "Products",
			to: "/admin/products"
		},
		{
			label: "Orders",
			to: "/admin/orders"
		},
		{
			label: "Customers",
			to: "/admin/customers"
		},
		{
			label: "Collections",
			to: "/admin/collections"
		},
		{
			label: "Discounts & Coupons",
			to: "/admin/discounts"
		},
		{
			label: "Campaigns & Events",
			to: "/admin/events"
		},
		{
			label: "Theme & Design",
			to: "/admin/theme"
		},
		{
			label: "Page Sections",
			to: "/admin/sections"
		},
		{
			label: "Website Pages",
			to: "/admin/website"
		},
		{
			label: "Media Library",
			to: "/admin/media"
		},
		{
			label: "Forms & Inquiries",
			to: "/admin/forms"
		},
		{
			label: "SEO & Discoverability",
			to: "/admin/seo"
		},
		{
			label: "Store Settings",
			to: "/admin/settings"
		},
		{
			label: "Security Center",
			to: "/admin/security"
		}
	].filter((p) => p.label.toLowerCase().includes(q)).slice(0, 5) : [];
	const hasResults = matchedProducts.length > 0 || matchedOrders.length > 0 || matchedCustomers.length > 0 || matchedPages.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			position: "relative",
			flex: "1 1 280px",
			maxWidth: 440,
			minWidth: 180
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				background: "#f1f2f4",
				border: "1px solid #d2d5d8",
				borderRadius: 8,
				padding: "5px 12px",
				cursor: "text"
			},
			onClick: () => {
				setOpen(true);
				setTimeout(() => inputRef.current?.focus(), 50);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: "14",
					height: "14",
					viewBox: "0 0 20 20",
					fill: "none",
					stroke: "#6d7175",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "9",
						r: "6"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: "15",
						y1: "15",
						x2: "19",
						y2: "19"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: inputRef,
					type: "text",
					name: "annr_search_control_palette",
					id: "annr_search_control_palette",
					autoComplete: "off",
					autoCorrect: "off",
					autoCapitalize: "none",
					spellCheck: false,
					"data-lpignore": "true",
					"data-1p-ignore": "true",
					placeholder: "Search products, orders, pages… (Ctrl+K)",
					value: term,
					onChange: (e) => {
						setTerm(e.target.value);
						setOpen(true);
					},
					onFocus: () => setOpen(true),
					style: {
						border: "none",
						background: "transparent",
						outline: "none",
						fontSize: 13,
						color: "var(--p-text)",
						width: "100%",
						padding: 0,
						margin: 0
					}
				}),
				term ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: (e) => {
						e.stopPropagation();
						setTerm("");
					},
					style: {
						background: "none",
						border: "none",
						cursor: "pointer",
						color: "#6d7175",
						fontSize: 12,
						padding: "0 2px"
					},
					title: "Clear search",
					children: "✕"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
					style: {
						fontSize: 11,
						background: "#ffffff",
						border: "1px solid #d2d5d8",
						borderRadius: 4,
						padding: "1px 5px",
						color: "#6d7175",
						fontFamily: "inherit"
					},
					children: "⌘K"
				})
			]
		}), open && q && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				position: "fixed",
				inset: 0,
				zIndex: 50
			},
			onClick: () => setOpen(false)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				position: "absolute",
				top: "calc(100% + 6px)",
				left: 0,
				right: 0,
				zIndex: 51,
				padding: 8,
				maxHeight: 380,
				overflowY: "auto",
				boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
				margin: 0
			},
			children: !hasResults ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					padding: "16px",
					textAlign: "center",
					color: "var(--p-text-subdued)",
					fontSize: 13
				},
				children: [
					"No results found for “",
					term,
					"”"
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				matchedPages.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { marginBottom: 8 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 700,
							color: "var(--p-text-subdued)",
							padding: "4px 8px",
							textTransform: "uppercase"
						},
						children: "Pages & Tools"
					}), matchedPages.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: p.to,
						onClick: () => {
							setOpen(false);
							setTerm("");
						},
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "6px 8px",
							borderRadius: 6,
							textDecoration: "none",
							color: "var(--p-text)",
							fontSize: 13
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { color: "var(--p-interactive)" },
							children: "→"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: p.label })]
					}, p.to))]
				}),
				matchedProducts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { marginBottom: 8 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 700,
							color: "var(--p-text-subdued)",
							padding: "4px 8px",
							textTransform: "uppercase"
						},
						children: "Products"
					}), matchedProducts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/admin/products/$handle",
						params: { handle: p.handle },
						onClick: () => {
							setOpen(false);
							setTerm("");
						},
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "6px 8px",
							borderRadius: 6,
							textDecoration: "none",
							color: "var(--p-text)",
							fontSize: 13
						},
						children: [
							p.images?.[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: p.images[0],
								alt: "",
								style: {
									width: 24,
									height: 24,
									borderRadius: 4,
									objectFit: "cover"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { flex: 1 },
								children: p.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `adm-tag ${p.status === "active" ? "active" : "draft"}`,
								style: { fontSize: 10 },
								children: p.status
							})
						]
					}, p.handle))]
				}),
				matchedOrders.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 11,
						fontWeight: 700,
						color: "var(--p-text-subdued)",
						padding: "4px 8px",
						textTransform: "uppercase"
					},
					children: "Orders"
				}), matchedOrders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/admin/orders",
					onClick: () => {
						setOpen(false);
						setTerm("");
					},
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8,
						padding: "6px 8px",
						borderRadius: 6,
						textDecoration: "none",
						color: "var(--p-text)",
						fontSize: 13
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: o.id }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { flex: 1 },
							children: o.customer
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: o.total })
					]
				}, o.id))] })
			] })
		})] })]
	});
}
function AdminLayout() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [authed, setAuthed] = (0, import_react.useState)(false);
	const [collapsed, setCollapsed] = (0, import_react.useState)(false);
	const [mobile, setMobile] = (0, import_react.useState)(false);
	const path = useLocation({ select: (l) => l.pathname });
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		setAuthed(isLoggedIn());
		setCollapsed(localStorage.getItem("shihiko-admin-collapsed") === "1");
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		setMobile(false);
	}, [path]);
	(0, import_react.useEffect)(() => {
		if (!authed) return;
		const tick = () => {
			if (!isLoggedIn()) setAuthed(false);
		};
		const act = () => touch();
		const id = setInterval(tick, 3e4);
		window.addEventListener("pointerdown", act);
		window.addEventListener("keydown", act);
		return () => {
			clearInterval(id);
			window.removeEventListener("pointerdown", act);
			window.removeEventListener("keydown", act);
		};
	}, [authed]);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "adm" });
	if (!authed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Login, { onDone: () => setAuthed(true) });
	const toggle = () => {
		localStorage.setItem("shihiko-admin-collapsed", collapsed ? "0" : "1");
		setCollapsed(!collapsed);
	};
	const crumbs = findCrumbs(path);
	const handleBack = () => {
		if (window.history.length > 1) window.history.back();
		else navigate({ to: "/admin" });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `adm${collapsed ? " collapsed" : ""}${mobile ? " mobile-open" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "adm-side",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-logo",
						children: ["AnnR", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Admin Panel" })]
					}),
					path !== "/admin" && path !== "/admin/" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { margin: "0 10px 12px" },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "adm-btn ghost sm",
							style: {
								width: "100%",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 6,
								padding: "6px 10px",
								fontSize: 12,
								fontWeight: 600,
								cursor: "pointer",
								background: "#262626",
								border: "1px solid #3d3d3d",
								color: "#ffffff",
								borderRadius: 6
							},
							onClick: handleBack,
							title: "Go back to previous page",
							children: "← Back"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "adm-nav",
						children: [NAV_GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "adm-group-title",
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupIcon, { iconKey: g.iconKey }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: g.group })]
							}), g.items.map((i) => {
								const badgeElement = i.badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "adm-tag",
									style: {
										fontSize: 10,
										padding: "1px 6px"
									},
									children: i.badge
								}) : null;
								if (i.report) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/admin/analytics/$report",
									params: { report: i.report },
									activeProps: { className: "active" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: i.label }), badgeElement]
								}, i.label);
								if (i.module) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/admin/m/$module",
									params: { module: i.module },
									activeProps: { className: "active" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [i.label, i.soon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: i.soon })] }), badgeElement]
								}, i.label);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: i.to,
									activeOptions: { exact: i.to === "/admin" },
									activeProps: { className: "active" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: i.label }), badgeElement]
								}, i.to);
							})]
						}, g.group)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-group",
							style: {
								borderTop: "1px solid #2d2d2d",
								paddingTop: 12,
								marginTop: 12
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "/home.html",
									target: "_blank",
									rel: "noreferrer",
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8,
										color: "#4ade80",
										fontWeight: 600
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
										display: "inline-block",
										width: 7,
										height: 7,
										borderRadius: "50%",
										background: "#4ade80"
									} }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Online Store ↗" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#",
									onClick: (e) => {
										e.preventDefault();
										logout();
										setAuthed(false);
									},
									children: "Log out"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										padding: "8px 12px 0",
										fontSize: 11,
										color: "#8c9196"
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "https://ratul.site",
										target: "_blank",
										rel: "noopener noreferrer",
										style: {
											padding: 0,
											margin: 0,
											fontSize: 11,
											color: "#9ca3af"
										},
										children: "created by Ratul ↗"
									})
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-body",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "adm-header",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-icon desk",
							onClick: toggle,
							"aria-label": "Collapse sidebar",
							children: "☰"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-icon mob",
							onClick: () => setMobile(!mobile),
							"aria-label": "Open menu",
							children: "☰"
						}),
						path !== "/admin" && path !== "/admin/" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "adm-btn ghost sm",
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: 5,
								padding: "6px 12px",
								fontSize: 12.5,
								fontWeight: 600,
								cursor: "pointer",
								flexShrink: 0
							},
							onClick: handleBack,
							title: "Go back to previous page",
							children: "← Back"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-crumbs",
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6,
								flexWrap: "wrap"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/admin",
								style: {
									fontWeight: 600,
									color: "var(--p-text)"
								},
								children: "Admin"
							}), crumbs.map((c, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { opacity: .4 },
									children: "/"
								}), c.to ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: c.to,
									style: { textDecoration: "none" },
									children: c.label
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontWeight: 600,
										color: "var(--p-text)"
									},
									children: c.label
								})]
							}, idx))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlobalSearch, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-header-right",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "/home.html",
									target: "_blank",
									rel: "noreferrer",
									className: "adm-tag active",
									style: {
										textDecoration: "none",
										cursor: "pointer",
										fontWeight: 600,
										gap: 6
									},
									title: "View the live AnnR store in a new tab",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
										display: "inline-block",
										width: 6,
										height: 6,
										borderRadius: "50%",
										background: "#008060"
									} }), "Online Store ↗"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PublishButton, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notifications, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountMenu, { onLogout: () => {
									logout();
									setAuthed(false);
								} })
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "adm-main",
					children: (() => {
						const need = permissionForPath(path);
						return need && !can(getSession()?.role, need) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Denied, { perm: need }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
					})()
				})]
			}),
			mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-scrim",
				onClick: () => setMobile(false)
			})
		]
	});
}
function findCrumbs(path) {
	if (path === "/admin" || path === "/admin/") return [];
	if (path.startsWith("/admin/products/")) return [
		{
			label: "Store",
			to: "/admin/products"
		},
		{
			label: "Products",
			to: "/admin/products"
		},
		{ label: "Edit Product" }
	];
	if (path.startsWith("/admin/website/")) return [
		{
			label: "Website & Pages",
			to: "/admin/website"
		},
		{
			label: "Website Pages",
			to: "/admin/website"
		},
		{ label: "Block Editor" }
	];
	if (path.startsWith("/admin/analytics/")) {
		const reportId = path.split("/").pop();
		return [{
			label: "Analytics",
			to: "/admin/analytics/overview"
		}, { label: reportId ? reportId.toUpperCase() : "Report" }];
	}
	for (const g of NAV_GROUPS) for (const i of g.items) {
		const to = i.report ? `/admin/analytics/${i.report}` : i.module ? `/admin/m/${i.module}` : i.to;
		if (to === path) return [{ label: g.group }, {
			label: i.label,
			to
		}];
	}
	for (const g of NAV_GROUPS) for (const i of g.items) {
		const to = i.report ? `/admin/analytics/${i.report}` : i.module ? `/admin/m/${i.module}` : i.to;
		if (to !== "/admin" && path.startsWith(to)) return [{ label: g.group }, {
			label: i.label,
			to
		}];
	}
	const slug = path.replace("/admin/", "").replace(/[-_]/g, " ");
	return [{ label: slug.charAt(0).toUpperCase() + slug.slice(1) }];
}
function Login({ onDone }) {
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "adm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-login",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: async (e) => {
					e.preventDefault();
					setBusy(true);
					const r = await login(email, password);
					setBusy(false);
					setPassword("");
					if (r.ok) onDone();
					else setErr(r.error);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-logo",
						style: {
							padding: 0,
							color: "#000"
						},
						children: ["AnnR", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Admin Login" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							autoComplete: "username",
							maxLength: 254,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							autoComplete: "current-password",
							maxLength: 200,
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true
						})]
					}),
					err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "adm-err",
						role: "alert",
						children: err
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn",
						type: "submit",
						disabled: busy,
						children: "Log in"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						style: {
							fontSize: 10,
							marginTop: 12,
							opacity: .6
						},
						children: ["Test login (demo, this browser only). Not for real customer data. · created by ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://ratul.site",
							target: "_blank",
							rel: "noopener noreferrer",
							style: {
								color: "inherit",
								fontWeight: 700,
								textDecoration: "underline"
							},
							children: "Ratul"
						})]
					})
				]
			})
		})
	});
}
function Denied({ perm }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "adm-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Permission denied" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Your role does not include “",
				perm,
				"”. Ask a super admin for access."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin",
				className: "link",
				children: "Back to dashboard"
			})
		]
	});
}
function PublishButton() {
	const dirty = useDirty();
	const mayPublish = can(getSession()?.role, "site.publish");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "adm-row",
		style: { gap: 6 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/admin/publish",
			className: "link",
			children: dirty ? "Unpublished changes" : "All published"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "adm-btn sm",
			disabled: !dirty || !mayPublish,
			onClick: () => {
				if (!mayPublish) return;
				publish();
				logAuthEvent("site_publish");
			},
			children: "Publish"
		})]
	});
}
function Dropdown({ label, aria, children, plain }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const path = useLocation({ select: (l) => l.pathname });
	(0, import_react.useEffect)(() => setOpen(false), [path]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		style: { position: "relative" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: plain ? "adm-btn ghost sm" : "adm-icon",
			"aria-label": aria,
			"aria-expanded": open,
			onClick: () => setOpen(!open),
			children: label
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				position: "fixed",
				inset: 0,
				zIndex: 40
			},
			onClick: () => setOpen(false)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				position: "absolute",
				right: 0,
				top: "110%",
				zIndex: 41,
				width: 280,
				margin: 0,
				padding: 12
			},
			children
		})] })]
	});
}
function Notifications() {
	const s = useAdmin();
	const dirty = useDirty();
	const low = s.products.filter((p) => p.variants.some((v) => v.stock <= 2)).length;
	const items = [];
	if (dirty) items.push({
		text: "You have unpublished changes",
		to: "/admin/publish"
	});
	if (s.site.technical.maintenance) items.push({
		text: "Maintenance mode is ON — the store is hidden",
		to: "/admin/settings"
	});
	if (low) items.push({
		text: `${low} product(s) low on stock`,
		to: "/admin/products"
	});
	items.push({
		text: "Analytics: not connected (demo data)",
		to: "/admin/analytics/settings"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dropdown, {
		aria: "Notifications",
		label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: items.length }),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				style: {
					display: "block",
					marginBottom: 8
				},
				children: "Notifications"
			}),
			items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: i.to,
				className: "link",
				style: {
					display: "block",
					padding: "6px 0"
				},
				children: i.text
			}, i.text)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/admin/activity",
				className: "link",
				style: {
					display: "block",
					paddingTop: 8
				},
				children: "Recent activity →"
			})
		]
	});
}
function AccountMenu({ onLogout }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dropdown, {
		plain: true,
		aria: "Account menu",
		label: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "Account ▾" }),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-hint",
				style: { marginBottom: 8 },
				children: [
					getSession()?.email,
					" · ",
					getSession()?.role,
					" (test login)"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin/users",
				className: "link",
				style: {
					display: "block",
					padding: "6px 0"
				},
				children: "Users & permissions"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin/settings",
				className: "link",
				style: {
					display: "block",
					padding: "6px 0"
				},
				children: "Settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/home.html",
				target: "_blank",
				rel: "noreferrer",
				className: "link",
				style: {
					display: "block",
					padding: "6px 0"
				},
				children: "View store ↗"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn ghost sm",
				style: { marginTop: 8 },
				onClick: onLogout,
				children: "Log out"
			})
		]
	});
}
//#endregion
export { AdminLayout as component };
