import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, F as uid } from "./store-CNEGzpjs.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { f as useSite, n as Chk, r as ColorF } from "./fields-CAbwAx7K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.events-D1Rgyu6Q.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EVENT_TYPES = {
	gift_with_purchase: "Gift with Purchase (GWP)",
	event: "Seasonal / Brand Event",
	flash_sale: "Flash Sale & Promotion",
	countdown: "Launch / Drop Countdown"
};
var blankEvent = () => ({
	id: `ev-${uid()}`,
	title: "New Gift Campaign",
	type: "gift_with_purchase",
	status: "active",
	tag: "FREE GIFT",
	badgeText: "GIFT WITH PURCHASE",
	startsAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
	endsAt: new Date(Date.now() + 2592e6).toISOString().slice(0, 10),
	continuous: true,
	minSpend: "5000",
	targetCollection: "all",
	discountCode: "FREEGIFT",
	giftItem: "AnnR Classics White Socks Bundle",
	giftValue: "৳1,200",
	giftImage: "/cdn/shop/files/UWUSOCKS1.jpg",
	giftDescription: "Complimentary AnnR gift bundle automatically qualified on eligible orders.",
	showTopBar: true,
	topBarText: "🎁 FREE ANNR GIFT BUNDLE ON ALL ORDERS OVER ৳5,000 · LIMITED TIME",
	topBarUrl: "/collections/all/index.html",
	showTicker: true,
	tickerText: "ANNR GIFT CAMPAIGN · FREE GIFT WITH ORDERS OVER ৳5,000 · SHOP NOW",
	showFloatingGiftPill: true,
	pillText: "🎁 FREE GIFT WITH ৳5,000+",
	showCartReward: true,
	cartRewardMessage: "Add ৳{remaining} more to claim your FREE AnnR Gift!",
	bg: "#050505",
	textColor: "#ffffff",
	accentColor: "#e10600"
});
function EventsManager() {
	const events = useSite().events || [];
	const [selectedId, setSelectedId] = (0, import_react.useState)(events[0]?.id || null);
	const [search, setSearch] = (0, import_react.useState)("");
	const saveEvents = (next) => setSite("events", next);
	const updateEvent = (id, patch) => {
		saveEvents(events.map((e) => e.id === id ? {
			...e,
			...patch
		} : e));
	};
	const toggleEventStatus = (id) => {
		const ev = events.find((e) => e.id === id);
		if (!ev) return;
		const nextStatus = ev.status === "active" ? "paused" : "active";
		updateEvent(id, { status: nextStatus });
	};
	const stopAllEvents = () => {
		if (confirm("Stop all currently running gift campaigns and events?")) saveEvents(events.map((e) => ({
			...e,
			status: "paused"
		})));
	};
	const startAllEvents = () => {
		if (confirm("Start all gift campaigns and events?")) saveEvents(events.map((e) => ({
			...e,
			status: "active"
		})));
	};
	const createEvent = () => {
		const nev = blankEvent();
		saveEvents([nev, ...events]);
		setSelectedId(nev.id);
	};
	const duplicateEvent = (id) => {
		const ev = events.find((e) => e.id === id);
		if (!ev) return;
		const dup = {
			...structuredClone(ev),
			id: `ev-${uid()}`,
			title: `${ev.title} (Copy)`,
			status: "paused"
		};
		saveEvents([...events, dup]);
		setSelectedId(dup.id);
	};
	const deleteEvent = (id) => {
		const ev = events.find((e) => e.id === id);
		if (!ev) return;
		if (confirm(`Delete campaign "${ev.title}"?`)) {
			const next = events.filter((e) => e.id !== id);
			saveEvents(next);
			if (selectedId === id) setSelectedId(next[0]?.id || null);
		}
	};
	const activeCount = events.filter((e) => e.status === "active").length;
	const filteredEvents = events.filter((e) => !search.trim() || e.title.toLowerCase().includes(search.toLowerCase()) || e.tag.toLowerCase().includes(search.toLowerCase()) || e.giftItem.toLowerCase().includes(search.toLowerCase()));
	const selectedEvent = events.find((e) => e.id === selectedId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Gift Campaigns & Events" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { marginTop: 4 },
				children: "Control live gift drops, seasonal promotions, flash sales, countdowns, and reward triggers across the entire storefront."
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: { gap: 8 },
			children: [activeCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "adm-btn danger",
				onClick: stopAllEvents,
				children: [
					"Stop all (",
					activeCount,
					" live)"
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "adm-btn ghost",
				onClick: startAllEvents,
				children: [
					"Start all (",
					events.length,
					")"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: createEvent,
				children: "+ New Campaign"
			})]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			display: "grid",
			gridTemplateColumns: "360px 1fr",
			gap: 24,
			alignItems: "start"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: `All Campaigns (${events.length})`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: { marginBottom: 12 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "search",
					placeholder: "Search campaigns & gifts...",
					value: search,
					onChange: (e) => setSearch(e.target.value),
					style: {
						width: "100%",
						fontSize: 13,
						padding: "8px 12px"
					}
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [filteredEvents.map((ev) => {
					const isSelected = ev.id === selectedId;
					const isActive = ev.status === "active";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: () => setSelectedId(ev.id),
						style: {
							border: isSelected ? "2px solid #202223" : "1px solid var(--p-border-subdued)",
							borderRadius: 8,
							padding: "14px 16px",
							cursor: "pointer",
							background: isSelected ? "#f9fafb" : "#ffffff",
							boxShadow: isSelected ? "0 0 0 1px #202223" : "0 1px 3px rgba(0,0,0,0.05)",
							transition: "all 0.12s ease"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
									marginBottom: 6
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `adm-tag ${isActive ? "active" : "draft"}`,
									children: isActive ? "Active" : "Paused"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										fontWeight: 500,
										color: "var(--p-text-subdued)"
									},
									children: EVENT_TYPES[ev.type].split(" ")[0]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 600,
									fontSize: 14,
									color: "var(--p-text)",
									marginBottom: 4
								},
								children: ev.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 12.5,
									color: "var(--p-text-subdued)",
									marginBottom: 10,
									lineHeight: 1.4
								},
								children: ev.type === "gift_with_purchase" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									"Free gift: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ev.giftItem || "Gift item" }),
									" ",
									ev.minSpend ? `(Orders over ৳${ev.minSpend})` : ""
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									ev.badgeText || ev.tag,
									" · ",
									ev.continuous ? "Continuous" : `${ev.startsAt} to ${ev.endsAt}`
								] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center"
								},
								onClick: (e) => e.stopPropagation(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: `adm-btn sm ${isActive ? "danger" : ""}`,
									style: {
										padding: "4px 12px",
										fontSize: 11
									},
									onClick: () => toggleEventStatus(ev.id),
									children: isActive ? "Stop" : "Start"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "adm-row",
									style: { gap: 4 },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn ghost sm",
										onClick: () => duplicateEvent(ev.id),
										children: "Copy"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn ghost sm",
										style: { color: "#c00" },
										onClick: () => deleteEvent(ev.id),
										children: "Delete"
									})]
								})]
							})
						]
					}, ev.id);
				}), !filteredEvents.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						textAlign: "center",
						padding: "24px 12px",
						color: "#888",
						fontSize: 12
					},
					children: "No campaigns match your search."
				})]
			})]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: selectedEvent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: `Editing: ${selectedEvent.title}`,
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-row",
				style: { gap: 8 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: `adm-btn ${selectedEvent.status === "active" ? "danger" : ""}`,
					onClick: () => toggleEventStatus(selectedEvent.id),
					children: selectedEvent.status === "active" ? "■ Stop Campaign" : "▶ Start Campaign"
				})
			}),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					style: { marginBottom: 18 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Campaign title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.title,
								onChange: (e) => updateEvent(selectedEvent.id, { title: e.target.value }),
								placeholder: "e.g. Winter Free Gift Drop"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Campaign type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: selectedEvent.type,
								onChange: (e) => updateEvent(selectedEvent.id, { type: e.target.value }),
								children: Object.entries(EVENT_TYPES).map(([k, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: k,
									children: label
								}, k))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Current status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: selectedEvent.status,
								onChange: (e) => updateEvent(selectedEvent.id, { status: e.target.value }),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "active",
										children: "Active (Running on store)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "paused",
										children: "Paused (Stopped)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "scheduled",
										children: "Scheduled (Date range)"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Badge / Tag" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.tag,
								onChange: (e) => updateEvent(selectedEvent.id, { tag: e.target.value.toUpperCase() }),
								placeholder: "e.g. FREE GIFT, LIMITED DROP"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: 12,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						margin: "16px 0 8px"
					},
					children: "Schedule & Timing"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: { marginBottom: 12 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
						label: "Run continuously (Never expires until manually stopped)",
						value: selectedEvent.continuous,
						onChange: (v) => updateEvent(selectedEvent.id, { continuous: v })
					})
				}),
				!selectedEvent.continuous && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					style: { marginBottom: 18 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Start date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "date",
							value: selectedEvent.startsAt,
							onChange: (e) => updateEvent(selectedEvent.id, { startsAt: e.target.value })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "End date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "date",
							value: selectedEvent.endsAt,
							onChange: (e) => updateEvent(selectedEvent.id, { endsAt: e.target.value })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: 12,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						margin: "18px 0 8px"
					},
					children: "Reward Gift & Conditions"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					style: { marginBottom: 18 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Free gift product / item name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.giftItem,
								onChange: (e) => updateEvent(selectedEvent.id, { giftItem: e.target.value }),
								placeholder: "e.g. AnnR Classics White Socks Bundle"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gift perceived value" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.giftValue,
								onChange: (e) => updateEvent(selectedEvent.id, { giftValue: e.target.value }),
								placeholder: "e.g. ৳1,200"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Minimum spend to qualify (BDT ৳)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								value: selectedEvent.minSpend,
								onChange: (e) => updateEvent(selectedEvent.id, { minSpend: e.target.value }),
								placeholder: "e.g. 5000 (0 for all orders)"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Promo / Discount code (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.discountCode,
								onChange: (e) => updateEvent(selectedEvent.id, { discountCode: e.target.value.toUpperCase() }),
								placeholder: "e.g. FREEGIFT"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							style: { gridColumn: "1/-1" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gift image URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: selectedEvent.giftImage,
								onChange: (e) => updateEvent(selectedEvent.id, { giftImage: e.target.value }),
								placeholder: "/cdn/shop/files/UWUSOCKS1.jpg"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-field",
							style: { gridColumn: "1/-1" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gift description / campaign copy" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								value: selectedEvent.giftDescription,
								onChange: (e) => updateEvent(selectedEvent.id, { giftDescription: e.target.value }),
								placeholder: "Explain how customers qualify and claim their gift."
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: 12,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						margin: "18px 0 8px"
					},
					children: "Storefront Placements & Display"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 12,
						marginBottom: 18
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								border: "1px solid rgba(0,0,0,0.1)",
								borderRadius: 4,
								padding: "12px 14px"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
								label: "Show Top Announcement Bar",
								value: selectedEvent.showTopBar,
								onChange: (v) => updateEvent(selectedEvent.id, { showTopBar: v })
							}), selectedEvent.showTopBar && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "adm-grid",
								style: { marginTop: 8 },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "adm-field",
									style: { gridColumn: "1/-1" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Top bar message text" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: selectedEvent.topBarText,
										onChange: (e) => updateEvent(selectedEvent.id, { topBarText: e.target.value })
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "adm-field",
									style: { gridColumn: "1/-1" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Top bar link URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: selectedEvent.topBarUrl,
										onChange: (e) => updateEvent(selectedEvent.id, { topBarUrl: e.target.value })
									})]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								border: "1px solid rgba(0,0,0,0.1)",
								borderRadius: 4,
								padding: "12px 14px"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
								label: "Show Infinite Marquee Ticker Banner",
								value: selectedEvent.showTicker,
								onChange: (v) => updateEvent(selectedEvent.id, { showTicker: v })
							}), selectedEvent.showTicker && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { marginTop: 8 },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "adm-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Marquee scrolling text" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: selectedEvent.tickerText,
										onChange: (e) => updateEvent(selectedEvent.id, { tickerText: e.target.value })
									})]
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								border: "1px solid rgba(0,0,0,0.1)",
								borderRadius: 4,
								padding: "12px 14px"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
								label: "Show Floating Gift Trigger Pill (Bottom corner of screen)",
								value: selectedEvent.showFloatingGiftPill,
								onChange: (v) => updateEvent(selectedEvent.id, { showFloatingGiftPill: v })
							}), selectedEvent.showFloatingGiftPill && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { marginTop: 8 },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "adm-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Floating pill text" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: selectedEvent.pillText,
										onChange: (e) => updateEvent(selectedEvent.id, { pillText: e.target.value })
									})]
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								border: "1px solid rgba(0,0,0,0.1)",
								borderRadius: 4,
								padding: "12px 14px"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
								label: "Show Cart Drawer Progress & Reward Prompt",
								value: selectedEvent.showCartReward,
								onChange: (v) => updateEvent(selectedEvent.id, { showCartReward: v })
							}), selectedEvent.showCartReward && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { marginTop: 8 },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "adm-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"Cart incentive message (Use ",
										"{remaining}",
										" for remaining ৳)"
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: selectedEvent.cartRewardMessage,
										onChange: (e) => updateEvent(selectedEvent.id, { cartRewardMessage: e.target.value })
									})]
								})
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: 12,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						margin: "18px 0 8px"
					},
					children: "Campaign Theme Colors"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
							label: "Banner background",
							value: selectedEvent.bg,
							onChange: (v) => updateEvent(selectedEvent.id, { bg: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
							label: "Text color",
							value: selectedEvent.textColor,
							onChange: (v) => updateEvent(selectedEvent.id, { textColor: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
							label: "Accent highlight color",
							value: selectedEvent.accentColor,
							onChange: (v) => updateEvent(selectedEvent.id, { accentColor: v })
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Live Storefront Component Preview",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 16
				},
				children: [
					selectedEvent.showTopBar && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 600,
							marginBottom: 4,
							textTransform: "uppercase"
						},
						children: "Top Bar Preview:"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							background: selectedEvent.bg || "#050505",
							color: selectedEvent.textColor || "#ffffff",
							padding: "10px 14px",
							textAlign: "center",
							fontFamily: "'NB Architekt Std', sans-serif",
							fontSize: 11,
							letterSpacing: 1,
							textTransform: "uppercase",
							borderRadius: 2
						},
						children: selectedEvent.topBarText || "Campaign Top Announcement Bar"
					})] }),
					selectedEvent.showTicker && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 600,
							marginBottom: 4,
							textTransform: "uppercase"
						},
						children: "Marquee Ticker Banner Preview:"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							background: selectedEvent.bg || "#111",
							color: selectedEvent.textColor || "#fff",
							padding: "8px 12px",
							overflow: "hidden",
							whiteSpace: "nowrap",
							fontFamily: "'Druk Wide', sans-serif",
							fontSize: 12,
							letterSpacing: 1.5,
							border: "1px solid rgba(255,255,255,0.15)",
							borderRadius: 4
						},
						children: [
							selectedEvent.tickerText || "ANNR EVENT MARQUEE TICKER",
							" ·",
							" ",
							selectedEvent.tickerText || "ANNR EVENT MARQUEE TICKER"
						]
					})] }),
					selectedEvent.showFloatingGiftPill && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 600,
							marginBottom: 4,
							textTransform: "uppercase"
						},
						children: "Floating Trigger Pill Preview:"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { display: "inline-flex" },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								background: selectedEvent.bg || "#000",
								color: selectedEvent.textColor || "#fff",
								padding: "8px 16px",
								borderRadius: 999,
								fontFamily: "'NB Architekt Std', sans-serif",
								fontSize: 11,
								letterSpacing: 1,
								fontWeight: 700,
								boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
								border: `1px solid ${selectedEvent.accentColor || "#e10600"}`,
								cursor: "pointer"
							},
							children: selectedEvent.pillText || "🎁 Free Gift"
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 600,
							marginBottom: 4,
							textTransform: "uppercase"
						},
						children: "Gift Modal / Showcase Preview:"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							background: "#000",
							color: "#fff",
							padding: 16,
							borderRadius: 4,
							maxWidth: 420,
							border: "1px solid rgba(255,255,255,0.15)"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 12,
								alignItems: "center"
							},
							children: [selectedEvent.giftImage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: selectedEvent.giftImage,
								alt: selectedEvent.giftItem,
								style: {
									width: 64,
									height: 64,
									objectFit: "cover",
									borderRadius: 4,
									background: "#222"
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: 9,
										color: selectedEvent.accentColor || "#e10600",
										fontFamily: "'FK Grotesk SemiMono', monospace",
										letterSpacing: 1
									},
									children: [
										selectedEvent.tag || "FREE GIFT",
										" · ",
										selectedEvent.giftValue || "FREE"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 13,
										fontWeight: 700,
										marginTop: 2
									},
									children: selectedEvent.giftItem || "Gift Reward Item"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 10,
										opacity: .7,
										marginTop: 2
									},
									children: selectedEvent.minSpend ? `Complimentary when your order total exceeds ৳${selectedEvent.minSpend}` : "Complimentary on all orders"
								})
							] })]
						})
					})] })
				]
			})
		})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			style: {
				textAlign: "center",
				padding: "40px 0",
				color: "#666"
			},
			children: "Select a campaign on the left or click \"+ New Campaign\" to create one."
		}) }) })]
	})] });
}
//#endregion
export { EventsManager as component };
