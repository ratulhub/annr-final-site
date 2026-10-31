import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as useAdmin } from "./store-CNEGzpjs.mjs";
import { t as REPORTS } from "./reports-GBnzYtNw.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { t as Route } from "./admin.analytics._report-8i9mBagu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.analytics._report-DfoYcBGu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COLORS = [
	"#000000",
	"#e10600",
	"#8a8a8a",
	"#4a4a4a"
];
function fmt(v, unit = "") {
	if (v == null || Number.isNaN(v)) return "—";
	const n = Math.abs(v) >= 1e3 ? v.toLocaleString() : String(v);
	return unit === "৳" ? `৳${n}` : `${n}${unit ? unit === "%" ? "%" : " " + unit : ""}`;
}
function MetricCard({ c, onOpen }) {
	const ch = c.value != null && c.prev ? (c.value - c.prev) / c.prev * 100 : null;
	const good = ch == null ? null : c.lowerIsBetter ? ch <= 0 : ch >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `adm-stat${onOpen ? " click" : ""}`,
		title: c.help,
		onClick: onOpen,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				c.label,
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
					className: "adm-q",
					title: c.help,
					children: "?"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.value == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
				style: { fontSize: 12 },
				children: "Not available"
			}) : fmt(c.value, c.unit) }),
			ch != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
				style: { color: good ? "#0a7d2c" : "#e10600" },
				children: [
					ch >= 0 ? "▲" : "▼",
					" ",
					Math.abs(Math.round(ch)),
					"% vs previous"
				]
			})
		]
	});
}
function LineChart({ series, height = 200 }) {
	const [hover, setHover] = (0, import_react.useState)(null);
	const pts = series[0]?.points || [];
	if (!pts.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No data in this range." });
	const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
	const W = 800, H = height, pad = 30;
	const x = (i) => pad + i * 740 / Math.max(1, pts.length - 1);
	const y = (v) => H - pad - v / max * (H - 60);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "adm-row",
		style: {
			gap: 14,
			fontSize: 10
		},
		children: series.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: {
			display: "inline-block",
			width: 10,
			height: 3,
			background: COLORS[i],
			verticalAlign: "middle",
			marginRight: 4
		} }), s.name] }, s.name))
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${W} ${H}`,
		style: {
			width: "100%",
			height
		},
		onMouseLeave: () => setHover(null),
		children: [
			[
				0,
				.5,
				1
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: pad,
				x2: 770,
				y1: y(max * t),
				y2: y(max * t),
				stroke: "#e5e5e5"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: 2,
				y: y(max * t) + 3,
				fontSize: "9",
				fill: "#6b6b6b",
				children: Math.round(max * t)
			})] }, t)),
			series.map((s, si) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
				fill: "none",
				stroke: COLORS[si],
				strokeWidth: "2",
				points: s.points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ")
			}, s.name)),
			pts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: x(i) - W / pts.length / 2,
				y: 0,
				width: W / pts.length,
				height: H,
				fill: "transparent",
				onMouseEnter: () => setHover(i)
			}, p.x)),
			hover != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: x(hover),
				x2: x(hover),
				y1: pad,
				y2: H - pad,
				stroke: "#000",
				strokeDasharray: "3 3"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
				x: Math.min(x(hover) + 6, 650),
				y: 34,
				fontSize: "10",
				children: [
					pts[hover].x,
					": ",
					series.map((s) => `${s.name} ${s.points[hover]?.y}`).join(" · ")
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: pad,
				y: H - 8,
				fontSize: "9",
				fill: "#6b6b6b",
				children: pts[0].x
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: 770,
				y: H - 8,
				fontSize: "9",
				fill: "#6b6b6b",
				textAnchor: "end",
				children: pts[pts.length - 1].x
			})
		]
	})] });
}
function BarList({ items, unit }) {
	if (!items.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No data." });
	const max = Math.max(1, ...items.map((i) => i.value));
	const total = items.reduce((a, b) => a + b.value, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { marginBottom: 8 },
		title: `${i.value} (${Math.round(i.value / total * 100)}%)`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: {
				justifyContent: "space-between",
				fontSize: 11
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: i.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				fmt(i.value, unit),
				" · ",
				Math.round(i.value / total * 100),
				"%"
			] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				height: 8,
				background: "#f2f2f2"
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
				height: 8,
				width: `${i.value / max * 100}%`,
				background: "#000"
			} })
		})]
	}, i.label)) });
}
function Funnel({ steps }) {
	const max = Math.max(1, steps[0]?.count || 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: { marginBottom: 6 },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				width: `${Math.max(4, s.count / max * 100)}%`,
				background: i ? "#333" : "#000",
				color: "#fff",
				padding: "10px 12px",
				fontSize: 11,
				textTransform: "uppercase"
			},
			children: [
				i + 1,
				". ",
				s.step,
				" — ",
				s.count.toLocaleString()
			]
		})
	}, s.step + i)) });
}
function csv(name, columns, rows) {
	const q = (v) => `"${String(v).replace(/"/g, "\"\"")}"`;
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([[columns, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
	a.download = name.replace(/\W+/g, "-").toLowerCase() + ".csv";
	a.click();
}
function DataTable({ t, onRowClick }) {
	const [q, setQ] = (0, import_react.useState)("");
	const [sort, setSort] = (0, import_react.useState)(null);
	const [page, setPage] = (0, import_react.useState)(0);
	const PER = 10;
	const rows = (0, import_react.useMemo)(() => {
		let r = t.rows.filter((row) => row.some((c) => String(c).toLowerCase().includes(q.toLowerCase())));
		if (sort) r = r.slice().sort((a, b) => {
			const x = a[sort.i], y = b[sort.i];
			return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
		});
		return r;
	}, [
		t,
		q,
		sort
	]);
	const pages = Math.max(1, Math.ceil(rows.length / PER));
	const p = Math.min(page, pages - 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "adm-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-top",
				style: {
					marginBottom: 10,
					paddingBottom: 8
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						placeholder: "Search…",
						value: q,
						onChange: (e) => {
							setQ(e.target.value);
							setPage(0);
						},
						style: { width: 180 }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost sm",
						disabled: !rows.length,
						onClick: () => csv(t.title, t.columns, rows),
						children: "Export CSV"
					})]
				})]
			}),
			t.help && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: t.help
			}),
			rows.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: t.columns.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
				style: { cursor: "pointer" },
				onClick: () => setSort({
					i,
					dir: sort?.i === i && sort.dir === -1 ? 1 : -1
				}),
				children: [c, sort?.i === i ? sort.dir === 1 ? " ↑" : " ↓" : ""]
			}, c)) }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.slice(p * PER, p * PER + PER).map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
				onClick: () => onRowClick?.(r),
				style: onRowClick ? { cursor: "pointer" } : void 0,
				children: r.map((c, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: typeof c === "number" ? c.toLocaleString() : c }, j))
			}, i)) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No rows." }),
			pages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				style: { marginTop: 10 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost sm",
						disabled: p === 0,
						onClick: () => setPage(p - 1),
						children: "Prev"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						p + 1,
						" / ",
						pages
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn ghost sm",
						disabled: p >= pages - 1,
						onClick: () => setPage(p + 1),
						children: "Next"
					})
				]
			})
		]
	});
}
var KEY = "shihiko-analytics-filters";
var PRESETS_KEY = "shihiko-analytics-saved";
var SRC_KEY = "shihiko-analytics-source";
var iso = (d) => d.toISOString().slice(0, 10);
function presetRange(p) {
	const end = /* @__PURE__ */ new Date();
	const start = /* @__PURE__ */ new Date();
	start.setDate(end.getDate() - (p === "7d" ? 6 : p === "90d" ? 89 : p === "12m" ? 364 : 29));
	return {
		start: iso(start),
		end: iso(end)
	};
}
var defaultFilters = () => ({
	preset: "30d",
	...presetRange("30d"),
	compare: true,
	interval: "day",
	device: "all",
	channel: "all",
	page: "all"
});
function useFilters() {
	const [f, setF] = (0, import_react.useState)(defaultFilters);
	const [src, setSrc] = (0, import_react.useState)("demo");
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) {
				const v = JSON.parse(raw);
				setF(v.preset === "custom" ? v : {
					...v,
					...presetRange(v.preset)
				});
			}
		} catch {}
		setSrc(localStorage.getItem(SRC_KEY) || "demo");
	}, []);
	const update = (p) => setF((cur) => {
		const n = {
			...cur,
			...p
		};
		localStorage.setItem(KEY, JSON.stringify(n));
		return n;
	});
	const setSource = (s) => {
		localStorage.setItem(SRC_KEY, s);
		setSrc(s);
	};
	return {
		f,
		update,
		src,
		setSource
	};
}
function previousPeriod(f) {
	const s = new Date(f.start);
	const len = +new Date(f.end) - +s + 864e5;
	return {
		...f,
		start: iso(/* @__PURE__ */ new Date(+s - len)),
		end: iso(/* @__PURE__ */ new Date(+s - 864e5))
	};
}
var savedPresets = () => {
	try {
		return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
	} catch {
		return [];
	}
};
var savePresets = (l) => localStorage.setItem(PRESETS_KEY, JSON.stringify(l));
var EVENT_NAMES = [
	"page_view",
	"cta_click",
	"form_start",
	"form_submit",
	"form_error",
	"site_search",
	"file_download",
	"outbound_click",
	"scroll_depth",
	"add_to_cart",
	"javascript_error",
	"web_vital"
];
function rng(seed) {
	let h = 1779033703 ^ seed.length;
	for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
	return () => {
		h = Math.imul(h ^ h >>> 16, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		return ((h ^= h >>> 16) >>> 0) / 4294967296;
	};
}
function buckets(f) {
	const out = [];
	const d = new Date(f.start);
	const end = new Date(f.end);
	const step = f.interval === "month" ? 30 : f.interval === "week" ? 7 : 1;
	while (d <= end && out.length < 400) {
		out.push(d.toISOString().slice(0, 10));
		d.setDate(d.getDate() + step);
	}
	return out;
}
var days = (f) => Math.max(1, Math.round((+new Date(f.end) - +new Date(f.start)) / 864e5) + 1);
var sum = (a) => a.reduce((x, y) => x + y, 0);
var r1 = (n) => Math.round(n * 10) / 10;
var PAGES = [
	"/home.html",
	"/collections/all/index.html",
	"/collections/vault/index.html",
	"/products/aka-manto-longsleeve/index.html",
	"/products/divine-sanctum-tee/index.html",
	"/pages/faq/index.html",
	"/collections/hoodies/index.html",
	"/pages/shipping-policy/index.html",
	"/account/login/index.html",
	"/pages/return-policy/index.html"
];
var CHANNELS = [
	"Direct",
	"Organic search",
	"Social",
	"Referral",
	"Email",
	"Paid"
];
var DEVICES = [
	"Mobile",
	"Desktop",
	"Tablet"
];
var BROWSERS = [
	"Chrome",
	"Safari",
	"Samsung Internet",
	"Firefox",
	"Edge"
];
var COUNTRIES = [
	"Bangladesh",
	"India",
	"United States",
	"United Kingdom",
	"UAE"
];
function demoReport(id, f) {
	const R = rng(id + f.start + f.end + f.device + f.channel + f.page);
	const scale = (f.device !== "all" ? .45 : 1) * (f.channel !== "all" ? .3 : 1) * (f.page !== "all" ? .15 : 1);
	const b = buckets(f);
	const line = (name, base) => ({
		name,
		points: b.map((x, i) => ({
			x,
			y: Math.round(base * scale * (f.interval === "month" ? 30 : f.interval === "week" ? 7 : 1) * (.75 + R() * .5 + Math.sin(i / 3) * .12))
		}))
	});
	const v = line("Visitors", 120), s = line("Sessions", 160), pv = line("Page views", 430);
	const tot = (x) => sum(x.points.map((p) => p.y));
	const prev = (n) => Math.round(n * (.8 + R() * .35));
	const split = (labels, total) => {
		const w = labels.map((_, i) => (labels.length - i) * (.6 + R()));
		const W = sum(w);
		return labels.map((l, i) => ({
			label: l,
			value: Math.round(total * w[i] / W)
		}));
	};
	const V = tot(v), S = tot(s), PV = tot(pv);
	const pages = split(PAGES, PV);
	switch (id) {
		case "overview": return {
			cards: [
				{
					label: "Visitors",
					value: V,
					prev: prev(V),
					help: "Unique browsers that visited in the period.",
					report: "visitors"
				},
				{
					label: "Sessions",
					value: S,
					prev: prev(S),
					help: "Visits. One visitor can have many sessions.",
					report: "visitors"
				},
				{
					label: "Page views",
					value: PV,
					prev: prev(PV),
					help: "Every page load, including repeats.",
					report: "content"
				},
				{
					label: "Pages / session",
					value: r1(PV / S),
					prev: r1(PV / S * .95),
					help: "Page views divided by sessions."
				},
				{
					label: "Avg. engagement",
					value: Math.round(60 + R() * 80),
					unit: "s",
					prev: 90,
					help: "Average time the page was in focus per session."
				},
				{
					label: "Engagement rate",
					value: r1(55 + R() * 15),
					unit: "%",
					prev: 60,
					help: "Sessions over 10 s, with 2+ page views or a conversion."
				},
				{
					label: "Add-to-cart rate",
					value: r1(3 + R() * 3),
					unit: "%",
					prev: 4,
					help: "Sessions with an add_to_cart event.",
					report: "funnels"
				},
				{
					label: "JS errors",
					value: Math.round(R() * 30),
					prev: 20,
					lowerIsBetter: true,
					help: "Script errors reported by browsers.",
					report: "errors"
				}
			],
			trend: {
				title: "Visitors and sessions",
				series: [v, s]
			},
			bars: [{
				title: "Traffic by channel (sessions)",
				items: split(CHANNELS, S)
			}],
			tables: [{
				title: "Top pages",
				columns: ["Page", "Views"],
				rows: pages.map((p) => [p.label, p.value])
			}]
		};
		case "visitors": {
			const nv = Math.round(V * .68);
			return {
				cards: [
					{
						label: "Visitors",
						value: V,
						prev: prev(V),
						help: "Unique browsers (not people)."
					},
					{
						label: "New visitors",
						value: nv,
						prev: prev(nv),
						help: "First visit in this period."
					},
					{
						label: "Returning visitors",
						value: V - nv,
						prev: prev(V - nv),
						help: "Visited before."
					},
					{
						label: "Sessions / visitor",
						value: r1(S / V),
						help: "Average visits per visitor."
					},
					{
						label: "Avg. session",
						value: Math.round(80 + R() * 90),
						unit: "s",
						help: "Average session duration."
					}
				],
				trend: {
					title: "Visitors vs sessions",
					series: [v, s]
				},
				bars: [
					{
						title: "Device",
						items: split(DEVICES, S)
					},
					{
						title: "Browser",
						items: split(BROWSERS, S)
					},
					{
						title: "Country",
						items: split(COUNTRIES, S)
					}
				],
				tables: [{
					title: "Landing pages",
					columns: [
						"Page",
						"Sessions",
						"Exit rate %"
					],
					rows: split(PAGES, S).map((p) => [
						p.label,
						p.value,
						Math.round(20 + R() * 50)
					])
				}, {
					title: "Visit frequency",
					columns: ["Visits", "Visitors"],
					rows: split([
						"1",
						"2",
						"3–5",
						"6–10",
						"10+"
					], V).map((p) => [p.label, p.value])
				}]
			};
		}
		case "acquisition": return {
			cards: CHANNELS.slice(0, 4).map((c) => ({
				label: c,
				value: Math.round(S * (.1 + R() * .3)),
				help: `Sessions from ${c.toLowerCase()}.`
			})),
			trend: {
				title: "Sessions by channel",
				series: CHANNELS.slice(0, 3).map((c) => line(c, 40 + R() * 40))
			},
			bars: [{
				title: "Channel share",
				items: split(CHANNELS, S)
			}],
			tables: [{
				title: "Campaigns (UTM)",
				columns: [
					"Source",
					"Medium",
					"Campaign",
					"Sessions"
				],
				rows: [
					[
						"instagram",
						"social",
						"orbit-drop",
						Math.round(S * .08)
					],
					[
						"newsletter",
						"email",
						"vault-restock",
						Math.round(S * .04)
					],
					[
						"facebook",
						"paid",
						"eid-sale",
						Math.round(S * .03)
					]
				]
			}, {
				title: "Referring domains",
				columns: ["Domain", "Sessions"],
				rows: split([
					"instagram.com",
					"facebook.com",
					"tiktok.com",
					"google.com",
					"discord.com"
				], Math.round(S * .4)).map((p) => [p.label, p.value])
			}],
			note: "Search queries and ad-platform data need Search Console / ad accounts connected."
		};
		case "content": return {
			cards: [
				{
					label: "Page views",
					value: PV,
					prev: prev(PV),
					help: "All page loads."
				},
				{
					label: "Avg. scroll depth",
					value: Math.round(45 + R() * 30),
					unit: "%",
					help: "How far down pages are scrolled."
				},
				{
					label: "Outbound clicks",
					value: Math.round(PV * .02),
					help: "Clicks to other websites."
				},
				{
					label: "Searches",
					value: Math.round(S * .05),
					help: "Uses of store search."
				}
			],
			trend: {
				title: "Page views",
				series: [pv]
			},
			tables: [{
				title: "All pages",
				columns: [
					"Page",
					"Views",
					"Avg. time (s)",
					"Exit %",
					"Scroll %"
				],
				rows: pages.map((p) => [
					p.label,
					p.value,
					Math.round(20 + R() * 120),
					Math.round(15 + R() * 60),
					Math.round(30 + R() * 60)
				])
			}, {
				title: "Button / link clicks",
				columns: [
					"Element",
					"Page",
					"Clicks"
				],
				rows: [
					[
						"Add to cart",
						"/products/*",
						Math.round(S * .06)
					],
					[
						"WAITLIST",
						"/home.html",
						Math.round(S * .03)
					],
					[
						"Shop all",
						"header",
						Math.round(S * .1)
					],
					[
						"VIP",
						"header",
						Math.round(S * .02)
					]
				]
			}]
		};
		case "events": return {
			cards: [{
				label: "Events",
				value: Math.round(PV * 3.2),
				help: "All tracked events."
			}, {
				label: "Event types",
				value: EVENT_NAMES.length,
				help: "Names in the event schema."
			}],
			trend: {
				title: "Events per day",
				series: [line("Events", 1300)]
			},
			bars: [{
				title: "Events by name",
				items: split(EVENT_NAMES, Math.round(PV * 3.2))
			}],
			tables: []
		};
		case "performance": return {
			cards: [
				{
					label: "LCP (p75)",
					value: r1(1.8 + R() * 2),
					unit: "s",
					lowerIsBetter: true,
					help: "Largest Contentful Paint: when the main content appears. Good ≤ 2.5 s, poor > 4 s."
				},
				{
					label: "INP (p75)",
					value: Math.round(120 + R() * 250),
					unit: "ms",
					lowerIsBetter: true,
					help: "Interaction to Next Paint: delay after taps/clicks. Good ≤ 200 ms, poor > 500 ms."
				},
				{
					label: "CLS (p75)",
					value: Math.round((.02 + R() * .2) * 100) / 100,
					lowerIsBetter: true,
					help: "Cumulative Layout Shift: how much the page jumps. Good ≤ 0.1, poor > 0.25."
				},
				{
					label: "FCP (p75)",
					value: r1(1 + R() * 1.5),
					unit: "s",
					lowerIsBetter: true,
					help: "First Contentful Paint. Good ≤ 1.8 s."
				},
				{
					label: "TTFB (p75)",
					value: Math.round(300 + R() * 700),
					unit: "ms",
					lowerIsBetter: true,
					help: "Time to First Byte from the server. Good ≤ 800 ms."
				}
			],
			trend: {
				title: "LCP trend (s, ×10)",
				unit: "",
				series: [{
					name: "LCP ×10",
					points: b.map((x) => ({
						x,
						y: Math.round(18 + R() * 20)
					}))
				}]
			},
			bars: [{
				title: "LCP by device (s ×10)",
				items: DEVICES.map((d) => ({
					label: d,
					value: Math.round(15 + R() * 25)
				}))
			}],
			tables: [{
				title: "Slowest pages",
				columns: [
					"Page",
					"LCP s",
					"INP ms",
					"CLS"
				],
				rows: PAGES.slice(0, 6).map((p) => [
					p,
					r1(1.5 + R() * 3),
					Math.round(100 + R() * 300),
					Math.round(R() * 30) / 100
				])
			}]
		};
		case "errors": return {
			cards: [
				{
					label: "JS errors",
					value: Math.round(R() * 30),
					lowerIsBetter: true,
					help: "Script errors."
				},
				{
					label: "Failed requests",
					value: Math.round(R() * 12),
					lowerIsBetter: true,
					help: "Network calls that failed."
				},
				{
					label: "Pages affected",
					value: Math.round(1 + R() * 5),
					lowerIsBetter: true,
					help: "Distinct pages with errors."
				}
			],
			trend: {
				title: "Errors per day",
				series: [{
					name: "Errors",
					points: b.map((x) => ({
						x,
						y: Math.round(R() * 5)
					}))
				}]
			},
			tables: [{
				title: "Error groups",
				columns: [
					"Severity",
					"Message",
					"Page",
					"Count",
					"First seen",
					"Last seen"
				],
				rows: [
					[
						"High",
						"Fancybox is not defined",
						"/home.html",
						Math.round(5 + R() * 20),
						f.start,
						f.end
					],
					[
						"Medium",
						"ServiceWorker registration failed (404)",
						"all",
						Math.round(5 + R() * 20),
						f.start,
						f.end
					],
					[
						"Low",
						"Unexpected token 'N' in JSON",
						"/collections/*",
						Math.round(R() * 8),
						f.start,
						f.end
					]
				]
			}]
		};
		case "ecommerce": {
			const orders = Math.round(S * .012);
			const aov = 9800;
			return {
				cards: [
					{
						label: "Orders",
						value: orders,
						help: "Completed checkouts."
					},
					{
						label: "Gross revenue",
						value: orders * aov,
						unit: "৳",
						help: "Before refunds."
					},
					{
						label: "Refunds",
						value: Math.round(orders * .03) * aov,
						unit: "৳",
						lowerIsBetter: true,
						help: "Refunded value."
					},
					{
						label: "Avg. order value",
						value: aov,
						unit: "৳",
						help: "Revenue ÷ orders."
					},
					{
						label: "Conversion rate",
						value: r1(orders / S * 100),
						unit: "%",
						help: "Orders ÷ sessions."
					}
				],
				trend: {
					title: "Orders",
					series: [line("Orders", 1.8)]
				},
				tables: [{
					title: "Products",
					columns: [
						"Product",
						"Views",
						"Add to cart",
						"Orders"
					],
					rows: [
						"Aka Manto Longsleeve",
						"Divine Sanctum Tee",
						"Blue Moon Long Sleeve",
						"Hound of Hades Tee"
					].map((p) => [
						p,
						Math.round(PV * .04),
						Math.round(S * .01),
						Math.round(orders * .15)
					])
				}, {
					title: "Coupons",
					columns: [
						"Code",
						"Uses",
						"Discount ৳"
					],
					rows: [[
						"WELCOME10",
						Math.round(orders * .1),
						Math.round(orders * .1 * 980)
					]]
				}],
				note: "Real orders live in Shopify. Connect it through a backend to replace these numbers."
			};
		}
		default: return {
			cards: [],
			tables: []
		};
	}
}
var EVENTS_KEY = "shihiko-events";
function readEvents() {
	try {
		return JSON.parse(localStorage.getItem("shihiko-events") || "[]");
	} catch {
		return [];
	}
}
function filtered(f) {
	const s = f.start, e = f.end + "T23:59:59";
	return readEvents().filter((x) => x.at >= s && x.at <= e && (f.page === "all" || x.path === f.page) && (f.device === "all" || x.props?.["device"] === f.device));
}
var pct = (arr, p) => {
	if (!arr.length) return null;
	const a = arr.slice().sort((x, y) => x - y);
	return a[Math.min(a.length - 1, Math.floor(a.length * p))];
};
function countBy(evs, key) {
	const m = /* @__PURE__ */ new Map();
	evs.forEach((e) => m.set(key(e), (m.get(key(e)) || 0) + 1));
	return [...m].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({
		label,
		value
	}));
}
function localReport(id, f) {
	const evs = filtered(f);
	const pvs = evs.filter((e) => e.name === "page_view");
	const sess = new Set(pvs.map((e) => String(e.props?.["session"]))).size;
	const b = buckets(f);
	const perBucket = (list) => b.map((x, i) => ({
		x,
		y: list.filter((e) => e.at >= x && (i === b.length - 1 || e.at < b[i + 1])).length
	}));
	const vit = (n) => evs.filter((e) => e.name === "web_vital" && e.props?.["metric"] === n).map((e) => Number(e.props?.["value"]));
	const errs = evs.filter((e) => e.name === "javascript_error");
	switch (id) {
		case "overview":
		case "visitors":
		case "content": return {
			cards: [
				{
					label: "Page views",
					value: pvs.length,
					help: "Page loads in this browser."
				},
				{
					label: "Sessions",
					value: sess,
					help: "Browser sessions in this browser."
				},
				{
					label: "Visitors",
					value: pvs.length ? 1 : 0,
					help: "Only this browser is measured locally."
				},
				{
					label: "Clicks",
					value: evs.filter((e) => e.name === "cta_click").length,
					help: "Button and link clicks."
				}
			],
			trend: {
				title: "Page views",
				series: [{
					name: "Page views",
					points: perBucket(pvs)
				}]
			},
			bars: [{
				title: "Device",
				items: countBy(pvs, (e) => String(e.props?.["device"] || "unknown"))
			}],
			tables: [{
				title: "Pages",
				columns: ["Page", "Views"],
				rows: countBy(pvs, (e) => e.path).map((x) => [x.label, x.value])
			}]
		};
		case "acquisition": return {
			cards: [],
			bars: [{
				title: "Referrer",
				items: countBy(pvs, (e) => String(e.props?.["referrer"] || "Direct"))
			}],
			tables: []
		};
		case "events": return {
			cards: [{
				label: "Events",
				value: evs.length,
				help: "All events in this browser."
			}],
			trend: {
				title: "Events",
				series: [{
					name: "Events",
					points: perBucket(evs)
				}]
			},
			bars: [{
				title: "By name",
				items: countBy(evs, (e) => e.name)
			}],
			tables: []
		};
		case "performance": return {
			cards: [
				{
					label: "LCP (p75)",
					value: pct(vit("LCP"), .75) == null ? null : r1(pct(vit("LCP"), .75) / 1e3),
					unit: "s",
					lowerIsBetter: true,
					help: "Measured in this browser. Good ≤ 2.5 s."
				},
				{
					label: "INP (p75)",
					value: pct(vit("INP"), .75),
					unit: "ms",
					lowerIsBetter: true,
					help: "Approximated from the slowest interaction. Good ≤ 200 ms."
				},
				{
					label: "CLS (p75)",
					value: pct(vit("CLS"), .75),
					lowerIsBetter: true,
					help: "Good ≤ 0.1."
				},
				{
					label: "FCP (p75)",
					value: pct(vit("FCP"), .75) == null ? null : r1(pct(vit("FCP"), .75) / 1e3),
					unit: "s",
					lowerIsBetter: true,
					help: "Good ≤ 1.8 s."
				},
				{
					label: "TTFB (p75)",
					value: pct(vit("TTFB"), .75),
					unit: "ms",
					lowerIsBetter: true,
					help: "Good ≤ 800 ms."
				}
			],
			tables: [{
				title: "Measurements by page",
				columns: [
					"Page",
					"Metric",
					"Value"
				],
				rows: evs.filter((e) => e.name === "web_vital").slice(-50).reverse().map((e) => [
					e.path,
					String(e.props?.["metric"]),
					Number(e.props?.["value"])
				])
			}],
			note: "Real measurements from this browser only — not your visitors."
		};
		case "errors": return {
			cards: [{
				label: "JS errors",
				value: errs.length,
				lowerIsBetter: true,
				help: "Errors caught in this browser."
			}, {
				label: "Pages affected",
				value: new Set(errs.map((e) => e.path)).size,
				lowerIsBetter: true,
				help: "Distinct pages."
			}],
			trend: {
				title: "Errors",
				series: [{
					name: "Errors",
					points: perBucket(errs)
				}]
			},
			tables: [{
				title: "Error groups",
				columns: [
					"Message",
					"Page",
					"Count",
					"First seen",
					"Last seen"
				],
				rows: Object.values(errs.reduce((m, e) => {
					const k = e.props?.["message"] + "|" + e.path;
					const r = m[k] || [
						String(e.props?.["message"]),
						e.path,
						0,
						e.at.slice(0, 16),
						e.at.slice(0, 16)
					];
					r[2] = Number(r[2]) + 1;
					r[4] = e.at.slice(0, 16);
					m[k] = r;
					return m;
				}, {}))
			}]
		};
		default: return {
			cards: [],
			tables: [],
			note: "No local data for this report."
		};
	}
}
var demoProvider = {
	status: "Demo Data",
	get: demoReport,
	events: () => []
};
var localProvider = {
	status: "Local (this browser)",
	get: localReport,
	events: filtered
};
var provider = (s) => s === "local" ? localProvider : demoProvider;
function funnel(s, f, steps) {
	if (s === "local") {
		const evs = filtered(f);
		const bySess = /* @__PURE__ */ new Map();
		evs.forEach((e) => {
			const k = String(e.props?.["session"]);
			bySess.set(k, [...bySess.get(k) || [], e]);
		});
		return steps.map((st, i) => ({
			step: st,
			count: [...bySess.values()].filter((l) => steps.slice(0, i + 1).every((x) => l.some((e) => e.name === x))).length
		}));
	}
	const R = rng(steps.join() + f.start + f.end);
	let n = Math.round(4e3 * (days(f) / 30));
	return steps.map((st, i) => {
		if (i) n = Math.round(n * (.15 + R() * .5));
		return {
			step: st,
			count: n
		};
	});
}
function Analytics() {
	const { report } = Route.useParams();
	const meta = REPORTS.find((r) => r.id === report);
	const { f, update, src, setSource } = useFilters();
	if (!meta) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Report not found",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			className: "link",
			to: "/admin/analytics/$report",
			params: { report: "overview" },
			children: "Analytics overview"
		})
	});
	const custom = [
		"funnels",
		"seo",
		"reports",
		"settings"
	].includes(report);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-top",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [report !== "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin/analytics/overview",
					label: "← Reports"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackBtn, {
					to: "/admin",
					label: "← Dashboard"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: meta.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					style: { marginTop: 6 },
					children: meta.purpose
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-tag",
				style: {
					background: src === "demo" ? "#000" : "#fff",
					color: src === "demo" ? "#fff" : "#000"
				},
				children: src === "demo" ? "DEMO DATA — not real visitors" : "LOCAL — this browser only"
			})]
		}),
		report !== "settings" && report !== "seo" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBar, {
			f,
			update,
			src,
			setSource
		}),
		!custom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StandardReport, {
			id: report,
			f,
			src
		}),
		report === "funnels" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnels, {
			f,
			src
		}),
		report === "seo" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeoReport, {}),
		report === "reports" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reports, {
			f,
			src,
			update
		}),
		report === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
			src,
			setSource
		})
	] });
}
function FilterBar({ f, update, src, setSource }) {
	const pages = Array.from(new Set(readEvents().map((e) => e.path))).slice(0, 30);
	const chips = [
		f.device !== "all" && `Device: ${f.device}`,
		f.channel !== "all" && `Channel: ${f.channel}`,
		f.page !== "all" && `Page: ${f.page}`
	].filter(Boolean);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "adm-card adm-filters",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: f.preset,
					onChange: (e) => update(e.target.value === "custom" ? { preset: "custom" } : {
						preset: e.target.value,
						...presetRange(e.target.value)
					}),
					style: { width: 150 },
					"aria-label": "Date range",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "7d",
							children: "Last 7 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "30d",
							children: "Last 30 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "90d",
							children: "Last 90 days"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "12m",
							children: "Last 12 months"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "custom",
							children: "Custom"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "date",
					value: f.start,
					max: f.end,
					onChange: (e) => update({
						preset: "custom",
						start: e.target.value
					}),
					style: { width: 150 },
					"aria-label": "Start date"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "date",
					value: f.end,
					min: f.start,
					onChange: (e) => update({
						preset: "custom",
						end: e.target.value
					}),
					style: { width: 150 },
					"aria-label": "End date"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: f.interval,
					onChange: (e) => update({ interval: e.target.value }),
					style: { width: 110 },
					"aria-label": "Interval",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "day",
							children: "Daily"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "week",
							children: "Weekly"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "month",
							children: "Monthly"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: f.device,
					onChange: (e) => update({ device: e.target.value }),
					style: { width: 120 },
					"aria-label": "Device",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "all",
						children: "All devices"
					}), [
						"Mobile",
						"Desktop",
						"Tablet"
					].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: d }, d))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: f.channel,
					onChange: (e) => update({ channel: e.target.value }),
					style: { width: 140 },
					"aria-label": "Channel",
					disabled: src === "local",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "all",
						children: "All channels"
					}), [
						"Direct",
						"Organic search",
						"Social",
						"Referral",
						"Email",
						"Paid"
					].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: d }, d))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: f.page,
					onChange: (e) => update({ page: e.target.value }),
					style: { width: 200 },
					"aria-label": "Page",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "all",
						children: "All pages"
					}), ["/home.html", ...pages.filter((p) => p !== "/home.html")].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: p }, p))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-check",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: f.compare,
						onChange: (e) => update({ compare: e.target.checked })
					}), "Compare to previous period"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: src,
					onChange: (e) => setSource(e.target.value),
					style: { width: 170 },
					"aria-label": "Data source",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "demo",
						children: "Demo data"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "local",
						children: "This browser's events"
					})]
				})
			]
		}), chips.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: { marginTop: 8 },
			children: [chips.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-tag",
				children: c
			}, c)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn ghost sm",
				onClick: () => update({
					device: "all",
					channel: "all",
					page: "all"
				}),
				children: "Clear filters"
			})]
		})]
	});
}
function StandardReport({ id, f, src }) {
	const nav = useNavigate();
	const [state, setState] = (0, import_react.useState)({ loading: true });
	(0, import_react.useEffect)(() => {
		setState({ loading: true });
		const t = setTimeout(() => {
			try {
				const p = provider(src);
				const data = p.get(id, f);
				if (f.compare) {
					const prev = p.get(id, previousPeriod(f));
					data.cards = data.cards.map((c, i) => ({
						...c,
						prev: prev.cards[i]?.value ?? null
					}));
				} else data.cards = data.cards.map((c) => ({
					...c,
					prev: null
				}));
				setState({
					loading: false,
					data
				});
			} catch (e) {
				setState({
					loading: false,
					error: e.message
				});
			}
		}, 150);
		return () => clearTimeout(t);
	}, [
		id,
		src,
		f
	]);
	if (state.loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "adm-hint",
		children: "Loading report…"
	});
	if (state.error || !state.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "adm-err",
		children: ["Could not load this report: ", state.error]
	});
	const d = state.data;
	const empty = !d.cards.length && !d.tables.length && !d.bars?.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		d.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: d.note
		}),
		empty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "No data",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: src === "local" ? "No events recorded in this browser for this report yet. Browse the store, then come back." : "This report has no data for these filters." })
		}),
		d.cards.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-stats",
			children: d.cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, {
				c,
				onOpen: c.report ? () => nav({
					to: "/admin/analytics/$report",
					params: { report: c.report }
				}) : void 0
			}, c.label))
		}),
		d.trend && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: d.trend.title,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineChart, { series: d.trend.series })
		}),
		d.bars && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
				gap: 18
			},
			children: d.bars.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: b.title,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BarList, {
					items: b.items,
					unit: b.unit
				})
			}, b.title))
		}),
		d.tables.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, {
			t,
			onRowClick: id === "content" || id === "overview" ? (r) => {
				const page = String(r[0]);
				if (page.startsWith("/pages/")) nav({ to: "/admin/pages" });
				else if (page.startsWith("/products/")) nav({
					to: "/admin/products/$handle",
					params: { handle: page.split("/")[2] }
				});
				else nav({ to: "/admin/sections" });
			} : void 0
		}, t.title)),
		(id === "content" || id === "overview") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Click a page row to open its editor. Numbers show what happened, not why."
		}),
		id === "acquisition" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Campaign tracking (UTM)",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Add these to links you share so visits are grouped by campaign:" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "?utm_source=instagram&utm_medium=social&utm_campaign=orbit-drop" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					children: "The store already records the utm_ values in local page_view events."
				})
			]
		}),
		id === "events" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventSchema, {
			src,
			f
		}),
		id === "performance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thresholds, {}),
		id === "visitors" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Cohorts & retention",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: { marginTop: 0 },
				children: "Unavailable: retention needs a connected analytics provider that recognises returning visitors across days. Country breakdowns also need a provider with reliable location data."
			})
		}),
		id === "errors" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkChecker, {}),
		id === "errors" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "adm-hint",
			children: ["Monitoring status: no monitoring service connected. ", src === "demo" ? "These errors are examples." : "These were caught in this browser."]
		})
	] });
}
function EventSchema({ src, f }) {
	const evs = provider(src).events(f).slice(-200).reverse();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { t: {
		title: "Event schema",
		columns: ["Event", "Properties"],
		rows: [
			["page_view", "path, referrer, utm_*, device, session"],
			["cta_click", "label, href"],
			["outbound_click", "href"],
			["form_start / form_submit / form_error", "form id (never field contents)"],
			["site_search", "query length only"],
			["file_download", "href"],
			["scroll_depth", "percent (25/50/75/100)"],
			["add_to_cart", "product handle"],
			["javascript_error", "message (no stack with user data)"],
			["web_vital", "metric, value"]
		]
	} }), src === "local" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { t: {
		title: "Latest events in this browser",
		columns: [
			"Time",
			"Event",
			"Page",
			"Details"
		],
		rows: evs.map((e) => [
			e.at.replace("T", " ").slice(0, 19),
			e.name,
			e.path,
			JSON.stringify(e.props || {})
		])
	} })] });
}
var DEFAULT_STEPS = [
	"page_view",
	"add_to_cart",
	"cta_click"
];
function Funnels({ f, src }) {
	const [steps, setSteps] = (0, import_react.useState)(DEFAULT_STEPS);
	(0, import_react.useEffect)(() => {
		try {
			const s = JSON.parse(localStorage.getItem("shihiko-funnel") || "null");
			if (s) setSteps(s);
		} catch {}
	}, []);
	const save = (s) => {
		setSteps(s);
		localStorage.setItem("shihiko-funnel", JSON.stringify(s));
	};
	const res = funnel(src, f, steps);
	const prev = f.compare ? funnel(src, previousPeriod(f), steps) : null;
	const rows = res.map((r, i) => {
		const before = i ? res[i - 1].count : r.count;
		return [
			`${i + 1}. ${r.step}`,
			r.count,
			i ? before ? Math.round(r.count / before * 1e3) / 10 : 0 : 100,
			i ? before - r.count : 0,
			prev ? prev[i].count : "—"
		];
	});
	const overall = res[0]?.count ? Math.round(res[res.length - 1].count / res[0].count * 1e3) / 10 : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Steps",
			children: [
				steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "adm-row",
					style: { marginBottom: 6 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [i + 1, "."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: s,
							onChange: (e) => save(steps.map((x, j) => j === i ? e.target.value : x)),
							style: { width: 220 },
							children: EVENT_NAMES.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: n }, n))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn danger sm",
							disabled: steps.length <= 2,
							onClick: () => save(steps.filter((_, j) => j !== i)),
							children: "✕"
						})
					]
				}, i)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn ghost sm",
					disabled: steps.length >= 6,
					onClick: () => save([...steps, "form_submit"]),
					children: "+ Add step"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					children: "Checkout happens on the live Shopify store, so purchase is not tracked here; the deepest step is add_to_cart."
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Entered",
					value: res[0]?.count ?? null,
					help: src === "local" ? "Sessions in this browser" : "Sample sessions"
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Completed",
					value: res[res.length - 1]?.count ?? null,
					help: "Reached the last step"
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Overall conversion",
					value: overall,
					unit: "%",
					help: "Completed ÷ entered"
				} })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Funnel",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { steps: res })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { t: {
			title: "Funnel detail",
			columns: [
				"Step",
				"Sessions",
				"Step conversion %",
				"Drop-off",
				"Previous period"
			],
			rows
		} })
	] });
}
function SeoReport() {
	const s = useAdmin();
	const items = [
		...s.pages.map((p) => ({
			k: "Page",
			...p
		})),
		...s.collections.map((c) => ({
			k: "Collection",
			...c
		})),
		...s.products.map((p) => ({
			k: "Product",
			...p
		}))
	];
	const missT = items.filter((i) => !i.seoTitle), missD = items.filter((i) => !i.seoDescription), long = items.filter((i) => i.seoTitle.length > 60);
	const dupT = items.filter((i, _, a) => i.seoTitle && a.filter((x) => x.seoTitle === i.seoTitle).length > 1);
	const seo = s.site.seo;
	const check = (ok, label, to) => [
		ok ? "✓ OK" : "✕ Fix",
		label,
		to
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-stats",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Title coverage",
					value: Math.round((items.length - missT.length) / items.length * 100),
					unit: "%",
					help: "Pages with a search title. Checked from your admin data."
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Description coverage",
					value: Math.round((items.length - missD.length) / items.length * 100),
					unit: "%",
					help: "Pages with a search description."
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Duplicate titles",
					value: dupT.length,
					lowerIsBetter: true,
					help: "Pages sharing the same title."
				} }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c: {
					label: "Search clicks",
					value: null,
					help: "Needs Google Search Console connected."
				} })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Checked from your real admin data (not demo). Impressions, clicks, position and backlinks need Search Console connected."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { t: {
			title: "Technical checklist",
			columns: [
				"Status",
				"Check",
				"Fix in"
			],
			rows: [
				check(!missT.length, `Search titles present (${missT.length} missing)`, "SEO"),
				check(!missD.length, `Descriptions present (${missD.length} missing)`, "SEO"),
				check(!long.length, `Titles under 60 characters (${long.length} too long)`, "SEO"),
				check(!dupT.length, `No duplicate titles (${dupT.length})`, "SEO"),
				check(!seo.noindex, "Site is allowed in search engines", "SEO"),
				check(!!seo.canonicalBase, "Canonical domain set", "SEO"),
				check(seo.structuredData, "Structured data enabled", "SEO"),
				check(!!seo.robots, "robots.txt configured (saved, not served yet)", "SEO"),
				check(!!seo.ogImage, "Social sharing image set", "SEO")
			]
		} }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { t: {
			title: "Pages needing work",
			columns: [
				"Type",
				"Page",
				"Issue"
			],
			rows: [
				...missD.map((i) => [
					i.k,
					i.title,
					"No description"
				]),
				...long.map((i) => [
					i.k,
					i.title,
					"Title too long"
				]),
				...dupT.map((i) => [
					i.k,
					i.title,
					"Duplicate title"
				])
			]
		} }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			className: "adm-btn",
			to: "/admin/seo",
			children: "Open SEO editor"
		})
	] });
}
var CARD_KEY = "shihiko-analytics-cards";
function Reports({ f, src, update }) {
	const [saved, setSaved] = (0, import_react.useState)([]);
	const [name, setName] = (0, import_react.useState)("");
	const all = provider(src).get("overview", f).cards;
	const [order, setOrder] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		setSaved(savedPresets());
		try {
			setOrder(JSON.parse(localStorage.getItem(CARD_KEY) || "null") || all.map((c) => c.label));
		} catch {
			setOrder(all.map((c) => c.label));
		}
	}, []);
	const saveOrder = (o) => {
		setOrder(o);
		localStorage.setItem(CARD_KEY, JSON.stringify(o));
	};
	const exportAll = () => {
		const rows = [];
		REPORTS.filter((r) => r.standard).forEach((r) => provider(src).get(r.id, f).cards.forEach((c) => rows.push([
			r.title,
			c.label,
			c.value ?? "",
			c.unit || ""
		])));
		csv(`analytics-${src}-${f.start}-${f.end}`, [
			"Report",
			"Metric",
			"Value",
			"Unit"
		], rows);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "My overview cards",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "adm-hint",
					children: "Pick and order the cards for your summary."
				}),
				all.map((c) => {
					const i = order.indexOf(c.label);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "adm-row",
						style: { marginBottom: 4 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: i >= 0,
								onChange: (e) => saveOrder(e.target.checked ? [...order, c.label] : order.filter((x) => x !== c.label))
							}),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { width: 180 },
								children: c.label
							}),
							i >= 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn ghost sm",
								disabled: i === 0,
								onClick: () => {
									const o = order.slice();
									[o[i - 1], o[i]] = [o[i], o[i - 1]];
									saveOrder(o);
								},
								children: "↑"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "adm-btn ghost sm",
								disabled: i === order.length - 1,
								onClick: () => {
									const o = order.slice();
									[o[i + 1], o[i]] = [o[i], o[i + 1]];
									saveOrder(o);
								},
								children: "↓"
							})] })
						]
					}, c.label);
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "adm-stats",
					style: { marginTop: 14 },
					children: order.map((l) => all.find((c) => c.label === l)).filter(Boolean).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricCard, { c }, c.label))
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Saved filters",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					placeholder: "Name, e.g. Mobile last 7 days",
					value: name,
					onChange: (e) => setName(e.target.value),
					style: { maxWidth: 280 }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn",
					disabled: !name.trim(),
					onClick: () => {
						const l = [...saved.filter((s) => s.name !== name), {
							name,
							filters: f
						}];
						savePresets(l);
						setSaved(l);
						setName("");
					},
					children: "Save current filters"
				})]
			}), saved.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
				style: { marginTop: 10 },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: saved.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: s.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
						s.filters.start,
						" → ",
						s.filters.end,
						" · ",
						s.filters.device
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn ghost sm",
							onClick: () => update(s.filters),
							children: "Apply"
						}),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "adm-btn danger sm",
							onClick: () => {
								const l = saved.filter((x) => x.name !== s.name);
								savePresets(l);
								setSaved(l);
							},
							children: "✕"
						})
					] })
				] }, s.name)) })
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No saved filters." })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Export",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn",
				onClick: exportAll,
				children: "Download all report metrics (CSV)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Scheduled email reports are a future integration and are not set up."
			})]
		})
	] });
}
function Settings({ src, setSource }) {
	const [n, setN] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => setN(readEvents().length), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Data source",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-check",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "radio",
						checked: src === "demo",
						onChange: () => setSource("demo")
					}), "Demo data (sample numbers)"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "adm-check",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "radio",
							checked: src === "local",
							onChange: () => setSource("local")
						}),
						"This browser's events (",
						n,
						" recorded)"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Local mode uses real events the store pages record in this browser only (trackEvent → local adapter). It is not your visitors' data."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "adm-btn danger sm",
				onClick: () => {
					if (confirm("Delete all locally recorded events?")) {
						localStorage.removeItem(EVENTS_KEY);
						setN(0);
					}
				},
				children: "Clear local events"
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Providers",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Provider" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Used for" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" })
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [
			["Google Analytics 4 / Plausible", "Visitors, traffic, events"],
			["Google Search Console", "Search clicks, queries"],
			["PageSpeed Insights / RUM", "Performance"],
			["Sentry or similar", "Errors"],
			["Shopify", "Orders & revenue"]
		].map(([p, u]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: u }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "adm-tag",
				children: "Not connected"
			}) })
		] }, p)) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Connecting needs a backend so keys stay private. No keys are stored in the browser."
		})]
	})] });
}
var TH_KEY = "shihiko-vitals-thresholds";
var TH_DEFAULT = [
	[
		"LCP",
		"s",
		2.5,
		4
	],
	[
		"INP",
		"ms",
		200,
		500
	],
	[
		"CLS",
		"",
		.1,
		.25
	],
	[
		"FCP",
		"s",
		1.8,
		3
	],
	[
		"TTFB",
		"s",
		.8,
		1.8
	]
];
function Thresholds() {
	const [rows, setRows] = (0, import_react.useState)(TH_DEFAULT);
	(0, import_react.useEffect)(() => {
		try {
			const v = JSON.parse(localStorage.getItem(TH_KEY) || "null");
			if (v) setRows(v);
		} catch {}
	}, []);
	const set = (i, j, v) => {
		const n = Number(v);
		if (!(n >= 0)) return;
		const r = rows.map((x, k) => k === i ? [...x] : x);
		r[i][j] = n;
		setRows(r);
		localStorage.setItem(TH_KEY, JSON.stringify(r));
	};
	const bad = rows.some((r) => r[2] >= r[3]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Alert thresholds (defaults from web.dev Core Web Vitals)",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "adm-btn ghost sm",
			onClick: () => {
				setRows(TH_DEFAULT);
				localStorage.removeItem(TH_KEY);
			},
			children: "Reset"
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Metric" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Good up to" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Poor above" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Unit" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r[0] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					step: "any",
					min: 0,
					value: r[2],
					onChange: (e) => set(i, 2, e.target.value),
					style: { width: 90 }
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					step: "any",
					min: 0,
					value: r[3],
					onChange: (e) => set(i, 3, e.target.value),
					style: { width: 90 }
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r[1] || "score" })
			] }, r[0])) })] }),
			bad && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-err",
				children: "\"Good up to\" must be lower than \"Poor above\"."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Values between the two are \"needs improvement\". No Lighthouse or PageSpeed test has been run; local mode shows real measurements from your own browser only."
			})
		]
	});
}
function LinkChecker() {
	const [page, setPage] = (0, import_react.useState)("/home.html");
	const [state, setState] = (0, import_react.useState)(null);
	const run = async () => {
		setState({
			running: true,
			done: 0,
			total: 0,
			broken: []
		});
		try {
			const html = await (await fetch(page)).text();
			const doc = new DOMParser().parseFromString(html, "text/html");
			const urls = Array.from(new Set(Array.from(doc.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")).filter((h) => h.startsWith("/") && !h.startsWith("//")).map((h) => h.split("#")[0]).filter(Boolean))).slice(0, 200);
			const broken = [];
			let done = 0;
			for (let i = 0; i < urls.length; i += 8) {
				await Promise.all(urls.slice(i, i + 8).map(async (u) => {
					try {
						const r = await fetch(u, {
							method: "GET",
							redirect: "follow"
						});
						if (!r.ok) broken.push({
							url: u,
							status: String(r.status)
						});
					} catch {
						broken.push({
							url: u,
							status: "failed"
						});
					}
					done++;
				}));
				setState({
					running: true,
					done,
					total: urls.length,
					broken: [...broken]
				});
			}
			setState({
				running: false,
				done,
				total: urls.length,
				broken
			});
		} catch (e) {
			setState({
				running: false,
				done: 0,
				total: 0,
				broken: [],
				error: e.message
			});
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Broken link check (real)",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: page,
					onChange: (e) => setPage(e.target.value),
					style: { width: 320 },
					"aria-label": "Page to check"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn",
					disabled: !!state?.running || !page.startsWith("/"),
					onClick: run,
					children: state?.running ? `Checking ${state.done}/${state.total}…` : "Check links"
				})]
			}),
			state?.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "adm-err",
				children: ["Could not load that page: ", state.error]
			}),
			state && !state.running && !state.error && (state.broken.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Link" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" })] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: state.broken.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: b.url }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: b.status })] }, b.url)) })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"All ",
				state.total,
				" internal links on this page answered OK."
			] })),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "adm-hint",
				children: "Checks links inside this website only (up to 200 per page), from your browser, when you press the button."
			})
		]
	});
}
//#endregion
export { Analytics as component };
