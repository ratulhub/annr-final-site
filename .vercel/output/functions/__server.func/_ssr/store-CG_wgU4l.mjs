import { i as __toESM } from "../_runtime.mjs";
import { r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { n as catalog_default } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-CG_wgU4l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var dataSource = {
	read(key) {
		if (typeof localStorage === "undefined") return null;
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	},
	write(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	},
	clear(key) {
		localStorage.removeItem(key);
	}
};
var sec = (key, label, type) => ({
	key,
	label,
	type,
	visible: true,
	padTop: "",
	padBottom: "",
	background: "",
	align: "",
	width: "",
	device: "all"
});
var TEMPLATES = {
	home: {
		label: "Home page",
		sample: "/home.html",
		sections: [
			sec("main-header", "Header", "header"),
			sec("home_hero_carousel_Wg4Rrh", "Hero carousel (video)", "hero"),
			sec("product_carousel_showcase_VzeMj3", "Product carousel", "products"),
			sec("parallax_YwdY8c", "Parallax banner 1", "banner"),
			sec("parallax_c4QGdG", "Parallax banner 2", "banner"),
			sec("parallax_WzmhjH", "Parallax banner 3", "banner"),
			sec("parallax_Jdmgiy", "Parallax banner 4", "banner"),
			sec("main-footer", "Footer", "footer")
		]
	},
	product: {
		label: "Product pages (all 93)",
		sample: "/products/aka-manto-longsleeve/index.html",
		sections: [
			sec("main-header", "Header", "header"),
			sec("template-product", "Product details", "product"),
			sec("175338351149468287", "Size / info block", "text"),
			sec("product-reviews", "Reviews", "reviews"),
			sec("product-recommendation", "You may also like", "products"),
			sec("delivery_dynamic_t_new_JqMwnG", "Delivery info", "text"),
			sec("product-recently-viewed", "Recently viewed", "products"),
			sec("main-footer", "Footer", "footer")
		]
	},
	collection: {
		label: "Collection pages (all 22)",
		sample: "/collections/all/index.html",
		sections: [
			sec("main-header", "Header", "header"),
			sec("collection_hero", "Collection hero", "hero"),
			sec("collection_story_cta_bTzknC", "Story / call to action", "cta"),
			sec("template-collection", "Product grid", "products"),
			sec("main-footer", "Footer", "footer")
		]
	},
	page: {
		label: "Info pages (FAQ, policies)",
		sample: "/pages/faq/index.html",
		sections: [
			sec("main-header", "Header", "header"),
			sec("template-faq", "Page content", "text"),
			sec("main-footer", "Footer", "footer")
		]
	},
	search: {
		label: "Search results page",
		sample: "/search/index.html",
		sections: [
			sec("main-header", "Header", "header"),
			sec("search-results", "Search filter & product grid", "products"),
			sec("main-footer", "Footer", "footer")
		]
	}
};
var SECTION_KINDS = {
	text: "Text block",
	image: "Image banner",
	cta: "Call to action",
	gift_banner: "Gift & campaign banner",
	countdown: "Launch / event countdown",
	products: "Featured products showcase"
};
var BLOCKS = {
	heading: {
		label: "Heading",
		blank: () => ({
			type: "heading",
			text: "New heading",
			level: "h2",
			align: "left"
		}),
		validate: (b) => b.text.trim() ? null : "Heading text is required"
	},
	text: {
		label: "Paragraph",
		blank: () => ({
			type: "text",
			text: "",
			align: "left"
		}),
		validate: () => null
	},
	image: {
		label: "Image",
		blank: () => ({
			type: "image",
			url: "",
			alt: "",
			caption: ""
		}),
		validate: (b) => !b.url ? "Choose an image" : !b.alt ? "Alt text is required" : null
	},
	button: {
		label: "Button",
		blank: () => ({
			type: "button",
			label: "Shop now",
			url: "/collections/all/index.html"
		}),
		validate: (b) => !b.label ? "Button label is required" : !/^(\/|https?:\/\/|mailto:)/.test(b.url) ? "Link must start with /, https:// or mailto:" : null
	},
	faq: {
		label: "FAQ list",
		blank: () => ({
			type: "faq",
			items: []
		}),
		validate: () => null
	},
	products: {
		label: "Product grid",
		blank: () => ({
			type: "products",
			title: "Featured",
			handles: "",
			limit: "4"
		}),
		validate: (b) => Number(b.limit) > 0 && Number(b.limit) <= 24 ? null : "Show 1–24 products"
	},
	gallery: {
		label: "Image gallery",
		blank: () => ({
			type: "gallery",
			images: "",
			columns: "3"
		}),
		validate: () => null
	},
	spacer: {
		label: "Spacer",
		blank: () => ({
			type: "spacer",
			size: "40"
		}),
		validate: () => null
	}
};
var FONT_OPTIONS = [
	"",
	"Druk Wide",
	"NB Architekt Std",
	"FK Grotesk SemiMono",
	"Arial",
	"Georgia"
];
var SPACING = [
	"",
	"0",
	"16px",
	"32px",
	"48px",
	"64px",
	"96px",
	"128px"
];
var SCALE = [
	"",
	"90%",
	"100%",
	"110%",
	"120%"
];
var RADIUS = [
	"",
	"0",
	"2px",
	"4px",
	"8px",
	"999px"
];
var WIDTHS = [
	"",
	"1200px",
	"1440px",
	"1600px",
	"100%"
];
var SCOPES = [
	"all",
	"home",
	"product",
	"collection",
	"page",
	"search"
];
var id = () => Math.random().toString(36).slice(2, 9);
var link = (label, url, newTab = false) => ({
	id: id(),
	label,
	url,
	newTab,
	visible: true
});
function siteDefaults() {
	const sections = {};
	for (const [k, t] of Object.entries(TEMPLATES)) sections[k] = t.sections.map((s) => ({ ...s }));
	return {
		general: {
			siteName: "AnnR",
			tagline: "",
			description: "",
			logoUrl: "",
			logoAlt: "AnnR",
			secondaryLogo: "",
			favicon: "",
			contactEmail: "support@annr.com",
			contactLabel: "CONTACT US:",
			phone: "",
			address: "",
			locale: "en",
			timezone: "Asia/Dhaka",
			copyright: "COPYRIGHT © 2026 AnnR, Inc. ALL RIGHTS RESERVED."
		},
		design: {
			background: "",
			text: "",
			accent: "",
			buttonBg: "",
			buttonText: "",
			headingFont: "",
			bodyFont: "",
			fontScale: "",
			buttonRadius: "",
			inputRadius: "",
			containerWidth: "",
			headerBg: "",
			headerText: "",
			footerBg: "",
			footerText: "",
			mode: "light"
		},
		header: {
			items: [
				{
					...link("New In", "/collections/all/index.html?sort_by=created-descending"),
					original: 0,
					device: "all"
				},
				{
					...link("Shop", ""),
					original: 1,
					device: "all"
				},
				{
					...link("Collections", ""),
					original: 2,
					device: "all"
				}
			],
			showVip: true,
			showCart: true,
			ctaLabel: "",
			ctaUrl: "",
			sticky: true
		},
		footer: {
			columns: [
				{
					id: id(),
					title: "NAVIGATION:",
					visible: true,
					links: [
						link("shop", "/collections/all/index.html"),
						link("drop", "/home.html"),
						link("FAQ", "/pages/faq/index.html")
					]
				},
				{
					id: id(),
					title: "INFO:",
					visible: true,
					links: [
						link("Legal & Privacy", "/pages/legal-privacy/index.html"),
						link("Shipping", "/pages/shipping-policy/index.html"),
						link("Returns", "/pages/return-policy/index.html")
					]
				},
				{
					id: id(),
					title: "SOCIAL:",
					visible: true,
					links: [
						link("INSTAGRAM", "https://www.instagram.com/annrclo/", true),
						link("FACEBOOK", "https://www.facebook.com/shopannr/", true),
						link("TIKTOK", "https://www.tiktok.com/@annr.com", true),
						link("discord", "https://discord.com/invite/annr", true)
					]
				}
			],
			showSubscribe: true,
			showEmail: true,
			showPayments: true
		},
		announcement: {
			on: false,
			text: "",
			url: "",
			background: "#000000",
			color: "#ffffff",
			device: "all"
		},
		popup: {
			on: false,
			title: "",
			text: "",
			button: "",
			url: "",
			delaySec: "3",
			showOnce: true
		},
		cookie: {
			on: false,
			text: "We use cookies to improve your experience.",
			button: "OK",
			policyUrl: "/pages/legal-privacy/index.html"
		},
		sections,
		texts: [],
		images: [],
		media: catalog_default.products.filter((p) => p.image).map((p) => ({
			id: id(),
			name: p.title,
			url: p.image,
			alt: p.title,
			caption: "",
			type: "image",
			size: 0,
			source: "store",
			addedAt: ""
		})),
		forms: [
			{
				id: "newsletter",
				name: "Newsletter (footer)",
				where: "Every page footer",
				title: "STAY CONNECTED",
				button: "subscribe",
				success: "",
				error: "",
				consent: "",
				fields: [{
					id: id(),
					key: "email",
					label: "Email",
					placeholder: "enter your e-mail",
					required: true,
					enabled: true
				}]
			},
			{
				id: "vip-login",
				name: "VIP login",
				where: "/account/login",
				title: "",
				button: "",
				success: "",
				error: "",
				consent: "",
				fields: [{
					id: id(),
					key: "email",
					label: "Email",
					placeholder: "",
					required: true,
					enabled: true
				}, {
					id: id(),
					key: "password",
					label: "Password",
					placeholder: "",
					required: true,
					enabled: true
				}]
			},
			{
				id: "vip-register",
				name: "VIP signup",
				where: "/account/register",
				title: "",
				button: "",
				success: "",
				error: "",
				consent: "",
				fields: []
			},
			{
				id: "search",
				name: "Search",
				where: "Header search",
				title: "",
				button: "",
				success: "",
				error: "",
				consent: "",
				fields: [{
					id: id(),
					key: "q",
					label: "Search",
					placeholder: "",
					required: false,
					enabled: true
				}]
			}
		],
		seo: {
			titlePattern: "",
			homeTitle: "",
			defaultDescription: "",
			ogImage: "",
			canonicalBase: "https://annr.com",
			noindex: false,
			robots: "User-agent: *\nAllow: /",
			structuredData: true
		},
		social: {
			instagram: "https://www.instagram.com/annrclo/",
			facebook: "https://www.facebook.com/shopannr/",
			tiktok: "https://www.tiktok.com/@annr.com",
			discord: "https://discord.com/invite/annr",
			youtube: "",
			x: ""
		},
		technical: {
			maintenance: false,
			maintenanceTitle: "AnnR",
			maintenanceText: "We'll be back soon",
			pageTransition: true,
			cartDrawer: true,
			productLabels: true,
			notFoundTitle: "Page not found",
			notFoundText: "",
			customCss: ""
		},
		integrations: [
			{
				id: "shopify",
				name: "Shopify (cart & checkout)",
				kind: "Commerce",
				status: "not connected",
				note: "Cart and checkout currently pass through to the live store."
			},
			{
				id: "analytics",
				name: "Analytics provider",
				kind: "Analytics",
				status: "not connected",
				note: "Planned for Part 3."
			},
			{
				id: "email",
				name: "Email service",
				kind: "Email",
				status: "not connected",
				note: "Needed before forms can send messages."
			},
			{
				id: "storage",
				name: "File storage",
				kind: "Storage",
				status: "not connected",
				note: "Uploads are kept in this browser only."
			},
			{
				id: "payments",
				name: "Payments",
				kind: "Payments",
				status: "not connected",
				note: "Handled by Shopify checkout today."
			}
		],
		hiddenPages: [],
		customPages: [],
		events: [{
			id: "gwp-launch",
			title: "AnnR Signature Free Gift Drop",
			type: "gift_with_purchase",
			status: "active",
			tag: "FREE GIFT",
			badgeText: "GIFT WITH PURCHASE",
			startsAt: "2026-10-01",
			endsAt: "2026-12-31",
			continuous: true,
			minSpend: "5000",
			targetCollection: "all",
			discountCode: "FREEGIFT",
			giftItem: "AnnR Classics White Socks Bundle",
			giftValue: "৳1,200",
			giftImage: "/cdn/shop/files/UWUSOCKS1.jpg",
			giftDescription: "Complimentary AnnR Classics 100% combed cotton socks bundle automatically qualified on all orders over ৳5,000.",
			showPdpPerk: true,
			showTopBar: false,
			topBarText: "🎁 SPECIAL OFFER: FREE ANNR SOCKS BUNDLE ON ALL ORDERS OVER ৳5,000 · LIMITED TIME",
			topBarUrl: "/collections/all/index.html",
			showTicker: false,
			tickerText: "ANNR GIFT CAMPAIGN · FREE SOCKS BUNDLE WITH ORDERS OVER ৳5,000 · WORLDWIDE SHIPPING · SHOP THE DROP",
			showFloatingGiftPill: true,
			pillText: "🎁 FREE GIFT WITH ৳5,000+",
			showCartReward: true,
			cartRewardMessage: "Add ৳{remaining} more to claim your FREE AnnR Gift!",
			bg: "#050505",
			textColor: "#ffffff",
			accentColor: "#e10600"
		}, {
			id: "event-capsule-drop",
			title: "AnnR Midnight Vault Capsule Drop",
			type: "event",
			status: "paused",
			tag: "LIMITED DROP",
			badgeText: "EXCLUSIVE EVENT",
			startsAt: "2026-11-01",
			endsAt: "2026-11-15",
			continuous: false,
			minSpend: "0",
			targetCollection: "vault",
			discountCode: "VAULT20",
			giftItem: "AnnR Collector Flight Tag",
			giftValue: "৳800",
			giftImage: "/cdn/shop/files/clocked-out-tamagotchi-flight-tag.jpg",
			giftDescription: "Limited edition vault release with exclusive collector flight tag for the first 100 orders.",
			showPdpPerk: false,
			showTopBar: false,
			topBarText: "⚡ MIDNIGHT VAULT CAPSULE DROP IS NOW LIVE · LIMITED QUANTITIES",
			topBarUrl: "/collections/vault/index.html",
			showTicker: false,
			tickerText: "ANNR VAULT CAPSULE DROP · ARCHIVED EDITIONS · STRICTLY LIMITED STOCK",
			showFloatingGiftPill: false,
			pillText: "⚡ Vault Drop Live",
			showCartReward: false,
			cartRewardMessage: "Vault order unlocked!",
			bg: "#111111",
			textColor: "#ffffff",
			accentColor: "#f3795b"
		}]
	};
}
var EXPECTED = "460e6ab9ee0bc8b560fff79423e933fb6a5873f77da9be0489273c0f4a3454cd";
var DEMO_ROLE = "super_admin";
var LOCK_MS = 9e5;
var IDLE_MS = 18e5;
var ABSOLUTE_MS = 288e5;
var SESSION_KEY = "shihiko-admin-session";
var LOCK_KEY = "shihiko-admin-lock";
async function sha256(text) {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function registerFailure(s, now) {
	const fails = s.until && now >= s.until ? 1 : s.fails + 1;
	return {
		fails,
		until: fails >= 5 ? now + LOCK_MS : 0
	};
}
var isLocked = (s, now) => s.until > now;
function sessionValid(s, now) {
	return !!s && now - s.lastSeen < 18e5 && now - s.startedAt < 288e5;
}
var read = (k, d) => {
	try {
		return JSON.parse(sessionStorage.getItem(k) || localStorage.getItem(k) || "null") ?? d;
	} catch {
		return d;
	}
};
function getLock() {
	return read(LOCK_KEY, {
		fails: 0,
		until: 0
	});
}
function getSession() {
	if (typeof window === "undefined") return null;
	const s = read(SESSION_KEY, null);
	if (!sessionValid(s, Date.now())) {
		sessionStorage.removeItem(SESSION_KEY);
		return null;
	}
	return s;
}
function touch() {
	const s = getSession();
	if (!s) return;
	sessionStorage.setItem(SESSION_KEY, JSON.stringify({
		...s,
		lastSeen: Date.now()
	}));
}
var GENERIC = "Wrong email or password";
async function login(email, password, expectedHash = EXPECTED) {
	const now = Date.now();
	const lock = getLock();
	if (isLocked(lock, now)) return {
		ok: false,
		error: `Too many attempts. Try again in ${Math.ceil((lock.until - now) / 6e4)} min.`
	};
	const e = email.trim().toLowerCase().slice(0, 254);
	if (!(await sha256(`${e}:${password.slice(0, 200)}`) === expectedHash)) {
		localStorage.setItem(LOCK_KEY, JSON.stringify(registerFailure(lock, now)));
		logAuthEvent("login_failed");
		return {
			ok: false,
			error: GENERIC
		};
	}
	localStorage.removeItem(LOCK_KEY);
	const s = {
		email: e,
		role: DEMO_ROLE,
		startedAt: now,
		lastSeen: now,
		reauthAt: now,
		id: crypto.randomUUID()
	};
	sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
	logAuthEvent("login_success");
	return { ok: true };
}
async function reauthenticate(password, expectedHash = EXPECTED) {
	const s = getSession();
	if (!s) return false;
	const ok = await sha256(`${s.email}:${password}`) === expectedHash;
	if (ok) sessionStorage.setItem(SESSION_KEY, JSON.stringify({
		...s,
		reauthAt: Date.now()
	}));
	logAuthEvent(ok ? "reauth_success" : "reauth_failed");
	return ok;
}
var recentlyReauthed = () => {
	const s = getSession();
	return !!s && Date.now() - s.reauthAt < 3e5;
};
async function confirmReauth(action = "continue") {
	if (recentlyReauthed()) return true;
	if (typeof window === "undefined") return false;
	const pw = window.prompt(`Confirm your admin password to ${action}:`);
	if (!pw) return false;
	const ok = await reauthenticate(pw);
	if (!ok) window.alert("Wrong password. Action cancelled.");
	return ok;
}
function logout() {
	sessionStorage.removeItem(SESSION_KEY);
	logAuthEvent("logout");
}
var AUTH_LOG = "shihiko-auth-events";
function logAuthEvent(event) {
	try {
		const l = JSON.parse(localStorage.getItem(AUTH_LOG) || "[]");
		l.push({
			at: (/* @__PURE__ */ new Date()).toISOString(),
			event
		});
		localStorage.setItem(AUTH_LOG, JSON.stringify(l.slice(-200)));
	} catch {}
}
function authEvents() {
	try {
		return JSON.parse(localStorage.getItem(AUTH_LOG) || "[]");
	} catch {
		return [];
	}
}
var KEY = "shihiko-admin-v1";
var uid = () => Math.random().toString(36).slice(2, 9);
function seed() {
	const sizes = [
		"S",
		"M",
		"L",
		"XL"
	];
	return {
		products: catalog_default.products.map((p) => ({
			handle: p.handle,
			title: p.title,
			description: p.description,
			price: p.price,
			compareAt: "",
			currency: p.currency,
			status: "active",
			vendor: "AnnR",
			type: "",
			tags: "",
			images: p.image ? [p.image] : [],
			variants: (p.sizes.length ? p.sizes : sizes).map((s) => ({
				id: uid(),
				option: s,
				sku: `${p.handle}-${s}`.toUpperCase(),
				price: p.price,
				stock: 10
			})),
			collections: [],
			seoTitle: p.title,
			seoDescription: p.description,
			weight: "0.5",
			badge: "",
			featured: false,
			trackStock: true,
			allowBackorder: false,
			sizeChart: ""
		})),
		collections: catalog_default.collections.map((c) => ({
			handle: c.handle,
			title: c.title,
			description: c.description,
			image: c.image,
			visible: true,
			sort: "manual",
			products: [],
			seoTitle: c.title,
			seoDescription: c.description
		})),
		pages: catalog_default.pages.map((p) => ({
			handle: p.handle,
			title: p.title,
			body: p.description,
			visible: true,
			seoTitle: p.title,
			seoDescription: p.description
		})),
		orders: [{
			id: "#1001",
			date: "2026-10-20",
			customer: "Arif Hasan",
			email: "arif@example.com",
			total: "8,600.00",
			status: "Unfulfilled",
			payment: "Paid",
			items: "Divine Sanctum Tee × 1",
			address: "Dhaka",
			note: ""
		}, {
			id: "#1002",
			date: "2026-10-22",
			customer: "Nadia Islam",
			email: "nadia@example.com",
			total: "19,600.00",
			status: "Fulfilled",
			payment: "Paid",
			items: "Aka Manto Longsleeve × 2",
			address: "Chattogram",
			note: ""
		}],
		customers: [{
			id: uid(),
			name: "Arif Hasan",
			email: "arif@example.com",
			phone: "+8801700000000",
			orders: 1,
			points: 86,
			tier: "Bronze",
			tags: "",
			blocked: false
		}, {
			id: uid(),
			name: "Nadia Islam",
			email: "nadia@example.com",
			phone: "+8801800000000",
			orders: 1,
			points: 196,
			tier: "Silver",
			tags: "vip",
			blocked: false
		}],
		discounts: [{
			id: uid(),
			code: "WELCOME10",
			type: "percentage",
			value: "10",
			minOrder: "0",
			uses: 0,
			limit: "",
			active: true,
			starts: "",
			ends: ""
		}],
		menus: {
			main: [{
				id: uid(),
				label: "NEW IN",
				url: "/collections/all/index.html"
			}, {
				id: uid(),
				label: "VAULT",
				url: "/collections/vault/index.html"
			}],
			footer: [{
				id: uid(),
				label: "FAQ",
				url: "/pages/faq/index.html"
			}, {
				id: uid(),
				label: "Shipping",
				url: "/pages/shipping-policy/index.html"
			}]
		},
		admins: [{
			id: uid(),
			name: "Ratul",
			email: "ratul123@gmail.com",
			role: "super_admin"
		}],
		theme: {
			primary: "#000000",
			background: "#ffffff",
			accent: "#e10600",
			text: "#000000",
			headingFont: "Druk Wide",
			bodyFont: "NB Architekt Std",
			monoFont: "FK Grotesk SemiMono",
			announcement: "FREE SHIPPING ON ORDERS OVER ৳5,000",
			announcementOn: true,
			logo: "/cdn/shop/t/75/assets/image_logo.svg",
			heroTitle: "ANNR",
			heroSubtitle: "",
			heroVideo: "",
			heroButton: "SHOP NOW",
			heroLink: "/collections/all/index.html",
			pageTransition: true,
			cartDrawer: true,
			freeGift: true,
			quickView: true,
			productsPerRow: "4",
			productsPerPage: "24"
		},
		settings: {
			storeName: "AnnR",
			email: "support@annr.com",
			phone: "",
			address: "Dhaka, Bangladesh",
			currency: "BDT",
			shippingDhaka: "80",
			shippingOutside: "150",
			freeShippingOver: "5000",
			taxRate: "0",
			codEnabled: true,
			instagram: "",
			facebook: "",
			tiktok: "",
			maintenance: false,
			checkoutUrl: "https://annr.com/checkout",
			metaTitle: "AnnR | Streetwear Clothing & Fashion Online Store",
			metaDescription: "",
			pointsPerTaka: "1"
		},
		activity: [],
		site: siteDefaults()
	};
}
var state = null;
var subs = /* @__PURE__ */ new Set();
function get() {
	if (!state) try {
		const raw = dataSource.read(KEY);
		const base = seed();
		state = raw ? {
			...base,
			...raw,
			site: {
				...base.site,
				...raw.site || {}
			}
		} : base;
	} catch {
		state = seed();
	}
	return state;
}
var label = (o) => String(o["title"] || o["name"] || o["code"] || o["label"] || o["id"] || o["handle"] || "item");
var keyOf = (o) => String(o["handle"] ?? o["id"] ?? "");
function diffList(section, a, b, out) {
	const am = new Map(a.map((x) => [keyOf(x), x])), bm = new Map(b.map((x) => [keyOf(x), x]));
	for (const [k, x] of bm) {
		const old = am.get(k);
		if (!old) {
			out.push({
				section,
				action: "added",
				item: label(x),
				fields: ""
			});
			continue;
		}
		if (old === x) continue;
		const f = Object.keys({
			...old,
			...x
		}).filter((f) => JSON.stringify(old[f]) !== JSON.stringify(x[f]));
		if (f.length) out.push({
			section,
			action: "updated",
			item: label(x),
			fields: f.join(", ")
		});
	}
	for (const [k, x] of am) if (!bm.has(k)) out.push({
		section,
		action: "deleted",
		item: label(x),
		fields: ""
	});
}
function diffStates(a, b) {
	const out = [];
	for (const sec of [
		"products",
		"collections",
		"pages",
		"orders",
		"customers",
		"discounts",
		"admins"
	]) if (a[sec] !== b[sec]) diffList(sec, a[sec] || [], b[sec] || [], out);
	if (a.site !== b.site) {
		for (const k of Object.keys({
			...a.site,
			...b.site
		})) if (JSON.stringify(a.site?.[k]) !== JSON.stringify(b.site?.[k])) out.push({
			section: "website",
			action: "updated",
			item: k,
			fields: "draft"
		});
	}
	if (a.menus !== b.menus) {
		for (const m of /* @__PURE__ */ new Set([...Object.keys(a.menus || {}), ...Object.keys(b.menus || {})])) if (JSON.stringify(a.menus?.[m]) !== JSON.stringify(b.menus?.[m])) out.push({
			section: "navigation",
			action: "updated",
			item: m + " menu",
			fields: "items"
		});
	}
	for (const sec of ["theme", "settings"]) if (a[sec] !== b[sec]) {
		const f = Object.keys({
			...a[sec],
			...b[sec]
		}).filter((k) => a[sec]?.[k] !== b[sec]?.[k]);
		if (f.length) out.push({
			section: sec,
			action: "updated",
			item: sec === "theme" ? "Theme & design" : "Store settings",
			fields: f.join(", ")
		});
	}
	return out;
}
var MERGE_MS = 5e3;
function setSite(k, v) {
	setState((x) => ({
		...x,
		site: {
			...x.site,
			[k]: v
		}
	}));
}
function setState(fn) {
	const prev = get();
	const next = fn(prev);
	const log = [...next.activity || []];
	const now = /* @__PURE__ */ new Date();
	for (const c of diffStates(prev, next)) {
		const last = log[0];
		if (last && c.action === "updated" && last.action === "updated" && last.section === c.section && last.item === c.item && last.fields === c.fields && now.getTime() - new Date(last.at).getTime() < MERGE_MS) log[0] = {
			...last,
			at: now.toISOString()
		};
		else log.unshift({
			id: uid(),
			at: now.toISOString(),
			by: getSession()?.email || "unknown",
			...c
		});
	}
	state = {
		...next,
		activity: log.slice(0, 1e3)
	};
	persist(state);
	subs.forEach((f) => f());
}
function clearActivity() {
	state = {
		...get(),
		activity: []
	};
	persist(state);
	subs.forEach((f) => f());
}
function resetState() {
	dataSource.clear(KEY);
	dataSource.clear(DRAFT_KEY);
	state = null;
	subs.forEach((f) => f());
}
var PUB_KEY = "shihiko-site-config";
var DRAFT_KEY = "shihiko-site-draft";
var HIST_KEY = "shihiko-site-history";
var seedCache = null;
var PUBLIC_FIELDS = {
	products: [
		"title",
		"price",
		"compareAt",
		"status",
		"seoTitle",
		"seoDescription",
		"description",
		"badge",
		"images",
		"sizeChart",
		"variants",
		"trackStock",
		"allowBackorder",
		"collections"
	],
	collections: [
		"title",
		"description",
		"image",
		"seoTitle",
		"seoDescription",
		"visible",
		"sort",
		"products"
	],
	pages: [
		"title",
		"seoTitle",
		"seoDescription",
		"visible",
		"body"
	]
};
function siteConfig(s) {
	const base = seedCache ||= seed();
	const out = {
		products: {},
		collections: {},
		pages: {}
	};
	for (const sec of [
		"products",
		"collections",
		"pages"
	]) {
		const orig = new Map(base[sec].map((x) => [x.handle, x]));
		for (const item of s[sec]) {
			const o = orig.get(item["handle"]);
			const d = {};
			for (const f of PUBLIC_FIELDS[sec]) if (!o || JSON.stringify(o[f]) !== JSON.stringify(item[f])) d[f] = item[f];
			if (sec === "collections" || sec === "pages") d["visible"] = item["visible"] !== false;
			if (Object.keys(d).length) out[sec][item["handle"]] = d;
		}
	}
	const currentProductHandles = new Set(s.products.map((p) => p.handle));
	const deletedProducts = [];
	for (const p of base.products) if (!currentProductHandles.has(p.handle)) {
		deletedProducts.push(p.handle);
		out.products[p.handle] = {
			deleted: true,
			status: "deleted"
		};
	}
	const currentColHandles = new Set(s.collections.map((c) => c.handle));
	const deletedCollections = [];
	for (const c of base.collections) if (!currentColHandles.has(c.handle)) {
		deletedCollections.push(c.handle);
		out.collections[c.handle] = {
			deleted: true,
			visible: false
		};
	}
	const currentPageHandles = new Set(s.pages.map((p) => p.handle));
	const deletedPages = [];
	for (const pg of base.pages) if (!currentPageHandles.has(pg.handle)) {
		deletedPages.push(pg.handle);
		out.pages[pg.handle] = {
			deleted: true,
			visible: false
		};
	}
	return {
		...out,
		allCollections: s.collections.map((c) => ({
			handle: c.handle,
			title: c.title,
			visible: c.visible !== false,
			sort: c.sort
		})),
		site: s.site,
		defaults: base.site,
		catalog: s.products.map((p) => ({
			handle: p.handle,
			title: p.title,
			price: p.price,
			compareAt: p.compareAt || "",
			image: p.images[0] || "",
			image2: p.images[1] || "",
			description: p.description || "",
			badge: p.badge || "",
			collections: p.collections || [],
			status: p.status
		})),
		deletedProducts,
		deletedCollections,
		deletedPages,
		publishedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function persist(s) {
	dataSource.write(KEY, s);
	const cfg = siteConfig(s);
	dataSource.write(DRAFT_KEY, cfg);
	dataSource.write(PUB_KEY, cfg);
}
var getPublished = () => dataSource.read(PUB_KEY);
var getHistory = () => dataSource.read(HIST_KEY) || [];
function publish() {
	const s = get();
	const hist = getHistory();
	hist.unshift({
		at: (/* @__PURE__ */ new Date()).toISOString(),
		state: {
			...s,
			activity: []
		}
	});
	try {
		dataSource.write(HIST_KEY, hist.slice(0, 10));
	} catch {
		dataSource.write(HIST_KEY, hist.slice(0, 2));
	}
	dataSource.write(PUB_KEY, siteConfig(s));
	const act = {
		id: uid(),
		at: (/* @__PURE__ */ new Date()).toISOString(),
		by: getSession()?.email || "unknown",
		section: "publish",
		action: "updated",
		item: "Website",
		fields: "published draft"
	};
	state = {
		...s,
		activity: [act, ...s.activity].slice(0, 1e3),
		publishedAt: act.at
	};
	dataSource.write(KEY, state);
	subs.forEach((f) => f());
}
function discardDraft() {
	const h = getHistory()[0];
	const next = h ? {
		...h.state,
		activity: get().activity
	} : {
		...seed(),
		activity: get().activity
	};
	state = next;
	persist(next);
	subs.forEach((f) => f());
}
function restoreVersion(i) {
	const h = getHistory()[i];
	if (!h) return;
	setState((x) => ({
		...h.state,
		activity: x.activity
	}));
}
function unpublishAll() {
	dataSource.clear(PUB_KEY);
	subs.forEach((f) => f());
}
function replaceState(s) {
	setState(() => s);
}
function useAdmin() {
	return (0, import_react.useSyncExternalStore)((f) => {
		subs.add(f);
		return () => subs.delete(f);
	}, get, get);
}
var isLoggedIn = () => !!getSession();
//#endregion
export { setSite as A, login as C, replaceState as D, reauthenticate as E, uid as F, unpublishAll as I, useAdmin as L, siteConfig as M, siteDefaults as N, resetState as O, touch as P, logAuthEvent as S, publish as T, discardDraft as _, LOCK_MS as a, getSession as b, SCOPES as c, TEMPLATES as d, WIDTHS as f, dataSource as g, confirmReauth as h, IDLE_MS as i, setState as j, restoreVersion as k, SECTION_KINDS as l, clearActivity as m, BLOCKS as n, RADIUS as o, authEvents as p, FONT_OPTIONS as r, SCALE as s, ABSOLUTE_MS as t, SPACING as u, getHistory as v, logout as w, isLoggedIn as x, getPublished as y };
