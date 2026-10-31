import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { I as unpublishAll, L as useAdmin, M as siteConfig, S as logAuthEvent, T as publish, _ as discardDraft, b as getSession, h as confirmReauth, k as restoreVersion, v as getHistory, y as getPublished } from "./store-CG_wgU4l.mjs";
import { i as can } from "./permissions-B5x35gQ-.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { i as DevicePreview } from "./fields-C6he3K7U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.publish-DuiprMyd.js
var import_jsx_runtime = require_jsx_runtime();
function useDirty() {
	const s = useAdmin();
	const pub = getPublished();
	if (!pub) return true;
	const { publishedAt: _a, ...cur } = siteConfig(s);
	const { publishedAt: _b, ...old } = pub;
	return JSON.stringify(cur) !== JSON.stringify(old);
}
function PublishPage() {
	useAdmin();
	const pub = getPublished();
	const dirty = useDirty();
	const hist = getHistory();
	const mayPublish = can(getSession()?.role, "site.publish");
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Preview & publish" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [
					pub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger",
						disabled: !mayPublish,
						onClick: async () => {
							if (!mayPublish) return;
							if (confirm("Remove all published admin overrides and return the store to the original site?") && await confirmReauth("unpublish all overrides")) {
								unpublishAll();
								logAuthEvent("site_unpublish");
							}
						},
						children: "Revert live store to original"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost",
						disabled: !dirty || !pub || !mayPublish,
						onClick: () => {
							if (!mayPublish) return;
							if (confirm("Throw away all changes since the last publish?")) {
								discardDraft();
								logAuthEvent("site_discard");
							}
						},
						children: "Discard draft"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn",
						disabled: !dirty || !mayPublish,
						onClick: () => {
							if (!mayPublish) return;
							publish();
							logAuthEvent("site_publish");
						},
						children: "Publish to store"
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `adm-banner ${dirty ? "warning" : "success"}`,
			style: { marginBottom: 16 },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: { flex: 1 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontWeight: 600,
							fontSize: 14
						},
						children: dirty ? "Unpublished changes pending" : "Storefront is up to date"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 13,
							marginTop: 4,
							opacity: .9
						},
						children: dirty ? "You have modified store configurations in the admin panel. The public storefront currently serves the last published release until you click 'Publish to store'." : "The live storefront is currently serving all your latest configurations, products, and styles."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 12,
							marginTop: 6,
							opacity: .8
						},
						children: ["Last published: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: pub ? new Date(pub.publishedAt).toLocaleString() : "Never (serving original baseline)" })]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/home.html",
				target: "_blank",
				rel: "noreferrer",
				className: "adm-btn ghost sm",
				style: { alignSelf: "center" },
				children: "View live store ↗"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Draft preview (real store pages)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicePreview, { url: "/home.html" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Published versions",
			children: hist.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Published" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: hist.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [new Date(h.at).toLocaleString(), i === 0 && " (current)"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				style: { textAlign: "right" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn ghost sm",
					disabled: !mayPublish,
					onClick: () => {
						if (!mayPublish) return;
						if (confirm("Load this version into the draft? Publish afterwards to make it live.")) {
							restoreVersion(i);
							logAuthEvent("site_restore");
						}
					},
					children: "Restore to draft"
				})
			})] }, h.at)) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No versions yet. Each publish saves one here (last 10)." })
		})
	] });
}
//#endregion
export { PublishPage as component, useDirty };
