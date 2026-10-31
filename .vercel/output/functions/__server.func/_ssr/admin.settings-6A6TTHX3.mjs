import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as replaceState, L as useAdmin, O as resetState, S as logAuthEvent, b as getSession, h as confirmReauth, j as setState } from "./store-CG_wgU4l.mjs";
import { i as can, n as ROLES } from "./permissions-B5x35gQ-.mjs";
import { i as KeyValueEditor, n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { a as F, l as UrlF, n as Chk, o as Obj, t as Big } from "./fields-C6he3K7U.mjs";
import { t as IntegrationsCard } from "./IntegrationsCard-kGiRSFvJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.settings-6A6TTHX3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function isValidImport(x) {
	if (!x || typeof x !== "object" || Array.isArray(x)) return false;
	const o = x;
	if (!Array.isArray(o["products"]) || o["products"].length > 500) return false;
	if (!Array.isArray(o["collections"]) || o["collections"].length > 100) return false;
	if (!Array.isArray(o["pages"]) || o["pages"].length > 200) return false;
	if (typeof o["site"] !== "object" || o["site"] === null || Array.isArray(o["site"])) return false;
	if (o["admins"] !== void 0) {
		if (!Array.isArray(o["admins"]) || o["admins"].length > 100) return false;
		for (const a of o["admins"]) {
			if (!a || typeof a !== "object") return false;
			const role = String(a["role"] ?? "");
			if (!ROLES.includes(role)) return false;
		}
	}
	return true;
}
function Settings() {
	const s = useAdmin();
	const [dataMsg, setDataMsg] = (0, import_react.useState)("");
	const exportJson = async () => {
		if (!can(getSession()?.role, "data.export")) {
			setDataMsg("Permission denied: data.export required.");
			return;
		}
		if (!await confirmReauth("export all admin data")) return;
		logAuthEvent("data_export");
		const a = document.createElement("a");
		a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }));
		a.download = "annr-admin-data.json";
		a.click();
		setDataMsg("Exported admin data.");
	};
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Settings" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "General",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "general",
				children: (g, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Site name",
							value: g.siteName,
							onChange: (siteName) => set({ siteName }),
							validate: (v) => v.trim() ? null : "Required"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Tagline",
							value: g.tagline,
							onChange: (tagline) => set({ tagline })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Phone",
							value: g.phone,
							onChange: (phone) => set({ phone })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Address",
							value: g.address,
							onChange: (address) => set({ address })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Language",
							value: g.locale,
							onChange: (locale) => set({ locale })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Time zone",
							value: g.timezone,
							onChange: (timezone) => set({ timezone })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Big, {
							label: "Description",
							value: g.description,
							onChange: (description) => set({ description }),
							rows: 2
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Logo and favicon are under Appearance; contact email and copyright under Navigation & footer."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Social profiles",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "social",
				children: (v, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-grid",
					children: Object.keys(v).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
						label: k,
						value: v[k],
						onChange: (x) => set({ [k]: x })
					}, k))
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Footer social links are edited in Navigation → Footer columns."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Technical",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "technical",
				children: (t, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Maintenance mode (covers the store)",
							value: t.maintenance,
							onChange: (maintenance) => set({ maintenance })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Maintenance title",
							value: t.maintenanceTitle,
							onChange: (maintenanceTitle) => set({ maintenanceTitle })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Maintenance message",
							value: t.maintenanceText,
							onChange: (maintenanceText) => set({ maintenanceText })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Hidden page title",
							value: t.notFoundTitle,
							onChange: (notFoundTitle) => set({ notFoundTitle })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Hidden page message",
							value: t.notFoundText,
							onChange: (notFoundText) => set({ notFoundText })
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Legal & privacy",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Obj, {
				k: "cookie",
				children: (c, set) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-grid",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chk, {
							label: "Show cookie notice",
							value: c.on,
							onChange: (on) => set({ on })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Notice text",
							value: c.text,
							onChange: (text) => set({ text })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
							label: "Button",
							value: c.button,
							onChange: (button) => set({ button })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UrlF, {
							label: "Policy link",
							value: c.policyUrl,
							onChange: (policyUrl) => set({ policyUrl })
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Policy page wording is edited under Pages."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrationsCard, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Store settings (orders & shipping)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyValueEditor, {
				data: s.settings,
				onChange: (k, v) => setState((x) => ({
					...x,
					settings: {
						...x.settings,
						[k]: v
					}
				}))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Staff & admins",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				style: { marginTop: 0 },
				children: [
					"Moved to ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						className: "link",
						to: "/admin/users",
						children: "Users & permissions"
					}),
					"."
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Data",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: { marginTop: 0 },
					children: "Test mode: changes are saved in this browser only until a database is connected."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn",
							onClick: exportJson,
							children: "Export all data"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "adm-btn ghost",
							children: ["Import data", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "application/json",
								hidden: true,
								onChange: async (e) => {
									const f = e.target.files?.[0];
									e.target.value = "";
									if (!f) return;
									setDataMsg("");
									if (f.size > 5242880) {
										setDataMsg("Import file is too large (max 5 MB).");
										return;
									}
									try {
										const parsed = JSON.parse(await f.text());
										if (!isValidImport(parsed)) {
											setDataMsg("Invalid admin backup file.");
											return;
										}
										if (await confirmReauth("import admin data")) {
											replaceState(parsed);
											logAuthEvent("data_import");
											setDataMsg("Data imported into draft.");
										}
									} catch {
										setDataMsg("Could not read JSON file.");
									}
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn danger",
							onClick: async () => {
								if (confirm("Reset everything to the original store data?") && await confirmReauth("reset all admin data")) {
									resetState();
									logAuthEvent("data_reset");
									setDataMsg("Reset to original.");
								}
							},
							children: "Reset to original"
						})
					]
				}),
				dataMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { marginTop: 8 },
					children: dataMsg
				})
			]
		})
	] });
}
//#endregion
export { Settings as component, isValidImport };
