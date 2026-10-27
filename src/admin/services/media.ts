import type { State } from "../store";

// Storage boundary for uploads. Demo: files become data URLs inside the browser.
// Replace storeFile with a real upload (returning a public URL) when storage is connected; the server/storage
// policy (database/sql/07_storage.sql) must repeat these checks — browser checks alone are not a boundary.
export const MAX_UPLOAD = 400 * 1024;
export const MAX_DIMENSION = 6000;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const; // no SVG: it can carry scripts

// Detects the real format from the first bytes instead of trusting the extension or browser-reported type.
export function sniffImage(b: Uint8Array): (typeof ALLOWED_TYPES)[number] | null {
  const at = (o: number, ...v: number[]) => v.every((x, i) => b[o + i] === x);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (at(4, 0x66, 0x74, 0x79, 0x70) && (at(8, 0x61, 0x76, 0x69, 0x66) || at(8, 0x61, 0x76, 0x69, 0x73))) return "image/avif";
  return null;
}

export async function storeFile(f: File): Promise<string> {
  const name = f.name.replace(/[^\w.-]/g, "_").slice(0, 80);
  if (f.size > MAX_UPLOAD) throw new Error(`${name} is larger than 400 KB. Add it as a link instead.`);
  const type = sniffImage(new Uint8Array(await f.slice(0, 16).arrayBuffer()));
  if (!type) throw new Error(`${name}: only JPG, PNG, WebP, GIF or AVIF images are allowed`);
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read file")); r.readAsDataURL(f); });
  const fixed = url.replace(/^data:[^;]*;/, `data:${type};`);
  await new Promise<void>((res, rej) => { const i = new Image(); i.onload = () => (i.naturalWidth > MAX_DIMENSION || i.naturalHeight > MAX_DIMENSION ? rej(new Error(`${name} is larger than ${MAX_DIMENSION}px`)) : res()); i.onerror = () => rej(new Error(`${name} is not a valid image`)); i.src = fixed; });
  return fixed;
}

export function mediaUsage(s: State, url: string): string[] {
  const out: string[] = [];
  s.products.forEach((p) => p.images.includes(url) && out.push(`Product: ${p.title}`));
  s.collections.forEach((c) => c.image === url && out.push(`Collection: ${c.title}`));
  s.site.images.forEach((r) => r.to === url && out.push(`Image replacement (${r.from})`));
  if (s.site.general.logoUrl === url) out.push("Logo");
  if (s.site.seo.ogImage === url) out.push("Social sharing image");
  s.site.customPages.forEach((p) => JSON.stringify(p.blocks).includes(url) && out.push(`Page: ${p.title}`));
  return out;
}
