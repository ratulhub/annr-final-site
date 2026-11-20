import type { State } from "../store";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// Storage boundary for uploads.
// Validates file magic bytes, MIME allowlist (SVG blocked), byte size (<= 400 KB after auto-compression),
// and dimensions (<= 6000 px), matching database/sql/07_storage.sql.
// Uploads to Supabase 'photos' or 'public-media' storage bucket when signed in, falling back
// cleanly to a validated data URL in offline/demo mode.
export const MAX_UPLOAD = 400 * 1024;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB raw camera/phone photo limit before client compression
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

function extForMime(mime: (typeof ALLOWED_TYPES)[number]): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/avif": return "avif";
  }
}

async function compressImageIfNeeded(
  img: HTMLImageElement,
  originalFile: File,
  detectedType: (typeof ALLOWED_TYPES)[number],
  fixedDataUrl: string,
): Promise<{ blob: Blob; dataUrl: string; mime: (typeof ALLOWED_TYPES)[number] }> {
  if (originalFile.size <= MAX_UPLOAD && img.naturalWidth <= 2000 && img.naturalHeight <= 2000) {
    return { blob: originalFile, dataUrl: fixedDataUrl, mime: detectedType };
  }
  if (typeof document === "undefined") {
    return { blob: originalFile, dataUrl: fixedDataUrl, mime: detectedType };
  }
  const maxSide = 1600;
  let w = img.naturalWidth || 1200;
  let h = img.naturalHeight || 1200;
  if (w > maxSide || h > maxSide) {
    const ratio = Math.min(maxSide / w, maxSide / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: originalFile, dataUrl: fixedDataUrl, mime: detectedType };
  }
  ctx.drawImage(img, 0, 0, w, h);

  for (const quality of [0.84, 0.72, 0.6, 0.48]) {
    const outDataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64Part = outDataUrl.split(",")[1] || "";
    const approxBytes = Math.ceil((base64Part.length * 3) / 4);
    if (approxBytes <= MAX_UPLOAD || quality === 0.48) {
      const bin = atob(base64Part);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "image/jpeg" });
      return { blob, dataUrl: outDataUrl, mime: "image/jpeg" };
    }
  }
  return { blob: originalFile, dataUrl: fixedDataUrl, mime: detectedType };
}

export async function storeFile(f: File): Promise<string> {
  const safeBase = f.name.replace(/[^\w.-]/g, "_").replace(/\.\./g, "_").slice(0, 80);
  if (f.size > MAX_INPUT_BYTES) {
    throw new Error(`${safeBase} is larger than 15 MB. Please choose a smaller image or paste an HTTPS link.`);
  }
  const type = sniffImage(new Uint8Array(await f.slice(0, 16).arrayBuffer()));
  if (!type) throw new Error(`${safeBase}: only JPG, PNG, WebP, GIF or AVIF images are allowed`);

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(f);
  });
  const fixedDataUrl = dataUrl.replace(/^data:[^;]*;/, `data:${type};`);

  const loadedImg = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () =>
      i.naturalWidth > MAX_DIMENSION || i.naturalHeight > MAX_DIMENSION
        ? rej(new Error(`${safeBase} is larger than ${MAX_DIMENSION}px`))
        : res(i);
    i.onerror = () => rej(new Error(`${safeBase} is not a valid image`));
    i.src = fixedDataUrl;
  });

  const prepared = await compressImageIfNeeded(loadedImg, f, type, fixedDataUrl);
  if (prepared.blob.size > MAX_UPLOAD) {
    throw new Error(`${safeBase} is larger than 400 KB. Add it as an HTTPS link or compress it first.`);
  }

  // Upload to Supabase 'photos' or 'public-media' storage bucket if authenticated session exists
  if (isSupabaseConfigured()) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const ext = extForMime(prepared.mime);
      const cleanStem = safeBase.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "upload";
      const fileName = `${Date.now()}-${cleanStem}.${ext}`;
      for (const bucket of ["photos", "public-media"]) {
        const path = bucket === "photos" ? fileName : `products/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, prepared.blob, { contentType: prepared.mime, upsert: false });
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) return pub.publicUrl;
        }
      }
    }
  }

  return prepared.dataUrl;
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
