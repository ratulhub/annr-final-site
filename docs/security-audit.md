# AnnR Complete Security Audit (`docs/security-audit.md`)

> **Methodology**: Audited against OWASP Application Security Verification Standard (ASVS v4.0.3), OWASP Top 10 (2021), OWASP API Security Top 10 (2023), and common AI-generated / vibe-coded application vulnerabilities.
> **Date**: 2026-10-28

---

## 1. Executive Summary of Audit Scope

Every layer of the repository was inspected prior to and during hardening:
- **Public Storefront & Static Mirror**: `public/home.html`, `public/products/**`, `public/collections/**`, `public/pages/**`, `public/_ext/site-config.js`, `public/_headers`.
- **Dynamic Storefront Routes**: `src/routes/index.tsx`, `src/routes/$.ts`, `src/routes/p.$slug.tsx`, `src/site/PageView.tsx`, `src/server.ts`, `src/start.ts`.
- **Super Admin Panel (`/admin/*`)**: `src/routes/admin*.tsx`, `src/admin/store.ts`, `src/admin/ui.tsx`, `src/admin/security/auth.ts`, `src/admin/security/permissions.ts`, `src/admin/security/sanitize.ts`.
- **Analytics & Environment**: `src/admin/analytics/tracker.ts`, `src/lib/backend-status.ts`, `.env.example`, `package.json`.
- **Database & Storage Security Package**: `database/sql/01..07`, `database/tests/rls_verification.sql`, `supabase/migrations/20261028000001..07`.

---

## 2. Detailed Vulnerability Findings & Remediation Status

### SEC-01 — Open Redirect via Protocol-Relative Clean Path (`//evil.example`)
- **Severity**: High | **OWASP**: A01:2021 Broken Access Control
- **Affected Component**: `src/routes/$.ts`
- **Exploitation Scenario**: Requesting `GET //evil.example` caused the clean-URL redirect logic to emit `Location: //evil.example/index.html`, redirecting the victim's browser to an external attacker-controlled domain.
- **Impact**: Phishing and credential harvesting after a user visits an AnnR link.
- **Fix Applied**: `SAFE_CLEAN_PATH = /^\/[a-zA-Z0-9/_-]+$/` and `!pathname.startsWith("//")` strictly validate clean paths before redirecting. Verified by unit tests and live fetch check in `/admin/security`.

### SEC-02 — Unbounded Proxy Request Body & Unchecked Content-Type
- **Severity**: High | **OWASP**: API4:2023 Unrestricted Resource Consumption
- **Affected Component**: `src/routes/$.ts`
- **Exploitation Scenario**: An attacker sends multi-megabyte `POST` payloads to `/cart/add.js` or `/contact`, exhausting Node/Edge worker memory.
- **Impact**: Denial of service on the SSR/proxy process.
- **Fix Applied**: Enforced `MAX_BODY_BYTES = 1_000_000` (HTTP `413`), method allowlist (`GET`, `HEAD`, `POST`), `POST` path prefix allowlist (`/cart`, `/contact`, `/localization`, `/discount`), and `Content-Type` allowlist (`415`).

### SEC-03 — Stored XSS & CSS Injection via Admin Overrides (`site-config.js`)
- **Severity**: Critical | **OWASP**: A03:2021 Injection (Cross-Site Scripting)
- **Affected Component**: `public/_ext/site-config.js`, `src/admin/security/sanitize.ts`, `src/admin/site/fields.tsx`
- **Exploitation Scenario**: Malicious `javascript:` / `data:text/html` URLs in navigation links, social links, or announcement bars, or CSS breakthroughs (`red; background:url(javascript:...)`) in theme color/radius/font fields.
- **Impact**: Arbitrary script execution in every visitor's browser.
- **Fix Applied**: Created `safeUrl()`, `safeColor()`, `safeCssLength()`, `safeFont()` in both `src/admin/security/sanitize.ts` and `public/_ext/site-config.js`; ensured `site-config.js` uses `textContent` and `createElement` rather than `innerHTML` with untrusted strings.

### SEC-04 — Unsafe File Upload & Polyglot SVG/HTML Execution Risk
- **Severity**: High | **OWASP**: A04:2021 Insecure Design / ASVS V12 File Upload
- **Affected Component**: `src/admin/ui.tsx`, `src/admin/security/sanitize.ts`, `database/sql/07_storage.sql`
- **Exploitation Scenario**: Uploading an `.svg` or `.html` file renamed to `.png` containing embedded `<script onload="...">`.
- **Impact**: Stored XSS when an admin or customer views the media asset.
- **Fix Applied**: `sniffImage()` inspects magic bytes (JPEG, PNG, GIF, WebP, AVIF only), rejects SVG and HTML regardless of file extension, enforces 400 KB and 6000×6000 px limits, and mirrors these rules in `database/sql/07_storage.sql`.

### SEC-05 — Plaintext Demo Credentials, Missing Lockout & Missing Step-Up Reauthentication
- **Severity**: High | **OWASP**: A07:2021 Identification and Authentication Failures
- **Affected Component**: `src/admin/security/auth.ts`, `src/routes/admin*.tsx`
- **Exploitation Scenario**: Hardcoded plaintext password visible in JS bundle, unlimited login attempts, no idle timeout, and no password re-confirmation before destructive actions (role change, data reset/import/export, unpublish).
- **Impact**: Unauthorized takeover of an unattended admin session or credential disclosure.
- **Fix Applied**: Replaced plaintext password with SHA-256 digest comparison, moved session to `sessionStorage`, added 5-attempt / 15-minute lockout, 30-minute idle & 8-hour absolute session expiry, generic login error message, and 5-minute `confirmReauth()` step-up prompt.

### SEC-06 — PII / Token Leakage in Analytics Paths & Browser Secret Exposure Risk
- **Severity**: Medium | **OWASP**: A09:2021 Security Logging and Monitoring Failures
- **Affected Component**: `src/admin/analytics/tracker.ts`, `src/lib/backend-status.ts`
- **Exploitation Scenario**: Password-reset tokens or customer emails in URL query strings (`?token=...&email=...`) logged to analytics events; accidental `VITE_SUPABASE_SERVICE_ROLE_KEY` exposure in frontend build.
- **Impact**: Session/account compromise via analytics readers; full DB compromise if secret key ships to browser.
- **Fix Applied**: `cleanPath()` strips `?query` and `#hash` before storing analytics events (and `database/sql/01_core_schema.sql` enforces `check (path !~ '[?#]')`); `leakedSecretInBrowserEnv()` scans `import.meta.env` and flags any secret key in `/admin/security`.

### SEC-07 — Client-Only Admin State without Database RLS & RBAC Package
- **Severity**: Critical (Architectural) | **OWASP**: A01:2021 Broken Access Control
- **Affected Component**: `database/sql/01..07`, `supabase/migrations/20261028000001..07`, `src/admin/security/permissions.ts`
- **Exploitation Scenario**: Relying on frontend route guards or a `profiles.is_admin` column that users can update via the Supabase Data API.
- **Impact**: Trivial privilege escalation to `super_admin`.
- **Fix Applied**: Built complete 7-part SQL package with `ENABLE` + `FORCE ROW LEVEL SECURITY` on all 19 tables, isolated `public.user_roles` & `public.role_permissions`, `public.has_permission()`, `public.is_mfa_verified()`, and `database/tests/rls_verification.sql`.

### SEC-08 — Missing Server-Side Rate Limiting & CSRF Origin Validation on Proxy Mutations
- **Severity**: High | **OWASP**: API4:2023 & A01:2021 (CSRF)
- **Affected Component**: `src/routes/$.ts`
- **Exploitation Scenario**:
  1. Cross-origin page submits a hidden `<form method="POST" action="https://annr.store/cart/add.js">` or `/contact` using the visitor's cookies.
  2. Automated bot floods `POST /contact` or `GET /search/suggest.json` without rate limits.
- **Impact**: Cross-site cart/form manipulation and upstream rate-limit exhaustion.
- **Fix Applied**: Added `isSameOriginMutation()` in `src/routes/$.ts` (verifying `Sec-Fetch-Site`, `Origin`, and `Referer` against request host; returns HTTP `403` on cross-site `POST`) and sliding-window per-IP rate limiter `checkRateLimit()` (`30 POST/min`, `120 GET/min`; returns HTTP `429` with `Retry-After`).

### SEC-09 — Missing Security Headers & Cache-Control on SSR / Admin / Error Responses
- **Severity**: Medium | **OWASP**: A05:2021 Security Misconfiguration
- **Affected Component**: `src/server.ts`, `src/routes/$.ts`, `public/_headers`
- **Exploitation Scenario**: SSR-rendered pages (`/admin/*`, `/p/$slug`) and 500 error responses lacked `SECURITY_HEADERS`, `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Opener-Policy`, or `Cache-Control: no-store` on `/admin*`.
- **Impact**: Clickjacking of admin UI or shared-computer caching of admin pages.
- **Fix Applied**: Updated `src/server.ts` (`withSecurityHeaders`) to attach all security headers to every SSR response, enforce `Cache-Control: no-store` on `/admin*` and `500` responses, and added `X-Frame-Options: SAMEORIGIN` and `Cross-Origin-Opener-Policy: same-origin-allow-popups` to `SECURITY_HEADERS` and `public/_headers`.

### SEC-10 — Stored XSS & CSS Injection in Custom Page Builder (`PageView.tsx` & `/p/$slug`)
- **Severity**: Critical | **OWASP**: A03:2021 Injection (XSS)
- **Affected Component**: `src/site/PageView.tsx`, `src/routes/p.$slug.tsx`
- **Exploitation Scenario**: `PageView.tsx` rendered heading blocks via `const T = b.level; return <T ...>{b.text}</T>`. If an attacker imported or stored a page block with `"level": "script"`, React rendered a live `<script>{b.text}</script>` tag on `/p/$slug`! Additionally, `b.columns` was interpolated directly into `gridTemplateColumns: repeat(${b.columns}, 1fr)`.
- **Impact**: Arbitrary JavaScript execution on custom storefront pages (`/p/$slug`).
- **Fix Applied**: Explicitly allowlisted `b.level` to `"h1" | "h2" | "h3"`, allowlisted `b.align` to `"left" | "center" | "right"`, clamped `b.columns` to integer `1..6`, clamped `b.size` to `8..400`, capped text lengths, and validated route `$slug` and product `handle` against `/^[a-z0-9][a-z0-9-]{0,119}$/i`.

### SEC-11 — Unauthenticated / Unchecked Admin Data Export & Unbounded JSON Import
- **Severity**: Medium | **OWASP**: A01:2021 Broken Access Control / A08:2021 Software and Data Integrity Failures
- **Affected Component**: `src/routes/admin.settings.tsx`
- **Exploitation Scenario**: Exporting full admin state did not verify `data.export` permission or require password re-confirmation; `isValidImport()` did not cap array lengths or validate imported admin user roles against `ROLES`.
- **Impact**: Unauthorized data export on an unattended session; invalid role injection via crafted backup JSON.
- **Fix Applied**: `exportJson()` now requires `can(role, "data.export")` + `confirmReauth("export all admin data")` and logs `data_export`; `isValidImport()` enforces array caps (`products <= 500`, `collections <= 100`, `pages <= 200`, `admins <= 100`) and validates every imported admin role against `ROLES`.

### SEC-12 — Missing Permission Check & Audit Logging on Publish / Restore Actions
- **Severity**: Medium | **OWASP**: A01:2021 Broken Access Control & A09:2021 Logging
- **Affected Component**: `src/routes/admin.publish.tsx`, `src/routes/admin.tsx`
- **Exploitation Scenario**: `PublishButton` in the top header and actions in `/admin/publish` did not verify `can(role, "site.publish")` at invocation time or record audit events.
- **Impact**: A lower-privileged role could trigger publish from the header button without an audit record.
- **Fix Applied**: Enforced `can(getSession()?.role, "site.publish")` on all publish/unpublish/discard/restore actions and logged `site_publish`, `site_unpublish`, `site_discard`, and `site_restore`.

### SEC-13 — E-Commerce Order Price & Inventory Tampering Risk
- **Severity**: Critical (E-Commerce Business Logic) | **OWASP**: API6:2023 Unrestricted Access to Sensitive Business Flows
- **Affected Component**: `database/sql/06_rpc_functions.sql`, `database/tests/rls_verification.sql`
- **Exploitation Scenario**: If orders were created by client `INSERT` or an RPC that trusted client-passed `unit_price`, `discount_total`, or `payment_status`, a buyer could purchase items for `0.01` BDT or mark an unpaid order as `paid`.
- **Impact**: Financial loss and inventory exhaustion.
- **Fix Applied**: Added `public.create_validated_order()` (`SECURITY DEFINER`) in `database/sql/06_rpc_functions.sql` which ignores client prices, looks up authoritative active prices from `public.product_variants`/`public.products`, locks and reserves stock in `public.inventory` (`FOR UPDATE`), validates discount codes server-side, forces `status = 'pending'` and `payment_status = 'unpaid'`, enforces `idempotency_key`, and logs to `security.audit_log`. Verified in `database/tests/rls_verification.sql`.

---

## 3. Dependency Vulnerability Audit (`npm audit`)

| Package | Severity | Path / Consumer | Runtime Impact & Mitigation |
| :--- | :--- | :--- | :--- |
| `zod` (`3.25.76`) | High | Direct dependency | Advisory relates to memory exhaustion on huge collections. All inputs and JSON imports enforce strict byte/length/array caps prior to parsing. Upgrade to `zod >= 4.x` after form schema compatibility review. |
| `js-yaml` | High | `@tanstack/react-start` -> `@tanstack/Nitro` (build-time) | Build-time configuration parser only; never bundled into client or invoked on runtime user input. |
| `source-map-js` | High | `@tailwindcss/vite` (build-time) | CSS build toolchain only; never exposed to visitors or runtime requests. |
