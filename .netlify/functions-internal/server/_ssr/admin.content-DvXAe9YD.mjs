import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, F as uid, c as SCOPES } from "./store-CNEGzpjs.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { a as F, c as Pick, d as move, f as useSite, l as UrlF, n as Chk, o as Obj, r as ColorF, s as OrderBtns, t as Big } from "./fields-CAbwAx7K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.content-DvXAe9YD.js
var import_jsx_runtime = require_jsx_runtime();
function Content() {
	const site = useSite();
	const setT = (l) => setSite("texts", l);
	const setI = (l) => setSite("images", l);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-top",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Content" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Announcement bar",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "announcement",
				children: (a, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show announcement",
							value: a.on,
							onChange: (on) => set({ on })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Text",
							value: a.text,
							onChange: (text) => set({ text }),
							validate: (v) => a.on && !v.trim() ? "Text is required when shown" : null
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Link (optional)",
							value: a.url,
							onChange: (url) => set({ url })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
							label: "Background",
							value: a.background,
							onChange: (background) => set({ background })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
							label: "Text colour",
							value: a.color,
							onChange: (color) => set({ color })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
							label: "Show on",
							value: a.device,
							options: [
								"all",
								"desktop",
								"mobile"
							],
							onChange: (device) => set({ device })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Popup",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "popup",
				children: (p, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show popup",
							value: p.on,
							onChange: (on) => set({ on })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Title",
							value: p.title,
							onChange: (title) => set({ title })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Button label",
							value: p.button,
							onChange: (button) => set({ button })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Button link",
							value: p.url,
							onChange: (url) => set({ url })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Delay (seconds)",
							type: "number",
							value: p.delaySec,
							onChange: (delaySec) => set({ delaySec }),
							validate: (v) => Number(v) >= 0 && Number(v) <= 60 ? null : "0–60 seconds"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show once per visitor",
							value: p.showOnce,
							onChange: (showOnce) => set({ showOnce })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Big, {
							label: "Message",
							value: p.text,
							onChange: (text) => set({ text })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Text replacements",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: () => setT([...site.texts, {
					id: uid(),
					find: "",
					replace: "",
					scope: "all",
					enabled: true
				}]),
				children: "+ Add"
			}),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					children: "Change any wording on the store: type the exact original text and what it should say. Scope limits it to a page type or a path like /pages/faq."
				}),
				site.texts.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Original text" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "New text" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Where" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "On" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: site.texts.map((r, i) => {
					const up = (p) => setT(site.texts.map((x) => x.id === r.id ? {
						...x,
						...p
					} : x));
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBtns, {
							i,
							n: site.texts.length,
							onMove: (to) => setT(move(site.texts, i, to))
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: r.find,
							onChange: (e) => up({ find: e.target.value })
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: r.replace,
							onChange: (e) => up({ replace: e.target.value })
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							list: "scopes",
							value: r.scope,
							onChange: (e) => up({ scope: e.target.value })
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: r.enabled,
							onChange: (e) => up({ enabled: e.target.checked })
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn danger sm",
							onClick: () => confirm("Delete this replacement?") && setT(site.texts.filter((x) => x.id !== r.id)),
							children: "✕"
						}) })
					] }, r.id);
				}) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No text changes yet." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
					id: "scopes",
					children: SCOPES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: s }, s))
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Image replacements",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: () => setI([...site.images, {
					id: uid(),
					from: "",
					to: "",
					alt: "",
					position: "",
					scope: "all",
					enabled: true
				}]),
				children: "+ Add"
			}),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Swap any picture or video on the store. Paste part of the original file name (e.g. hero_1.jpg) and choose a new one from the Media library."
			}), site.images.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Original file" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "New image" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Alt text" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Focus" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Where" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "On" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: site.images.map((r) => {
				const up = (p) => setI(site.images.map((x) => x.id === r.id ? {
					...x,
					...p
				} : x));
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: r.from,
						onChange: (e) => up({ from: e.target.value })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: r.to,
						onChange: (e) => up({ to: e.target.value }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Choose…"
						}), site.media.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: m.url,
							children: m.name
						}, m.id))]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: r.alt,
						onChange: (e) => up({ alt: e.target.value })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: r.position,
						onChange: (e) => up({ position: e.target.value }),
						children: [
							"",
							"top",
							"center",
							"bottom"
						].map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: o,
							children: o || "Original"
						}, o))
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						list: "scopes",
						value: r.scope,
						onChange: (e) => up({ scope: e.target.value })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: r.enabled,
						onChange: (e) => up({ enabled: e.target.checked })
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger sm",
						onClick: () => confirm("Delete this replacement?") && setI(site.images.filter((x) => x.id !== r.id)),
						children: "✕"
					}) })
				] }, r.id);
			}) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No image changes yet." })]
		})
	] });
}
//#endregion
export { Content as component };
