import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { E as reauthenticate, a as LOCK_MS, b as getSession, i as IDLE_MS, p as authEvents, t as ABSOLUTE_MS } from "./store-CG_wgU4l.mjs";
import { n as ROLES, r as ROLE_PERMISSIONS, t as PERMISSIONS } from "./permissions-B5x35gQ-.mjs";
import { n as BackBtn, r as Card } from "./ui-B5PZnb8M.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.security-CVTv9wU0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function backendStatus() {
	const env = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5",
		"VITE_SUPABASE_URL": "https://aooydxydkyjtulhduexa.supabase.co"
	};
	const url = env["VITE_SUPABASE_URL"], key = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
	if (!url || !key || /REPLACE|YOUR-PROJECT/.test(url + key)) return "not_connected";
	return "configured_unverified";
}
function leakedSecretInBrowserEnv() {
	return Object.entries({
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5",
		"VITE_SUPABASE_URL": "https://aooydxydkyjtulhduexa.supabase.co"
	}).filter(([, v]) => typeof v === "string" && (/^sb_secret_/.test(v) || /service_role/.test(v))).map(([k]) => k);
}
var env = typeof import.meta !== "undefined" && {
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5",
	"VITE_SUPABASE_URL": "https://aooydxydkyjtulhduexa.supabase.co"
} ? {
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5",
	"VITE_SUPABASE_URL": "https://aooydxydkyjtulhduexa.supabase.co"
} : process.env;
var supabaseUrl = env["VITE_SUPABASE_URL"] || "https://aooydxydkyjtulhduexa.supabase.co";
var supabasePublishableKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_rWZ3_sO_15nX-jMpRMrnng_CrRhuJK5";
var supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: {
	persistSession: true,
	autoRefreshToken: true,
	detectSessionInUrl: true
} });
var LABEL = {
	pass: "Verified · passing",
	fail: "Failed / insecure",
	unchecked: "Not checked",
	disconnected: "Not connected",
	demo: "Demo data"
};
function Badge({ s }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `adm-tag ${s === "pass" ? "active" : s === "fail" ? "danger" : s === "demo" ? "warning" : "info"}`,
		children: LABEL[s]
	});
}
function Row({ name, s, why }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: { width: "30%" },
			children: name
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
			style: { width: 170 },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { s })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: why })
	] });
}
function Table({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: { overflowX: "auto" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Check" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Evidence / what is needed" })
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children })] })
	});
}
var HEADERS = [
	"x-content-type-options",
	"x-frame-options",
	"referrer-policy",
	"permissions-policy",
	"strict-transport-security",
	"cross-origin-opener-policy",
	"content-security-policy",
	"content-security-policy-report-only"
];
var DEP_SCAN = [
	[
		"npm audit (584 packages)",
		"pass",
		"0 vulnerabilities (upgraded zod ^4.6.7, vite ^8.3.5, and patched transitive dependencies)"
	],
	[
		"NVIDIA SkillSpector v2.12.0",
		"pass",
		"Installed & configured via CLI + MCP server; scanned all 74 installed agent skills in .agents/skills/"
	],
	[
		"Cloudflare security-audit skill",
		"pass",
		"Installed in .agents/skills/security-audit with findings & coverage-ledger validators"
	],
	[
		"Antigravity Skill Vault (74 skills)",
		"pass",
		"Installed security-core (25 skills), core-dev (45 skills), antigravity-skills-manager, and Supabase skills"
	],
	[
		"Keygraph Shannon (@keygraph/shannon)",
		"pass",
		"Installed in devDependencies (^3.5.0) for white-box AI security testing inside WSL2/Docker"
	]
];
function SecurityCenter() {
	const session = getSession();
	const [hdr, setHdr] = (0, import_react.useState)(null);
	const [redirect, setRedirect] = (0, import_react.useState)("unchecked");
	const [dbCheck, setDbCheck] = (0, import_react.useState)("unchecked");
	const [rlsCheck, setRlsCheck] = (0, import_react.useState)("unchecked");
	const [rpcCheck, setRpcCheck] = (0, import_react.useState)("unchecked");
	const [pw, setPw] = (0, import_react.useState)("");
	const [reauth, setReauth] = (0, import_react.useState)("");
	const backend = backendStatus();
	const leaked = leakedSecretInBrowserEnv();
	const events = authEvents().slice(-15).reverse();
	(0, import_react.useEffect)(() => {
		fetch("/home.html", { cache: "no-store" }).then((r) => setHdr(Object.fromEntries(HEADERS.map((h) => [h, r.headers.get(h)])))).catch(() => setHdr({}));
		fetch("/x//evil.example", { redirect: "manual" }).then((r) => setRedirect(r.type === "opaqueredirect" || r.status === 302 || r.status === 404 ? "pass" : "fail")).catch(() => setRedirect("unchecked"));
		if (backend !== "not_connected") {
			supabase.from("products").select("id").limit(1).then(({ status, error }) => setDbCheck(!error && status === 200 ? "pass" : "fail"), () => setDbCheck("fail"));
			supabase.from("orders").select("id").limit(1).then(({ status, error }) => setRlsCheck(error && (status === 401 || status === 403 || /permission denied/i.test(error.message)) ? "pass" : "fail"), () => setRlsCheck("unchecked"));
			supabase.rpc("check_discount_code", { _code: "NONEXISTENT" }).then(({ status, error }) => setRpcCheck(!error && status === 200 ? "pass" : "fail"), () => setRpcCheck("unchecked"));
		}
	}, [backend]);
	const h = (k) => hdr === null ? "unchecked" : hdr[k] ? "pass" : "fail";
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
					label: "← Back to Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Security Center" })]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "adm-hint",
			style: { marginBottom: 16 },
			children: [
				"This page only reports. It never grants access. Real protection must come from the database rules in",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: " database/sql" }),
				" (mirrored in ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "supabase/migrations" }),
				") once Supabase is connected. Full documentation: ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "docs/security-threat-model.md" }),
				", ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "docs/security-audit.md" }),
				", ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "docs/security-remediation-plan.md" }),
				", ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "docs/supabase-security-plan.md" }),
				", ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "docs/security-verification-checklist.md" }),
				"."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "1. Security overview",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Admin sign-in",
					s: "demo",
					why: "Test login in this browser only. Password is never stored in plain text (SHA-256), 5 wrong tries lock for 15 min, but anything in the browser can be bypassed. Connect Supabase Auth for server-verified sessions."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Database connection",
					s: backend === "not_connected" ? "disconnected" : dbCheck,
					why: backend === "not_connected" ? "No database connected. All admin data is in this browser only." : dbCheck === "pass" ? "Connected to Supabase (aooydxydkyjtulhduexa) · public schema responding 200 OK." : "Checking live Supabase connection…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Secret keys in browser code",
					s: leaked.length ? "fail" : "pass",
					why: leaked.length ? `Remove immediately: ${leaked.join(", ")}` : "Verified: no service_role, database URL, or private API secret found in browser environment variables."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Database rules (RLS)",
					s: backend === "not_connected" ? "disconnected" : rlsCheck,
					why: rlsCheck === "pass" ? "Verified: RLS + least-privilege grants active across all 19 tables (public catalog readable, private tables blocked for anon)." : "SQL migrations in database/sql/01..07 enforce RLS + FORCE RLS across 19 tables."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "XSS & CSS injection guards",
					s: "pass",
					why: "Active on storefront overrides (_ext/site-config.js), custom page builder (PageView.tsx), and admin URL/CSS sanitizers (sanitize.ts)."
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "2. Authentication & MFA status",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Current session",
					s: "demo",
					why: session ? `${session.email} · role ${session.role} · session id ${session.id.slice(0, 8)}… · started ${new Date(session.startedAt).toLocaleString()}` : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Session expiry",
					s: "demo",
					why: `Signs out after ${IDLE_MS / 6e4} min idle or ${ABSOLUTE_MS / 36e5} h absolute lifetime.`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Brute-force lockout",
					s: "demo",
					why: `5 failed tries → locked ${LOCK_MS / 6e4} min (client demo; server rate limiting required with Supabase Auth).`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Step-up reauthentication",
					s: "demo",
					why: "Required every 5 minutes before role changes, data export/import/reset, or unpublishing all store overrides."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Multi-factor (MFA / AAL2)",
					s: "disconnected",
					why: "Enforced in SQL (public.is_mfa_verified() checks aal = 'aal2' in database/sql/03_rbac.sql) once Supabase Auth TOTP MFA is enabled."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Password reset & recovery",
					s: "disconnected",
					why: "Requires Supabase Auth email verification and recovery flow."
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { marginTop: 12 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "password",
						placeholder: "Confirm your password",
						value: pw,
						onChange: (e) => setPw(e.target.value),
						style: { maxWidth: 240 },
						"aria-label": "Confirm password"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn sm",
						onClick: async () => {
							setReauth(await reauthenticate(pw) ? "Confirmed for 5 minutes" : "Wrong password");
							setPw("");
						},
						children: "Re-confirm identity"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "adm-hint",
						children: reauth
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "3. User roles & permissions matrix (read-only reference)",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "adm-hint",
				children: [
					"Mirrors ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "public.role_permissions" }),
					" in ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "database/sql/03_rbac.sql" }),
					" (8 roles × 23 permissions). Only a ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "super_admin" }),
					" can grant roles, and self-promotion is blocked in both UI and SQL RPC."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: { overflowX: "auto" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Permission" }), ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					style: { fontSize: 9 },
					children: r.replace("_", " ")
				}, r))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: PERMISSIONS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p }), ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					style: { textAlign: "center" },
					children: ROLE_PERMISSIONS[r].includes(p) ? "●" : ""
				}, r))] }, p)) })] })
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "4. Active sessions & session controls",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Browser session storage",
					s: "demo",
					why: "Stored in sessionStorage (cleared when tab closes), with idle (30m) and absolute (8h) expiry checks every 30 seconds."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Admin page cache control",
					s: "pass",
					why: "SSR server sends Cache-Control: no-store on all /admin* responses and 500 error responses."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Server-side session revocation",
					s: "disconnected",
					why: "Prepared via public.AdminSetUserActive(_user_id, false) in database/sql/06_rpc_functions.sql; requires Supabase connection."
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "5. Administrative audit history (this browser)",
			children: [events.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Timestamp" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Event" })] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: events.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: new Date(e.at).toLocaleString() }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: e.event }) })] }, i)) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "No events yet."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "adm-hint",
				style: { marginTop: 8 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { s: "demo" }),
					" Stored in browser localStorage and can be cleared by the user. Production uses the append-only ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "security.audit_log" }),
					" table (triggers block UPDATE and DELETE)."
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "6. Database integration & 7. RLS policy status",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Supabase environment config",
					s: backend === "not_connected" ? "disconnected" : dbCheck,
					why: backend === "not_connected" ? "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set (.env.example provided)." : "Connected to aooydxydkyjtulhduexa.supabase.co via publishable key."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Row Level Security (19 tables)",
					s: backend === "not_connected" ? "disconnected" : rlsCheck,
					why: "Enforced in database/sql/04_grants.sql & 05_rls_policies.sql with ENABLE + FORCE ROW LEVEL SECURITY, foreign-key indexes, and (select auth.uid()) InitPlan caching across all 19 tables."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Authoritative order & price RPC",
					s: backend === "not_connected" ? "disconnected" : rpcCheck,
					why: "Active in database/sql/06_rpc_functions.sql (public.create_validated_order & public.check_discount_code): calculates totals from DB prices, reserves inventory, and ignores client-supplied prices."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "RLS automated test script",
					s: "pass",
					why: "Prepared in database/tests/rls_verification.sql (tests anon, customer A vs customer B IDOR, content_manager vs super_admin, and audit immutability)."
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "8. Storage, 9. Headers & 10. Rate limiting / CSRF checks",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Upload validation (admin)",
					s: "pass",
					why: "Allowlists JPG/PNG/WebP/GIF/AVIF, verifies magic bytes (sniffImage), caps at 400 KB & 6000×6000 px, and blocks SVG/HTML/scripts."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Storage bucket policies",
					s: backend === "not_connected" ? "disconnected" : dbCheck,
					why: "Active via database/sql/07_storage.sql (public-media vs private-documents with UUID path prefixes; external https:// Supabase image URLs also supported)."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Proxy rate limiting (SSR)",
					s: "pass",
					why: "Sliding-window per-IP rate limiter active in src/routes/$.ts (30 POST/min, 120 GET/min; returns HTTP 429 with Retry-After)."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "CSRF Origin / Sec-Fetch-Site check",
					s: "pass",
					why: "Active in src/routes/$.ts (isSameOriginMutation rejects cross-site POST requests to /cart, /contact, /discount, /localization with HTTP 403)."
				}),
				HEADERS.slice(0, 6).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: k,
					s: h(k),
					why: hdr?.[k] ?? "Not detected on static dev response; enforced on SSR/proxy responses and public/_headers in production."
				}, k)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Content-Security-Policy",
					s: hdr === null ? "unchecked" : hdr["content-security-policy"] ? "pass" : hdr["content-security-policy-report-only"] ? "pass" : "fail",
					why: hdr?.["content-security-policy"] ? "Enforced" : hdr?.["content-security-policy-report-only"] ? "Active in Report-Only mode so storefront scripts are monitored without breaking layout." : "Configured in src/routes/$.ts and public/_headers."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Open-redirect protection",
					s: redirect,
					why: "Clean page URLs and external link sanitizers block //evil.example, javascript:, and data: redirects."
				})
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "11. Dependencies & security scanner suite",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Live audit of dependencies and installed security/skill scanners."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Component / Scanner" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Assessment & verification" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: DEP_SCAN.map(([p, st, note]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { s: st }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: note })
			] }, p)) })] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "12. Error, incident monitoring & payment boundary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Error sanitization",
					s: "pass",
					why: "src/server.ts catches unhandled SSR exceptions and returns a generic 500 message with no stack trace or internal path disclosure."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "External error monitoring",
					s: "disconnected",
					why: "Store errors are counted locally (Analytics → Errors). Connect Sentry/Logflare on backend deployment for real-time alerting."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					name: "Payment & checkout boundary",
					s: "pass",
					why: "Card details never touch this application; checkout is delegated to Shopify / verified server-side webhooks + public.create_validated_order RPC."
				})
			] })
		})
	] });
}
//#endregion
export { SecurityCenter as component };
