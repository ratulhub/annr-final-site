import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, F as uid, d as TEMPLATES, l as SECTION_KINDS, u as SPACING } from "./store-CNEGzpjs.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { c as Pick, d as move, f as useSite, i as DevicePreview, r as ColorF, s as OrderBtns } from "./fields-CAbwAx7K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.sections-BpWW9Fce.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var base = {
	visible: true,
	padTop: "",
	padBottom: "",
	background: "",
	align: "",
	width: "",
	device: "all"
};
var okUrl = (u) => !u || /^(\/|https?:\/\/|mailto:|tel:|#)/.test(u);
function SectionsManager() {
	const site = useSite();
	const [tpl, setTpl] = (0, import_react.useState)("home");
	const [drag, setDrag] = (0, import_react.useState)(null);
	const [kind, setKind] = (0, import_react.useState)("text");
	const T = TEMPLATES[tpl] || TEMPLATES["home"];
	const list = site.sections[tpl] || T.sections;
	const save = (l) => setSite("sections", {
		...site.sections,
		[tpl]: l
	});
	const up = (i, p) => save(list.map((s, j) => j === i ? {
		...s,
		...p
	} : s));
	const fixed = (s) => /header|footer/.test(s.key) && !s.copyOf && !s.added;
	const duplicate = (i) => {
		const s = list[i];
		const key = `adm${uid()}`;
		const copy = {
			...s,
			key,
			label: `${s.label} (Copy)`,
			copyOf: s.copyOf || (s.added ? void 0 : s.key),
			added: s.added ? { ...s.added } : void 0
		};
		save([
			...list.slice(0, i + 1),
			copy,
			...list.slice(i + 1)
		]);
	};
	const add = () => {
		const key = `adm${uid()}`;
		const at = Math.max(1, list.findIndex((s) => /footer/.test(s.key)));
		const s = {
			...base,
			key,
			label: SECTION_KINDS[kind],
			type: kind,
			added: {
				kind,
				heading: kind === "gift_banner" ? "EXCLUSIVE GIFT DROP" : kind === "countdown" ? "LIMITED DROP COUNTDOWN" : "New section",
				text: kind === "gift_banner" ? "Claim your free gift with qualifying orders." : "",
				image: "",
				alt: "",
				button: "Shop now",
				url: "/collections/all/index.html",
				endDate: kind === "countdown" ? new Date(Date.now() + 6048e5).toISOString().slice(0, 16) : void 0,
				limit: "4"
			}
		};
		save([
			...list.slice(0, at),
			s,
			...list.slice(at)
		]);
	};
	const remove = (i) => {
		if (confirm(`Remove "${list[i].label}" from this page?`)) save(list.filter((_, j) => j !== i));
	};
	const showAll = () => save(list.map((s) => ({
		...s,
		visible: true
	})));
	const hideAllOptional = () => save(list.map((s) => fixed(s) ? s : {
		...s,
		visible: false
	}));
	const visibleCount = list.filter((s) => s.visible).length;
	const hiddenCount = list.length - visibleCount;
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Page Sections & Layout" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { marginTop: 4 },
					children: "Control which full sections are shown or hidden on every page. Drag to reorder, duplicate, add custom banners, countdowns, and gift spotlights."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { gap: 8 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: tpl,
						onChange: (e) => setTpl(e.target.value),
						style: {
							width: 220,
							fontWeight: 600
						},
						children: Object.entries(TEMPLATES).map(([k, t]) => {
							const count = (site.sections[k] || t.sections).filter((s) => s.visible).length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: k,
								children: [
									t.label,
									" (",
									count,
									" visible)"
								]
							}, k);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: showAll,
						children: "Show all"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: hideAllOptional,
						children: "Hide optional"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						onClick: () => confirm("Reset this page's sections to original defaults?") && save(T.sections.map((s) => ({ ...s }))),
						children: "Reset"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 12,
				alignItems: "center",
				marginBottom: 16
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					style: {
						fontSize: 12,
						fontFamily: "'FK Grotesk SemiMono', monospace"
					},
					children: ["Template: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: T.label })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "adm-tag",
					style: {
						background: "#050505",
						color: "#fff"
					},
					children: [visibleCount, " visible"]
				}),
				hiddenCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "adm-tag",
					style: {
						background: "#e5e5e5",
						color: "#666"
					},
					children: [hiddenCount, " hidden"]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 12
			},
			children: list.map((s, i) => {
				const isFixed = fixed(s);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-card adm-sec",
					draggable: true,
					onDragStart: () => setDrag(i),
					onDragOver: (e) => e.preventDefault(),
					onDrop: () => {
						if (drag !== null) save(move(list, drag, i));
						setDrag(null);
					},
					style: {
						opacity: s.visible ? 1 : .65,
						transition: "opacity 0.15s ease"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-row",
							style: {
								justifyContent: "space-between",
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: {
											cursor: "grab",
											opacity: .6,
											fontSize: 16
										},
										children: "⋮⋮"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: s.label,
										onChange: (e) => up(i, { label: e.target.value }),
										style: {
											width: 260,
											fontWeight: 600,
											fontSize: 13.5
										},
										"aria-label": "Section name"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `adm-tag ${s.visible ? "active" : "draft"}`,
										children: s.visible ? "Visible" : "Hidden"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "adm-tag",
										children: s.added ? `added · ${SECTION_KINDS[s.added.kind]}` : s.copyOf ? "copy" : s.type
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "adm-row",
								style: { gap: 6 },
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: `adm-btn sm ${s.visible ? "ghost" : ""}`,
										onClick: () => up(i, { visible: !s.visible }),
										style: { minWidth: 70 },
										children: s.visible ? "Hide" : "Show"
									}),
									!isFixed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn ghost sm",
										onClick: () => duplicate(i),
										children: "Copy"
									}),
									(s.copyOf || s.added) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "adm-btn ghost sm",
										style: { color: "#c00" },
										onClick: () => remove(i),
										children: "Remove"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
										i,
										n: list.length,
										onMove: (to) => save(move(list, i, to))
									})
								]
							})]
						}),
						s.added && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddedSectionEditor, {
							s,
							onChange: (a) => up(i, { added: a })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "adm-grid",
							style: {
								marginTop: 14,
								paddingTop: 12,
								borderTop: "1px solid rgba(0,0,0,0.08)"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
									label: "Space above",
									value: s.padTop,
									options: SPACING,
									onChange: (v) => up(i, { padTop: v })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
									label: "Space below",
									value: s.padBottom,
									options: SPACING,
									onChange: (v) => up(i, { padBottom: v })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
									label: "Background",
									value: s.background,
									onChange: (v) => up(i, { background: v })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
									label: "Text alignment",
									value: s.align,
									options: [
										"",
										"left",
										"center",
										"right"
									],
									onChange: (v) => up(i, { align: v })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
									label: "Container width",
									value: s.width,
									options: [
										"",
										"full",
										"contained"
									],
									onChange: (v) => up(i, { width: v })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
									label: "Display on",
									value: s.device,
									options: [
										"all",
										"desktop",
										"mobile"
									],
									onChange: (v) => up(i, { device: v })
								})
							]
						})
					]
				}, s.key);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Add a New Section to this Page",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { gap: 10 },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: kind,
					onChange: (e) => setKind(e.target.value),
					style: {
						width: 240,
						fontWeight: 600
					},
					children: Object.entries(SECTION_KINDS).map(([k, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: k,
						children: l
					}, k))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn",
					onClick: add,
					children: "+ Add to page"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Newly added sections are inserted above the footer. You can drag and drop them anywhere and configure text, buttons, images, countdown timers, or gift campaign banners."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Live Page Preview",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicePreview, { url: T.sample })
		})
	] });
}
function AddedSectionEditor({ s, onChange }) {
	const a = s.added;
	const set = (p) => onChange({
		...a,
		...p
	});
	const field = (label, k, area = false) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), area ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			rows: 2,
			value: a[k] || "",
			onChange: (e) => set({ [k]: e.target.value })
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value: a[k] || "",
			onChange: (e) => set({ [k]: e.target.value })
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "adm-grid",
		style: { marginTop: 12 },
		children: [
			field("Heading", "heading"),
			field("Text body", "text", true),
			(a.kind === "image" || a.kind === "gift_banner") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [field("Image URL", "image"), field("Image alt text", "alt")] }),
			a.kind === "countdown" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "adm-field",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Countdown target (Date & time)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "datetime-local",
					value: a.endDate || "",
					onChange: (e) => set({ endDate: e.target.value })
				})]
			}),
			a.kind === "products" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [field("Collection handle (e.g. all, hoodies, vault)", "collection"), field("Number of products to show (e.g. 4)", "limit")] }),
			field("Button label", "button"),
			field("Button link URL", "url"),
			!okUrl(a.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-err",
				children: "Link must start with /, https://, mailto: or tel:"
			}),
			a.image && !okUrl(a.image) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-err",
				children: "Image URL must start with / or https://"
			})
		]
	});
}
//#endregion
export { SectionsManager as component };
