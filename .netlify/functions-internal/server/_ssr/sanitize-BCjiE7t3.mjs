//#region node_modules/.nitro/vite/services/ssr/assets/sanitize-BCjiE7t3.js
function safeUrl(u) {
	const s = String(u ?? "").trim();
	if (!s || s.length > 2048 || /[\u0000-\u001f\u007f-\u009f\\]/.test(s)) return "#";
	if (s.startsWith("#")) return s;
	if (s.startsWith("/")) return s.startsWith("//") ? "#" : s;
	if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
	return "#";
}
function safeImageUrl(u) {
	const s = String(u ?? "").trim();
	if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
	const r = safeUrl(s);
	return r.startsWith("#") || /^(mailto|tel):/i.test(r) ? "" : r;
}
//#endregion
export { safeUrl as n, safeImageUrl as t };
