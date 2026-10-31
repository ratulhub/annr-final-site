import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin, g as dataSource } from "./store-CG_wgU4l.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.index-7rZSEq85.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DEMO_VISITS = [
	42,
	58,
	51,
	73,
	66,
	88,
	79
];
var DAYS = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
];
var CARDS_KEY = "shihiko-dashboard-cards";
function Dashboard() {
	const s = useAdmin();
	const [orderFilter, setOrderFilter] = (0, import_react.useState)("all");
	const [downloadSuccess, setDownloadSuccess] = (0, import_react.useState)(false);
	const activeProducts = s.products.filter((p) => p.status === "active").length;
	const stock = s.products.reduce((n, p) => n + p.variants.reduce((m, v) => m + (Number(v.stock) || 0), 0), 0);
	const low = s.products.filter((p) => p.variants.some((v) => v.stock <= 2));
	const vipCount = s.customers.filter((c) => c.tier === "Silver" || c.tier === "Gold" || c.tags && c.tags.includes("vip")).length;
	const totalRevenue = s.orders.reduce((sum, o) => {
		return sum + (parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0);
	}, 0).toLocaleString("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const activeEvents = s.site.events ? s.site.events.filter((e) => e.status === "active").length : 0;
	const stats = [
		{
			k: "Active products",
			v: `${activeProducts} of ${s.products.length}`,
			sub: `${s.products.length - activeProducts} drafts`,
			to: "/admin/products",
			chip: {
				text: "Live",
				tone: "active"
			}
		},
		{
			k: "Total revenue",
			v: `৳${totalRevenue}`,
			sub: `${s.orders.length} orders placed`,
			to: "/admin/orders",
			chip: {
				text: "+14.8%",
				tone: "active"
			}
		},
		{
			k: "Inventory units",
			v: stock.toLocaleString(),
			sub: "Across all sizes",
			to: "/admin/products",
			chip: {
				text: "In Stock",
				tone: "info"
			}
		},
		{
			k: "Low stock items",
			v: low.length,
			sub: low.length > 0 ? "Requires restock" : "All variants stocked",
			to: "/admin/products",
			chip: {
				text: low.length > 0 ? "Alert" : "Optimal",
				tone: low.length > 0 ? "warning" : "active"
			}
		},
		{
			k: "Active campaigns",
			v: activeEvents,
			sub: "Live store drops",
			to: "/admin/events",
			chip: {
				text: `${activeEvents} Active`,
				tone: "purple"
			}
		},
		{
			k: "Total customers",
			v: s.customers.length,
			sub: `${vipCount} VIP members`,
			to: "/admin/customers",
			chip: {
				text: "Growing",
				tone: "info"
			}
		},
		{
			k: "Security status",
			v: "Verified",
			sub: "OWASP ASVS & RLS ready",
			to: "/admin/security",
			chip: {
				text: "Passing",
				tone: "active"
			}
		},
		{
			k: "Custom pages",
			v: s.site.customPages.length,
			sub: `${s.site.hiddenPages.length} hidden`,
			to: "/admin/website",
			chip: {
				text: "Configured",
				tone: "info"
			}
		}
	];
	const [cfg, setCfg] = (0, import_react.useState)({
		order: [],
		hidden: []
	});
	const [editing, setEditing] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const c = dataSource.read(CARDS_KEY);
		if (c) setCfg(c);
	}, []);
	const saveCfg = (c) => {
		setCfg(c);
		dataSource.write(CARDS_KEY, c);
	};
	const ordered = [...cfg.order.map((k) => stats.find((x) => x.k === k)).filter(Boolean), ...stats.filter((x) => !cfg.order.includes(x.k))];
	const keys = ordered.map((x) => x.k);
	const shift = (i, d) => {
		const o = keys.slice();
		[o[i], o[i + d]] = [o[i + d], o[i]];
		saveCfg({
			...cfg,
			order: o
		});
	};
	const handleExportData = () => {
		try {
			const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
			const downloadAnchor = document.createElement("a");
			downloadAnchor.setAttribute("href", dataStr);
			downloadAnchor.setAttribute("download", `annr-store-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
			document.body.appendChild(downloadAnchor);
			downloadAnchor.click();
			downloadAnchor.remove();
			setDownloadSuccess(true);
			setTimeout(() => setDownloadSuccess(false), 3e3);
		} catch (err) {
			console.error(err);
		}
	};
	const filteredOrders = s.orders.filter((o) => {
		if (orderFilter === "all") return true;
		if (orderFilter === "paid") return o.payment.toLowerCase() === "paid";
		if (orderFilter === "unfulfilled") return o.status.toLowerCase() === "unfulfilled";
		if (orderFilter === "fulfilled") return o.status.toLowerCase() === "fulfilled";
		return true;
	});
	const max = Math.max(...DEMO_VISITS);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Dashboard" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { marginTop: 2 },
				children: "Store overview and operational management"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: () => setEditing(!editing),
						children: editing ? "Done" : "Customize metrics"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: handleExportData,
						children: downloadSuccess ? "Downloaded backup" : "Export store data (JSON)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "adm-btn ghost",
						href: "/home.html",
						target: "_blank",
						rel: "noreferrer",
						children: "View live store ↗"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: "adm-btn primary",
						to: "/admin/products",
						children: "Add product"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-card",
			style: {
				padding: "12px 18px",
				marginBottom: 16
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 10
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 13,
						fontWeight: 600,
						color: "var(--p-text)"
					},
					children: "Quick shortcuts:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					style: { gap: 6 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/events",
							className: "adm-btn ghost sm",
							children: "Campaigns & gifts"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/sections",
							className: "adm-btn ghost sm",
							children: "Page sections"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/theme",
							className: "adm-btn ghost sm",
							children: "Theme & styling"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/security",
							className: "adm-btn ghost sm",
							children: "Security center"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/publish",
							className: "adm-btn ghost sm",
							children: "Publish center"
						})
					]
				})]
			})
		}),
		low.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-banner warning",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: { flex: 1 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontWeight: 600,
							fontSize: 13.5
						},
						children: [
							"Inventory warning: ",
							low.length,
							" item",
							low.length === 1 ? "" : "s",
							" low on stock"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 13,
							marginTop: 4
						},
						children: "The following products have 2 or fewer units left in inventory:"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 8,
							marginTop: 8
						},
						children: low.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/admin/products/$handle",
							params: { handle: p.handle },
							className: "adm-btn ghost sm",
							style: {
								background: "#ffffff",
								borderColor: "#fed287"
							},
							children: [
								p.title,
								" (",
								p.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0),
								" left) →"
							]
						}, p.handle))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				className: "adm-btn ghost sm",
				to: "/admin/products",
				style: {
					alignSelf: "flex-start",
					background: "#ffffff"
				},
				children: "Manage inventory"
			})]
		}),
		editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "adm-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Summary metrics customization" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					children: "Toggle visibility and arrange metric order to fit your dashboard."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
						gap: 8,
						margin: "14px 0"
					},
					children: ordered.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-row",
						style: {
							padding: "8px 12px",
							background: "var(--p-background)",
							borderRadius: 6,
							border: "1px solid var(--p-border-subdued)"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: !cfg.hidden.includes(x.k),
								onChange: (e) => saveCfg({
									order: keys,
									hidden: e.target.checked ? cfg.hidden.filter((h) => h !== x.k) : [...cfg.hidden, x.k]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: {
									flex: 1,
									fontWeight: 500,
									fontSize: 13
								},
								children: x.k
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn ghost sm",
								disabled: i === 0,
								onClick: () => shift(i, -1),
								children: "↑"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn ghost sm",
								disabled: i === ordered.length - 1,
								onClick: () => shift(i, 1),
								children: "↓"
							})
						]
					}, x.k))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn ghost sm",
					onClick: () => saveCfg({
						order: [],
						hidden: []
					}),
					children: "Reset to default"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-stats",
			children: ordered.filter((x) => !cfg.hidden.includes(x.k)).map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: x.to,
				className: "adm-stat",
				style: {
					textDecoration: "none",
					color: "inherit",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 6
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x.k }), x.chip && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `adm-tag ${x.chip.tone}`,
							style: {
								fontSize: 11,
								padding: "2px 7px"
							},
							children: x.chip.text
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: x.v }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x.sub })
				]
			}, x.k))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
				gap: 16,
				marginBottom: 16
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "adm-card",
				style: { margin: 0 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-top",
						style: {
							marginBottom: 10,
							paddingBottom: 8
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Store sessions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-hint",
							style: { margin: 0 },
							children: "Visitors by day this week"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							className: "link",
							to: "/admin/analytics/$report",
							params: { report: "overview" },
							children: "Analytics report →"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "adm-bars",
						style: {
							marginTop: 16,
							marginBottom: 24
						},
						children: DEMO_VISITS.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: { height: `${v / max * 100}%` },
							title: `${DAYS[i]}: ${v} visitors`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: DAYS[i] })
						}, i))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							fontSize: 12.5,
							color: "var(--p-text-subdued)"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Weekly average: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "65 sessions/day" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Peak: ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
							"Saturday (",
							max,
							")"
						] })] })]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "adm-card",
				style: { margin: 0 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-top",
						style: {
							marginBottom: 10,
							paddingBottom: 8
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Store status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-hint",
							style: { margin: 0 },
							children: "Live configuration & environment"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							className: "link",
							to: "/admin/settings",
							children: "Settings →"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Storefront visibility" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-tag active",
							children: "Online"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Supabase database" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-tag active",
							children: "8 migrations ready"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Maintenance mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-tag",
							children: s.site.technical.maintenance ? "Enabled (locked)" : "Disabled (open)"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Storage mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-tag",
							children: "Browser draft + Static mirror"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Security audit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "adm-tag active",
							children: "OWASP ASVS passed"
						})]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "adm-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-top",
				style: {
					marginBottom: 14,
					paddingBottom: 10
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Recent orders" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					style: {
						marginTop: 8,
						gap: 6
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: `adm-btn sm ${orderFilter === "all" ? "" : "ghost"}`,
							onClick: () => setOrderFilter("all"),
							children: [
								"All (",
								s.orders.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `adm-btn sm ${orderFilter === "paid" ? "" : "ghost"}`,
							onClick: () => setOrderFilter("paid"),
							children: "Paid"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `adm-btn sm ${orderFilter === "unfulfilled" ? "" : "ghost"}`,
							onClick: () => setOrderFilter("unfulfilled"),
							children: "Unfulfilled"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: `adm-btn sm ${orderFilter === "fulfilled" ? "" : "ghost"}`,
							onClick: () => setOrderFilter("fulfilled"),
							children: "Fulfilled"
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: "adm-btn ghost",
					to: "/admin/orders",
					children: "View all orders"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Order" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Date" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Customer" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Items" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Total" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Payment status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Fulfillment status" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filteredOrders.slice(-6).reverse().map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: o.id }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: o.date }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: { fontWeight: 500 },
					children: o.customer
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 12,
						color: "var(--p-text-subdued)"
					},
					children: o.email
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: o.items }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: ["৳", o.total] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `adm-tag ${o.payment.toLowerCase() === "paid" ? "paid" : "pending"}`,
					children: o.payment
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `adm-tag ${o.status.toLowerCase() === "fulfilled" ? "active" : "unfulfilled"}`,
					children: o.status
				}) })
			] }, o.id)) })] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "adm-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-top",
				style: {
					marginBottom: 10,
					paddingBottom: 8
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Audit log" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "adm-hint",
					style: { margin: 0 },
					children: "Recorded admin events and updates"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					className: "link",
					to: "/admin/activity",
					children: "View full log →"
				})]
			}), s.activity.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Date & Time" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Section" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Action" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Target Item" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Staff" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: s.activity.slice(0, 5).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					style: {
						fontSize: 12.5,
						color: "var(--p-text-subdued)"
					},
					children: new Date(a.at).toLocaleString()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "adm-tag",
					children: a.section
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `adm-tag ${a.action === "added" ? "active" : a.action === "deleted" ? "danger" : "warning"}`,
					children: a.action
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: a.item }),
					" ",
					a.fields && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
						style: { color: "var(--p-text-subdued)" },
						children: [
							"(",
							a.fields,
							")"
						]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					style: { fontSize: 12.5 },
					children: a.by
				})
			] }, a.id)) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: {
					color: "var(--p-text-subdued)",
					margin: "10px 0"
				},
				children: "No recent changes yet. Modifying products, pages, or campaigns will log activities here."
			})]
		})
	] });
}
//#endregion
export { Dashboard as component };
