import { i as __toESM } from "../_runtime.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { A as setSite, F as uid, L as useAdmin } from "./store-CNEGzpjs.mjs";
import { n as BackBtn, r as Card } from "./ui-D23-eAUw.mjs";
import { n as storeFile, t as mediaUsage } from "./media-DsiAOlfE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.media-DcUNUCGa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Media() {
	const s = useAdmin();
	const media = s.site.media;
	const [q, setQ] = (0, import_react.useState)("");
	const [src, setSrc] = (0, import_react.useState)("all");
	const [sel, setSel] = (0, import_react.useState)(null);
	const [err, setErr] = (0, import_react.useState)("");
	const [link, setLink] = (0, import_react.useState)("");
	const save = (m) => setSite("media", m);
	const list = media.filter((m) => (src === "all" || m.source === src) && (m.name + m.alt).toLowerCase().includes(q.toLowerCase()));
	const cur = media.find((m) => m.id === sel);
	const upload = async (files) => {
		setErr("");
		const added = [];
		for (const f of Array.from(files || [])) try {
			const url = await storeFile(f);
			added.push({
				id: uid(),
				name: f.name,
				url,
				alt: "",
				caption: "",
				type: f.type.split("/")[0] || "image",
				size: f.size,
				source: "upload",
				addedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
		} catch (e) {
			setErr(e.message);
		}
		if (added.length) try {
			save([...added, ...media]);
		} catch {
			setErr("Browser storage is full. Remove some uploads or use links.");
		}
	};
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
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Media library" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "adm-btn",
				children: ["Upload", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "image/*",
					multiple: true,
					hidden: true,
					onChange: (e) => upload(e.target.files)
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "adm-hint",
			children: "Demo: uploads are stored inside this browser (max 400 KB each) and are not in permanent cloud storage. Use links for big files."
		}),
		err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "adm-err",
			children: err
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "adm-row",
			style: { marginBottom: 14 },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					placeholder: "Search…",
					value: q,
					onChange: (e) => setQ(e.target.value),
					style: { maxWidth: 260 }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: src,
					onChange: (e) => setSrc(e.target.value),
					style: { maxWidth: 180 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: "all",
							children: [
								"All (",
								media.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "store",
							children: "Store images"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "upload",
							children: "Uploads"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "link",
							children: "Links"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					placeholder: "https://… image link",
					value: link,
					onChange: (e) => setLink(e.target.value),
					style: { maxWidth: 300 }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "adm-btn ghost",
					disabled: !/^https?:\/\//.test(link),
					onClick: () => {
						save([{
							id: uid(),
							name: link.split("/").pop() || "image",
							url: link,
							alt: "",
							caption: "",
							type: "image",
							size: 0,
							source: "link",
							addedAt: (/* @__PURE__ */ new Date()).toISOString()
						}, ...media]);
						setLink("");
					},
					children: "Add link"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "grid",
				gridTemplateColumns: cur ? "1fr 320px" : "1fr",
				gap: 18
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "adm-media",
				children: list.length ? list.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: sel === m.id ? "on" : "",
					onClick: () => setSel(m.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: m.url.startsWith("//") ? "https:" + m.url : m.url,
						alt: m.alt,
						loading: "lazy"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: m.name })]
				}, m.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No files match." })
			}), cur && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Details",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: cur.url.startsWith("//") ? "https:" + cur.url : cur.url,
						alt: cur.alt,
						style: {
							width: "100%",
							border: "1px solid #000"
						}
					}),
					[
						"name",
						"alt",
						"caption"
					].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						style: { marginTop: 10 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: k === "alt" ? "Alt text" : k }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: cur[k],
							onChange: (e) => save(media.map((m) => m.id === cur.id ? {
								...m,
								[k]: e.target.value
							} : m))
						})]
					}, k)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "adm-hint",
						children: [
							"Source: ",
							cur.source,
							cur.size ? ` · ${Math.round(cur.size / 1024)} KB` : ""
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "adm-field",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Link" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							readOnly: true,
							value: cur.url.startsWith("data:") ? "(stored in browser)" : cur.url
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "adm-hint",
						children: ["Used in: ", mediaUsage(s, cur.url).join(", ") || "nothing"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "adm-btn danger",
						onClick: () => {
							const u = mediaUsage(s, cur.url);
							if (confirm(u.length ? `This file is used in: ${u.join(", ")}. Remove anyway?` : "Remove this file?")) {
								save(media.filter((m) => m.id !== cur.id));
								setSel(null);
							}
						},
						children: "Remove"
					})
				]
			})]
		})
	] });
}
//#endregion
export { Media as component };
