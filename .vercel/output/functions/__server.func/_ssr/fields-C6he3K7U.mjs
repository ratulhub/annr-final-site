import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, L as useAdmin } from "./store-CG_wgU4l.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fields-C6he3K7U.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useSite() {
	return useAdmin().site;
}
function Obj({ k, children }) {
	const v = useSite()[k];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: children(v, (patch) => setSite(k, {
		...v,
		...patch
	})) });
}
var isUrl = (u) => !u || /^(\/|https?:\/\/|mailto:|tel:|#)/.test(u);
var isColor = (c) => !c || /^#[0-9a-f]{3,8}$/i.test(c);
function F({ label, value, onChange, hint, validate, type = "text", placeholder }) {
	const [draft, setDraft] = (0, import_react.useState)(null);
	const v = draft ?? value ?? "";
	const err = validate ? validate(v) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type,
				value: v,
				placeholder,
				"aria-invalid": !!err,
				onChange: (e) => {
					const nv = e.target.value;
					if (validate && validate(nv)) setDraft(nv);
					else {
						setDraft(null);
						onChange(nv);
					}
				}
			}),
			err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
				className: "adm-err",
				children: err
			}) : hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
				className: "adm-hint",
				children: hint
			}) : null
		]
	});
}
var UrlF = (p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
	...p,
	validate: (v) => isUrl(v) ? null : "Must start with /, https://, mailto: or tel:"
});
function ColorF({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: { flexWrap: "nowrap" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "color",
					value: value || "#000000",
					onChange: (e) => onChange(e.target.value),
					style: { width: 46 }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value,
					placeholder: "Original",
					onChange: (e) => isColor(e.target.value) && onChange(e.target.value)
				}),
				value && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "adm-btn ghost",
					onClick: () => onChange(""),
					children: "Reset"
				})
			]
		})]
	});
}
function Pick({ label, value, options, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			value,
			onChange: (e) => onChange(e.target.value),
			children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: o,
				children: o || "Original"
			}, o))
		})]
	});
}
function Big({ label, value, onChange, rows = 4 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		style: { gridColumn: "1 / -1" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			rows,
			value: value ?? "",
			onChange: (e) => onChange(e.target.value)
		})]
	});
}
function Chk({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-check",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			checked: !!value,
			onChange: (e) => onChange(e.target.checked)
		}), label]
	});
}
function move(list, from, to) {
	if (to < 0 || to >= list.length) return list;
	const c = list.slice();
	const [x] = c.splice(from, 1);
	c.splice(to, 0, x);
	return c;
}
function OrderBtns({ i, n, onMove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "adm-row",
		style: { gap: 4 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "adm-btn ghost sm",
			disabled: i === 0,
			onClick: () => onMove(i - 1),
			"aria-label": "Move up",
			children: "↑"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "adm-btn ghost sm",
			disabled: i === n - 1,
			onClick: () => onMove(i + 1),
			"aria-label": "Move down",
			children: "↓"
		})]
	});
}
function DevicePreview({ url }) {
	const [w, setW] = (0, import_react.useState)("100%");
	const [k, setK] = (0, import_react.useState)(0);
	const sep = url.includes("?") ? "&" : "?";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "adm-row",
		style: { marginBottom: 10 },
		children: [
			[
				["Desktop", "100%"],
				["Tablet", "820px"],
				["Mobile", "390px"]
			].map(([l, v]) => v && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `adm-btn ${w === v ? "" : "ghost"} sm`,
				onClick: () => setW(v),
				children: l
			}, l)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "adm-btn ghost sm",
				onClick: () => setK(k + 1),
				children: "Reload"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				className: "link",
				href: `${url}${sep}preview=1`,
				target: "_blank",
				rel: "noreferrer",
				children: "Open draft preview ↗"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: {
			border: "1px solid #000",
			background: "#f2f2f2",
			overflow: "auto"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
			title: "Preview",
			src: `${url}${sep}preview=1`,
			style: {
				width: w,
				height: 640,
				border: 0,
				display: "block",
				margin: "0 auto",
				background: "#fff"
			}
		}, k)
	})] });
}
//#endregion
export { F as a, Pick as c, move as d, useSite as f, DevicePreview as i, UrlF as l, Chk as n, Obj as o, ColorF as r, OrderBtns as s, Big as t, isUrl as u };
