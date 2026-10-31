import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { F as uid } from "./store-CNEGzpjs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-D23-eAUw.js
var import_jsx_runtime = require_jsx_runtime();
function BackBtn({ to = "/admin", label = "← Back" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to,
		className: "adm-btn ghost sm",
		style: {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			padding: "6px 12px",
			fontSize: 13,
			fontWeight: 500,
			textDecoration: "none",
			whiteSpace: "nowrap",
			flexShrink: 0,
			cursor: "pointer",
			borderRadius: 6
		},
		children: label
	});
}
function Card({ title, children, action, subtitle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "adm-card",
		children: [(title || action || subtitle) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			style: {
				marginBottom: 14,
				paddingBottom: 10
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title }), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				style: { margin: "2px 0 0" },
				children: subtitle
			})] }), action]
		}), children]
	});
}
function Text({ label, value, onChange, type = "text", hint, placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type,
				placeholder,
				value: value ?? "",
				onChange: (e) => onChange(e.target.value)
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-hint",
				children: hint
			})
		]
	});
}
function Area({ label, value, onChange, hint, placeholder, rows = 4 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		style: { gridColumn: "1 / -1" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				rows,
				placeholder,
				value: value ?? "",
				onChange: (e) => onChange(e.target.value)
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-hint",
				children: hint
			})
		]
	});
}
function Toggle({ label, value, onChange, description }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: 3
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "adm-check",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "checkbox",
				checked: !!value,
				onChange: (e) => onChange(e.target.checked)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
		}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "adm-hint",
			style: { marginLeft: 26 },
			children: description
		})]
	});
}
function Select({ label, value, options, onChange, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "adm-field",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value,
				onChange: (e) => onChange(e.target.value),
				children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: o,
					children: o
				}, o))
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-hint",
				children: hint
			})
		]
	});
}
function RowList({ rows, onChange, fields, blank }) {
	const set = (i, k, v) => onChange(rows.map((r, j) => j === i ? {
		...r,
		[k]: v
	} : r));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { overflowX: "auto" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: f.label }, String(f.key))), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
			style: {
				width: 50,
				textAlign: "center"
			},
			children: "Action"
		})] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: f.type === "bool" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			checked: !!r[f.key],
			onChange: (e) => set(i, f.key, e.target.checked)
		}) : Array.isArray(f.type) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			value: String(r[f.key]),
			onChange: (e) => set(i, f.key, e.target.value),
			children: f.type.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: o,
				children: o
			}, o))
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: f.type === "number" ? "number" : "text",
			value: String(r[f.key] ?? ""),
			onChange: (e) => set(i, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
		}) }, String(f.key))), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: { textAlign: "center" },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "adm-btn danger sm",
				style: { padding: "4px 8px" },
				onClick: () => onChange(rows.filter((_, j) => j !== i)),
				title: "Delete row",
				children: "✕"
			})
		})] }, r.id)) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-row",
			style: { marginTop: 14 },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "adm-btn ghost sm",
				onClick: () => onChange([...rows, {
					...blank,
					id: uid()
				}]),
				children: "➕ Add New Row"
			})
		})]
	});
}
function KeyValueEditor({ data, onChange, types = {} }) {
	const label = (k) => k.replace(/([A-Z])/g, " $1");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "adm-grid",
		children: Object.entries(data).map(([k, v]) => typeof v === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
			label: label(k),
			value: v,
			onChange: (x) => onChange(k, x)
		}, k) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Text, {
			label: label(k),
			type: types[k] || (/color|primary|background|accent|^text$/i.test(k) && String(v).startsWith("#") ? "color" : "text"),
			value: v,
			onChange: (x) => onChange(k, x)
		}, k))
	});
}
//#endregion
export { RowList as a, Toggle as c, KeyValueEditor as i, BackBtn as n, Select as o, Card as r, Text as s, Area as t };
