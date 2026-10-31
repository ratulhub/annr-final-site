import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { F as uid, L as useAdmin, b as getSession, g as dataSource, h as confirmReauth, j as setState } from "./store-CNEGzpjs.mjs";
import { a as canAssignRole, n as ROLES, r as ROLE_PERMISSIONS, t as PERMISSIONS } from "./permissions-B5x35gQ-.mjs";
import { n as NAV_GROUPS } from "./navigation-BwBMnIrm.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.users-CO89lzla.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PERM_KEY = "shihiko-role-permissions";
var AREAS = NAV_GROUPS.map((g) => g.group).filter((g) => g !== "Overview");
var defaults = () => Object.fromEntries(ROLES.map((r) => [r, Object.fromEntries(AREAS.map((a) => [a, r === "super_admin" || r === "admin" ? "edit" : r === "analytics_viewer" ? a === "Analytics" ? "view" : "none" : /Users|Security|Settings|Integrations/.test(a) ? "view" : "edit"]))]));
function Users() {
	const s = useAdmin();
	const session = getSession();
	const actorRole = session?.role ?? "super_admin";
	const actorEmail = (session?.email ?? "").toLowerCase();
	const [perms, setPerms] = (0, import_react.useState)(defaults);
	const [msg, setMsg] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const p = dataSource.read(PERM_KEY);
		if (p) setPerms({
			...defaults(),
			...p
		});
	}, []);
	const set = (role, area, v) => {
		const p = {
			...perms,
			[role]: {
				...perms[role],
				[area]: v
			}
		};
		setPerms(p);
		dataSource.write(PERM_KEY, p);
	};
	const emailOk = s.admins.every((a) => !a.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email));
	const updateAdmin = async (i, patch) => {
		const target = s.admins[i];
		if (!target) return;
		setMsg("");
		if (patch.role && patch.role !== target.role) {
			const isSelf = !!target.email && target.email.toLowerCase() === actorEmail;
			if (!canAssignRole(actorRole, actorEmail || "self", isSelf ? actorEmail || "self" : target.id)) {
				setMsg("Only a super_admin can assign roles, and nobody can change their own role.");
				return;
			}
			if (!await confirmReauth("change staff role")) return;
		}
		setState((x) => ({
			...x,
			admins: x.admins.map((a, j) => j === i ? {
				...a,
				...patch
			} : a)
		}));
	};
	const addAdmin = async () => {
		setMsg("");
		if (actorRole !== "super_admin") {
			setMsg("Only a super_admin can add staff accounts.");
			return;
		}
		if (!await confirmReauth("add a staff account")) return;
		setState((x) => ({
			...x,
			admins: [...x.admins, {
				id: uid(),
				name: "",
				email: "",
				role: "support_agent"
			}]
		}));
	};
	const removeAdmin = async (i) => {
		const target = s.admins[i];
		if (!target) return;
		setMsg("");
		if (target.email && target.email.toLowerCase() === actorEmail) {
			setMsg("You cannot remove your own account.");
			return;
		}
		if (!await confirmReauth("remove a staff account")) return;
		setState((x) => ({
			...x,
			admins: x.admins.filter((_, j) => j !== i)
		}));
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Users & permissions" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "adm-hint",
			children: [
				"Plan who can do what. Saved in this browser only — database enforcement lives in ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "database/sql/03_rbac.sql" }),
				" once a backend is connected."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Staff & admins",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { overflowX: "auto" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Name" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Email" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Role" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: s.admins.map((a, i) => {
						const isSelf = !!a.email && a.email.toLowerCase() === actorEmail;
						const roleValue = ROLES.includes(a.role) ? a.role : "super_admin";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: a.name,
								onChange: (e) => updateAdmin(i, { name: e.target.value }),
								placeholder: "Staff name"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: a.email,
								onChange: (e) => updateAdmin(i, { email: e.target.value }),
								placeholder: "staff@annr.com"
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: roleValue,
								disabled: isSelf,
								onChange: (e) => updateAdmin(i, { role: e.target.value }),
								"aria-label": `Role for ${a.name || a.email || "user"}`,
								children: ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: r,
									children: r
								}, r))
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn danger sm",
								disabled: isSelf,
								title: isSelf ? "Cannot remove your own account" : "Remove",
								onClick: () => removeAdmin(i),
								children: "✕"
							}) })
						] }, a.id);
					}) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "adm-row",
						style: { marginTop: 10 },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost",
							onClick: addAdmin,
							children: "+ Add"
						})
					})]
				}),
				!emailOk && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-err",
					style: { marginTop: 8 },
					children: "One of the emails is not valid."
				}),
				msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-err",
					style: { marginTop: 8 },
					children: msg
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Role permissions",
			action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn ghost sm",
				onClick: () => confirm("Reset permissions to defaults?") && (setPerms(defaults()), dataSource.clear(PERM_KEY)),
				children: "Reset"
			}),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: { overflowX: "auto" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Area" }), ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { fontSize: 9 },
					children: r.replace("_", " ")
				}, r))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: AREAS.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a }), ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: perms[r]?.[a] || "none",
					disabled: r === "super_admin",
					onChange: (e) => set(r, a, e.target.value),
					"aria-label": `${r} ${a}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "none",
							children: "No access"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "view",
							children: "View"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "edit",
							children: "Edit"
						})
					]
				}) }, r))] }, a)) })] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "adm-hint",
				children: [
					"super_admin always has full access (",
					PERMISSIONS.length,
					" permissions in ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "public.role_permissions" }),
					"; ",
					ROLE_PERMISSIONS.admin.length,
					" for admin)."
				]
			})]
		})
	] });
}
//#endregion
export { Users as component };
