// Pure helpers shared by the admin and mirrored in public/_ext/site-config.js (keep both in sync).
// Admin-edited content is treated as untrusted: it may come from a compromised account or an import file.

export function escapeHtml(t: unknown): string {
  return String(t ?? "").replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[c]!);
}

// Allows same-site paths, http(s), mailto and tel. Blocks javascript:, data:, vbscript:, protocol-relative //host
// and backslash tricks. Returns "#" for anything else.
export function safeUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  if (!s || s.length > 2048 || /[\u0000-\u001f\u007f-\u009f\\]/.test(s)) return "#";
  if (s.startsWith("#")) return s;
  if (s.startsWith("/")) return s.startsWith("//") ? "#" : s;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  return "#";
}

// Image sources may additionally be uploaded data:image (non-SVG) URLs.
export function safeImageUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(s)) return s;
  const r = safeUrl(s);
  return r.startsWith("#") || /^(mailto|tel):/i.test(r) ? "" : r;
}

// A single CSS value (colour, length, font name). Rejects anything that could close the rule or load resources.
export function safeCssValue(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s || s.length > 120) return "";
  if (/[;{}<>\\"`]|url\s*\(|expression\s*\(|@import|javascript:|\/\*/i.test(s)) return "";
  return /^[#a-z0-9 ,.%()'+-]+$/i.test(s) ? s : "";
}

// Admin custom CSS: strips things that can break out of <style>, load remote code or exfiltrate data.
export function sanitizeCss(css: unknown): string {
  return String(css ?? "").slice(0, 20000)
    .replace(/<\/?\s*style/gi, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*(?!\/(?!\/)|data:image\/(?!svg))[^)]*\)/gi, "none");
}

// Strips query strings and fragments so analytics never stores emails, tokens or order ids from URLs.
export function stripQuery(href: unknown): string {
  return (String(href ?? "").split(/[?#]/)[0] ?? "").slice(0, 200);
}
