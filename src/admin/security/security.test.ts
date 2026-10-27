import { describe, expect, it } from "vitest";
import { escapeHtml, safeCssValue, safeImageUrl, safeUrl, sanitizeCss, stripQuery } from "./sanitize";
import { can, canAssignRole, permissionForPath, ROLES } from "./permissions";
import { isLocked, registerFailure, sessionValid, MAX_ATTEMPTS, LOCK_MS, IDLE_MS, ABSOLUTE_MS, type Session } from "./auth";
import { sniffImage } from "../services/media";
import { safeRedirectTarget, staticPagePath } from "../../routes/$";

describe("XSS / unsafe URLs", () => {
  it("escapes quotes used in attributes", () => expect(escapeHtml(`x' onerror='alert(1)`)).not.toContain("'"));
  it("blocks javascript: links", () => expect(safeUrl("javascript:alert(1)")).toBe("#"));
  it("blocks protocol-relative links", () => expect(safeUrl("//evil.com")).toBe("#"));
  it("blocks backslash tricks", () => expect(safeUrl("/\\evil.com")).toBe("#"));
  it("allows store paths and https", () => { expect(safeUrl("/pages/faq")).toBe("/pages/faq"); expect(safeUrl("https://x.com")).toBe("https://x.com"); });
  it("blocks SVG data images", () => expect(safeImageUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(""));
  it("allows PNG data images", () => expect(safeImageUrl("data:image/png;base64,iVBORw0=")).not.toBe(""));
});

describe("CSS injection", () => {
  it("rejects values that close the rule", () => expect(safeCssValue("red}body{display:none")).toBe(""));
  it("rejects url()", () => expect(safeCssValue("url(https://evil.com/x)")).toBe(""));
  it("keeps colours", () => expect(safeCssValue("#ff0000")).toBe("#ff0000"));
  it("strips remote url() and @import from custom CSS", () => {
    const out = sanitizeCss("@import 'https://e.com/a.css'; a{background:url(https://e.com/?k=1)} </style><script>");
    expect(out).not.toMatch(/@import|e\.com|<\/style/);
  });
});

describe("Analytics privacy", () => {
  it("drops query strings (emails, tokens)", () => expect(stripQuery("/x?email=a@b.com#t")).toBe("/x"));
});

describe("Roles and permissions", () => {
  it("analytics viewer cannot edit settings", () => expect(can("analytics_viewer", "settings.write")).toBe(false));
  it("content manager cannot manage roles", () => expect(can("content_manager", "roles.manage")).toBe(false));
  it("product manager cannot read customers", () => expect(can("product_manager", "customers.read")).toBe(false));
  it("order manager cannot change security", () => expect(can("order_manager", "security.write")).toBe(false));
  it("admin cannot manage roles, only super_admin", () => { expect(can("admin", "roles.manage")).toBe(false); expect(can("super_admin", "roles.manage")).toBe(true); });
  it("no role = no access", () => expect(can(null, "catalog.read")).toBe(false));
  it("nobody can change their own role", () => expect(canAssignRole("super_admin", "u1", "u1")).toBe(false));
  it("only super_admin assigns roles", () => ROLES.filter((r) => r !== "super_admin").forEach((r) => expect(canAssignRole(r, "a", "b")).toBe(false)));
  it("security pages need security.read", () => expect(permissionForPath("/admin/security")).toBe("security.read"));
});

describe("Login lockout and session expiry", () => {
  it(`locks after ${MAX_ATTEMPTS} failures for 15 minutes`, () => {
    let s = { fails: 0, until: 0 };
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerFailure(s, 1000);
    expect(isLocked(s, 1000)).toBe(true);
    expect(isLocked(s, 1000 + LOCK_MS)).toBe(false);
  });
  it("4 failures do not lock", () => { let s = { fails: 0, until: 0 }; for (let i = 0; i < 4; i++) s = registerFailure(s, 0); expect(isLocked(s, 0)).toBe(false); });
  const base: Session = { email: "a", role: "super_admin", startedAt: 0, lastSeen: 0, reauthAt: 0, id: "x" };
  it("expires after 30 min idle", () => expect(sessionValid(base, IDLE_MS)).toBe(false));
  it("expires after 8 h even if active", () => expect(sessionValid({ ...base, lastSeen: ABSOLUTE_MS - 1 }, ABSOLUTE_MS)).toBe(false));
});

describe("Uploads", () => {
  it("detects PNG from bytes", () => expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png"));
  it("rejects SVG/HTML disguised as image", () => expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull());
});

describe("Server redirects", () => {
  it("never redirects to an external host from a clean URL", () => expect(staticPagePath("//evil.com", null)).toBeNull());
  it("rejects path traversal", () => expect(staticPagePath("/pages/..%2f..%2fetc", null)).toBeNull());
  it("maps clean product URLs", () => expect(staticPagePath("/products/aka", null)).toBe("/products/aka/index.html"));
  it("drops upstream redirects to unknown hosts", () => expect(safeRedirectTarget("https://evil.com/x")).toBeNull());
  it("keeps Shopify checkout redirects", () => expect(safeRedirectTarget("https://shihiko.com/checkouts/abc")).toBe("https://shihiko.com/checkouts/abc"));
});
