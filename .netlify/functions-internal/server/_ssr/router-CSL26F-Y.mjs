import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react, t as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { K as redirect, S as useRouter, _ as lazyRouteComponent, b as Link, d as Scripts, f as HeadContent, g as Outlet, h as createRouter, v as createFileRoute, y as createRootRouteWithContext } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route$24 } from "./ssr.mjs";
import { t as Route$25 } from "./admin.publish-BU60qEQT.mjs";
import { t as Route$26 } from "./admin.analytics._report-8i9mBagu.mjs";
import { t as Route$27 } from "./admin.m._module-CKNaGV2S.mjs";
import { t as Route$28 } from "./admin.website_._id-DgQ_xePp.mjs";
import { t as Route$29 } from "./admin.products_._handle-v6t-Uy0N.mjs";
import { t as Route$30 } from "./p._slug-DGuu_Tga.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CSL26F-Y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-juQ-CeC8.css";
/**
* Application runtime error reporter.
* Safely logs boundary-caught errors in development and staging.
*/
function describeThrown(error) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}
function reportAppError(error, context = {}) {
	if (typeof window === "undefined") return;
	console.error("[AnnR App Error]", describeThrown(error), {
		route: window.location.pathname,
		...context
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportAppError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$23 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "AnnR | Streetwear Clothing & Fashion Online Store" },
			{
				name: "description",
				content: "Shop AnnR streetwear online for hoodies, tees, jackets, bottoms, and accessories."
			},
			{
				name: "author",
				content: "Ratul"
			},
			{
				property: "og:title",
				content: "AnnR | Streetwear Clothing & Fashion Online Store"
			},
			{
				property: "og:description",
				content: "Shop AnnR streetwear online for hoodies, tees, jackets, bottoms, and accessories."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@AnnR"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "alternate icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "apple-touch-icon",
				href: "/favicon.png"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$23.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
var Route$22 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "AnnR | Streetwear Clothing & Fashion Online Store" },
		{
			name: "description",
			content: "Shop AnnR streetwear: hoodies, tees, jackets, bottoms and accessories."
		},
		{
			property: "og:title",
			content: "AnnR | Streetwear Clothing & Fashion"
		},
		{
			property: "og:description",
			content: "Shop AnnR streetwear: hoodies, tees, jackets, bottoms and accessories."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	beforeLoad: () => {
		throw redirect({ href: "/home.html" });
	}
});
var admin_default = "/assets/admin-BF_MRVw0.css";
var $$splitComponentImporter$21 = () => import("./admin-CezvOdsM.mjs");
var FONTS = [
	"Druk-Wide",
	"NB-Architekt",
	"FKGroteskSemiMono"
].map((f) => ({
	rel: "stylesheet",
	href: `/cdn/shop/t/75/assets/${f}.css`
}));
var Route$21 = createFileRoute("/admin")({
	head: () => ({
		meta: [
			{ title: "AnnR Admin" },
			{
				name: "description",
				content: "AnnR store admin panel."
			},
			{
				property: "og:title",
				content: "AnnR Admin"
			},
			{
				property: "og:description",
				content: "AnnR store admin panel."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			},
			{
				name: "robots",
				content: "noindex"
			}
		],
		links: [
			...FONTS,
			{
				rel: "stylesheet",
				href: admin_default
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "alternate icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "apple-touch-icon",
				href: "/favicon.png"
			}
		]
	}),
	component: lazyRouteComponent($$splitComponentImporter$21, "component")
});
var $$splitComponentImporter$20 = () => import("./admin.index-CvoaWe2B.mjs");
var Route$20 = createFileRoute("/admin/")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./admin.activity-BS2bdp_J.mjs");
var Route$19 = createFileRoute("/admin/activity")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
var $$splitComponentImporter$18 = () => import("./admin.collections-CwVRQ6L1.mjs");
var Route$18 = createFileRoute("/admin/collections")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./admin.content-DvXAe9YD.mjs");
var Route$17 = createFileRoute("/admin/content")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./admin.customers-DdzWgdZV.mjs");
var Route$16 = createFileRoute("/admin/customers")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./admin.discounts-CwRZzEbv.mjs");
var Route$15 = createFileRoute("/admin/discounts")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./admin.events-D1Rgyu6Q.mjs");
var Route$14 = createFileRoute("/admin/events")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./admin.forms-CUVeMk7j.mjs");
var Route$13 = createFileRoute("/admin/forms")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./admin.integrations-DTCBMu0Q.mjs");
var Route$12 = createFileRoute("/admin/integrations")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./admin.media-DcUNUCGa.mjs");
var Route$11 = createFileRoute("/admin/media")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./admin.navigation-BjSN5AeF.mjs");
var Route$10 = createFileRoute("/admin/navigation")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./admin.orders-y2qNXcg7.mjs");
var Route$9 = createFileRoute("/admin/orders")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./admin.pages-2kFLcwm2.mjs");
var Route$8 = createFileRoute("/admin/pages")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./admin.products-DZYaIgW7.mjs");
var Route$7 = createFileRoute("/admin/products")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./admin.sections-BpWW9Fce.mjs");
var Route$6 = createFileRoute("/admin/sections")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./admin.security-xj9L_hY7.mjs");
var Route$5 = createFileRoute("/admin/security")({
	head: () => ({ meta: [{ title: "Security Center · AnnR Admin" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./admin.seo-CbKFEvMR.mjs");
var Route$4 = createFileRoute("/admin/seo")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./admin.settings-mCpcBGmX.mjs");
var Route$3 = createFileRoute("/admin/settings")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./admin.theme-DSEuE4Gx.mjs");
var Route$2 = createFileRoute("/admin/theme")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./admin.users-CO89lzla.mjs");
var Route$1 = createFileRoute("/admin/users")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./admin.website-D7DoI-qQ.mjs");
var Route = createFileRoute("/admin/website")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var IndexRoute = Route$22.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$23
});
var SplatRoute = Route$24.update({
	id: "/$",
	path: "/$",
	getParentRoute: () => Route$23
});
var AdminRoute = Route$21.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$23
});
var AdminIndexRoute = Route$20.update({
	id: "/",
	path: "/",
	getParentRoute: () => AdminRoute
});
var AdminActivityRoute = Route$19.update({
	id: "/activity",
	path: "/activity",
	getParentRoute: () => AdminRoute
});
var AdminCollectionsRoute = Route$18.update({
	id: "/collections",
	path: "/collections",
	getParentRoute: () => AdminRoute
});
var AdminContentRoute = Route$17.update({
	id: "/content",
	path: "/content",
	getParentRoute: () => AdminRoute
});
var AdminCustomersRoute = Route$16.update({
	id: "/customers",
	path: "/customers",
	getParentRoute: () => AdminRoute
});
var AdminDiscountsRoute = Route$15.update({
	id: "/discounts",
	path: "/discounts",
	getParentRoute: () => AdminRoute
});
var AdminEventsRoute = Route$14.update({
	id: "/events",
	path: "/events",
	getParentRoute: () => AdminRoute
});
var AdminFormsRoute = Route$13.update({
	id: "/forms",
	path: "/forms",
	getParentRoute: () => AdminRoute
});
var AdminIntegrationsRoute = Route$12.update({
	id: "/integrations",
	path: "/integrations",
	getParentRoute: () => AdminRoute
});
var AdminMediaRoute = Route$11.update({
	id: "/media",
	path: "/media",
	getParentRoute: () => AdminRoute
});
var AdminNavigationRoute = Route$10.update({
	id: "/navigation",
	path: "/navigation",
	getParentRoute: () => AdminRoute
});
var AdminOrdersRoute = Route$9.update({
	id: "/orders",
	path: "/orders",
	getParentRoute: () => AdminRoute
});
var AdminPagesRoute = Route$8.update({
	id: "/pages",
	path: "/pages",
	getParentRoute: () => AdminRoute
});
var AdminProductsRoute = Route$7.update({
	id: "/products",
	path: "/products",
	getParentRoute: () => AdminRoute
});
var AdminPublishRoute = Route$25.update({
	id: "/publish",
	path: "/publish",
	getParentRoute: () => AdminRoute
});
var AdminSectionsRoute = Route$6.update({
	id: "/sections",
	path: "/sections",
	getParentRoute: () => AdminRoute
});
var AdminSecurityRoute = Route$5.update({
	id: "/security",
	path: "/security",
	getParentRoute: () => AdminRoute
});
var AdminSeoRoute = Route$4.update({
	id: "/seo",
	path: "/seo",
	getParentRoute: () => AdminRoute
});
var AdminSettingsRoute = Route$3.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AdminRoute
});
var AdminThemeRoute = Route$2.update({
	id: "/theme",
	path: "/theme",
	getParentRoute: () => AdminRoute
});
var AdminUsersRoute = Route$1.update({
	id: "/users",
	path: "/users",
	getParentRoute: () => AdminRoute
});
var AdminWebsiteRoute = Route.update({
	id: "/website",
	path: "/website",
	getParentRoute: () => AdminRoute
});
var PSlugRoute = Route$30.update({
	id: "/p/$slug",
	path: "/p/$slug",
	getParentRoute: () => Route$23
});
var AdminRouteChildren = {
	AdminActivityRoute,
	AdminCollectionsRoute,
	AdminContentRoute,
	AdminCustomersRoute,
	AdminDiscountsRoute,
	AdminEventsRoute,
	AdminFormsRoute,
	AdminIntegrationsRoute,
	AdminMediaRoute,
	AdminNavigationRoute,
	AdminOrdersRoute,
	AdminPagesRoute,
	AdminProductsRoute,
	AdminPublishRoute,
	AdminSectionsRoute,
	AdminSecurityRoute,
	AdminSeoRoute,
	AdminSettingsRoute,
	AdminThemeRoute,
	AdminUsersRoute,
	AdminWebsiteRoute,
	AdminIndexRoute,
	AdminAnalyticsReportRoute: Route$26.update({
		id: "/analytics/$report",
		path: "/analytics/$report",
		getParentRoute: () => AdminRoute
	}),
	AdminMModuleRoute: Route$27.update({
		id: "/m/$module",
		path: "/m/$module",
		getParentRoute: () => AdminRoute
	}),
	AdminProductsHandleRoute: Route$29.update({
		id: "/products_/$handle",
		path: "/products/$handle",
		getParentRoute: () => AdminRoute
	}),
	AdminWebsiteIdRoute: Route$28.update({
		id: "/website_/$id",
		path: "/website/$id",
		getParentRoute: () => AdminRoute
	})
};
var rootRouteChildren = {
	IndexRoute,
	SplatRoute,
	AdminRoute: AdminRoute._addFileChildren(AdminRouteChildren),
	PSlugRoute
};
var routeTree = Route$23._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
