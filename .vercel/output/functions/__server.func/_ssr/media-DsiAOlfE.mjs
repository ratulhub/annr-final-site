//#region node_modules/.nitro/vite/services/ssr/assets/media-DsiAOlfE.js
var MAX_DIMENSION = 6e3;
function sniffImage(b) {
	const at = (o, ...v) => v.every((x, i) => b[o + i] === x);
	if (at(0, 255, 216, 255)) return "image/jpeg";
	if (at(0, 137, 80, 78, 71, 13, 10, 26, 10)) return "image/png";
	if (at(0, 71, 73, 70, 56)) return "image/gif";
	if (at(0, 82, 73, 70, 70) && at(8, 87, 69, 66, 80)) return "image/webp";
	if (at(4, 102, 116, 121, 112) && (at(8, 97, 118, 105, 102) || at(8, 97, 118, 105, 115))) return "image/avif";
	return null;
}
async function storeFile(f) {
	const name = f.name.replace(/[^\w.-]/g, "_").slice(0, 80);
	if (f.size > 409600) throw new Error(`${name} is larger than 400 KB. Add it as a link instead.`);
	const type = sniffImage(new Uint8Array(await f.slice(0, 16).arrayBuffer()));
	if (!type) throw new Error(`${name}: only JPG, PNG, WebP, GIF or AVIF images are allowed`);
	const fixed = (await new Promise((res, rej) => {
		const r = new FileReader();
		r.onload = () => res(String(r.result));
		r.onerror = () => rej(/* @__PURE__ */ new Error("Could not read file"));
		r.readAsDataURL(f);
	})).replace(/^data:[^;]*;/, `data:${type};`);
	await new Promise((res, rej) => {
		const i = new Image();
		i.onload = () => i.naturalWidth > 6e3 || i.naturalHeight > 6e3 ? rej(/* @__PURE__ */ new Error(`${name} is larger than ${MAX_DIMENSION}px`)) : res();
		i.onerror = () => rej(/* @__PURE__ */ new Error(`${name} is not a valid image`));
		i.src = fixed;
	});
	return fixed;
}
function mediaUsage(s, url) {
	const out = [];
	s.products.forEach((p) => p.images.includes(url) && out.push(`Product: ${p.title}`));
	s.collections.forEach((c) => c.image === url && out.push(`Collection: ${c.title}`));
	s.site.images.forEach((r) => r.to === url && out.push(`Image replacement (${r.from})`));
	if (s.site.general.logoUrl === url) out.push("Logo");
	if (s.site.seo.ogImage === url) out.push("Social sharing image");
	s.site.customPages.forEach((p) => JSON.stringify(p.blocks).includes(url) && out.push(`Page: ${p.title}`));
	return out;
}
//#endregion
export { storeFile as n, mediaUsage as t };
