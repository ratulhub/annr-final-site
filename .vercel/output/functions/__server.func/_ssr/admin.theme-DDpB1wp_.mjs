import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, N as siteDefaults, f as WIDTHS, o as RADIUS, r as FONT_OPTIONS, s as SCALE } from "./store-CG_wgU4l.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { a as F, c as Pick, i as DevicePreview, l as UrlF, n as Chk, o as Obj, r as ColorF, t as Big } from "./fields-C6he3K7U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.theme-DDpB1wp_.js
var import_jsx_runtime = require_jsx_runtime();
function Theme() {
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Appearance & design" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn ghost",
				onClick: () => confirm("Reset all design settings to the original look?") && setSite("design", siteDefaults().design),
				children: "Reset to original"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Empty values keep the original AnnR design. Choices are limited to safe values so the layout can't break."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
			k: "design",
			children: (d, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					title: "Colours",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Page background",
								value: d.background,
								onChange: (background) => set({ background })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Text",
								value: d.text,
								onChange: (text) => set({ text })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Accent (product labels)",
								value: d.accent,
								onChange: (accent) => set({ accent })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Header background",
								value: d.headerBg,
								onChange: (headerBg) => set({ headerBg })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Header text",
								value: d.headerText,
								onChange: (headerText) => set({ headerText })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Footer background",
								value: d.footerBg,
								onChange: (footerBg) => set({ footerBg })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Footer text",
								value: d.footerText,
								onChange: (footerText) => set({ footerText })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Mode",
								value: d.mode,
								options: ["light", "dark"],
								onChange: (mode) => set({ mode })
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					title: "Typography",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Heading font",
								value: d.headingFont,
								options: FONT_OPTIONS,
								onChange: (headingFont) => set({ headingFont })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Body font",
								value: d.bodyFont,
								options: FONT_OPTIONS,
								onChange: (bodyFont) => set({ bodyFont })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Text size",
								value: d.fontScale,
								options: SCALE,
								onChange: (fontScale) => set({ fontScale })
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					title: "Buttons, forms & layout",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Button background",
								value: d.buttonBg,
								onChange: (buttonBg) => set({ buttonBg })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorF, {
								label: "Button text",
								value: d.buttonText,
								onChange: (buttonText) => set({ buttonText })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Button corners",
								value: d.buttonRadius,
								options: RADIUS,
								onChange: (buttonRadius) => set({ buttonRadius })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Input corners",
								value: d.inputRadius,
								options: RADIUS,
								onChange: (inputRadius) => set({ inputRadius })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pick, {
								label: "Max page width",
								value: d.containerWidth,
								options: WIDTHS,
								onChange: (containerWidth) => set({ containerWidth })
							})
						]
					})
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Logo & icon",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "general",
				children: (g, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Logo image (empty = original)",
							value: g.logoUrl,
							onChange: (logoUrl) => set({ logoUrl }),
							hint: "Pick a link from the Media library"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Logo alt text",
							value: g.logoAlt,
							onChange: (logoAlt) => set({ logoAlt })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Secondary logo",
							value: g.secondaryLogo,
							onChange: (secondaryLogo) => set({ secondaryLogo })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Favicon",
							value: g.favicon,
							onChange: (favicon) => set({ favicon })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Store features",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "technical",
				children: (t, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Page transition animation",
							value: t.pageTransition,
							onChange: (pageTransition) => set({ pageTransition })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Product labels (e.g. sold out)",
							value: t.productLabels,
							onChange: (productLabels) => set({ productLabels })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Big, {
							label: "Custom CSS (advanced)",
							value: t.customCss,
							onChange: (customCss) => set({ customCss })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Preview",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicePreview, { url: "/home.html" })
		})
	] });
}
//#endregion
export { Theme as component };
