// Pure helpers shared by the admin and mirrored in public/_ext/site-config.js (keep both in sync).
// Admin-edited content is treated as untrusted: it may come from a compromised account or an import file.

export function escapeHtml(t: unknown): string {
  return String(t ?? "").replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[c]!);
}

// Allows same-site paths, http(s), mailto and tel. Blocks javascript:, data:, vbscript:, protocol-relative //host
// and backslash tricks. Returns "#" for anything else.
export function safeUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  /* eslint-disable-next-line no-control-regex */
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

// Normalizes an image URL for PostgreSQL products_validate_row() check:
// requires https:// or same-site / path, no whitespace/quotes/angle-brackets, max 1000 chars.
export function normalizeDbImageUrl(u: unknown): string | null {
  const s = String(u ?? "").trim().replace(/\s+/g, "%20");
  if (!s || s.length > 1000) return null;
  if (/^data:image\//i.test(s)) return null;
  if (/^(https:\/\/|\/(?!\/))[^\s"'<>]{1,1000}$/i.test(s)) return s;
  return null;
}

// Normalizes SKU/code to match PostgreSQL products_code_format: ^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$
export function normalizeProductCode(code: unknown): string | null {
  const cleaned = String(code ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/^[^A-Za-z0-9]+/, "")
    .slice(0, 40);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(cleaned) ? cleaned : null;
}

// Normalizes product handle to lowercase slug: ^[a-z0-9]+(?:-[a-z0-9]+)*$
export function normalizeProductHandle(handle: unknown): string {
  const slug = String(handle ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : `annr-${Date.now()}`;
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
    .replace(/(?:behavior|-moz-binding)\s*:[^;{}]*/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*(?!\/(?!\/)|data:image\/(?!svg))[^)]*\)/gi, "none");
}

// Strips query strings and fragments so analytics never stores emails, tokens or order ids from URLs.
export function stripQuery(href: unknown): string {
  return (String(href ?? "").split(/[?#]/)[0] ?? "").slice(0, 200);
}
