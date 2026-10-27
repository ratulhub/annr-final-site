# Security Audit & Hardening Report (`docs/security-report.md`)

**Date:** 2026-10-27
**Scope:** Shihiko Static Storefront Mirror (`public/`, `src/routes/$.ts`, `src/routes/p.$slug.tsx`) + Admin Panel (`src/admin/`, `src/routes/admin*.tsx`) + Database Security Package (`database/`).

---

## 1. Executive Summary

The Shihiko application consists of:
1. **Static Storefront Mirror (`public/`)**: 158 static HTML pages served unchanged, with live cart/search/recommendations proxied to `https://shihiko.com` via `src/routes/$.ts` and published admin overrides applied client-side by `public/_ext/site-config.js`.
2. **Admin Panel (`/admin`)**: Currently runs in **Demo / Browser-Only Mode** (`localStorage`) with no backend database connected.
3. **Database Security Package (`database/sql/01..07`)**: Production-ready PostgreSQL / Supabase schema, append-only audit log, 8-role / 23-permission RBAC, forced Row Level Security (RLS), storage bucket rules, and SQL verification tests (`database/tests/rls_verification.sql`).

Every security indicator in `/admin/security` is strictly labelled with its real status:
- **Verified · passing**: Confirmed by automated tests or live browser/server checks.
- **Demo data**: Browser-only control for testing; requires a connected backend for real enforcement.
- **Not connected**: SQL/configuration is prepared in the repository (`database/sql/*`), awaiting database connection.
- **Not checked / Failed**:Honest reporting of missing headers or known third-party dependency advisories.

---

## 2. Vulnerabilities Fixed in Code

| ID | Area | Finding | Fix Applied | Verification |
|---|---|---|---|---|
| SEC-01 | `src/routes/$.ts` | Open redirect via clean URL fallback (`//evil.example`) or upstream `Location` header | Added `staticPagePath()` (collapses multiple slashes, blocks `..`, `%2e`, `%2f`, `%5c`, `\`) and `safeRedirectTarget()` (allows only `shihiko.com` and Shopify checkout domains over HTTPS) | `src/admin/security/security.test.ts` ("Server redirects") + live check in `/admin/security` |
| SEC-02 | `src/routes/$.ts` | Unbounded POST body & arbitrary HTTP methods on proxy route | Restricted methods to `GET`, `HEAD`, `POST` (`405` otherwise) and capped request bodies at `1 MB` (`413` otherwise); added `SECURITY_HEADERS` to all server responses | `src/routes/$.ts` |
| SEC-03 | `public/_ext/site-config.js` & `src/site/PageView.tsx` | Stored XSS / CSS injection via admin-edited links, images, colours, or custom CSS (e.g., via imported JSON) | Created `src/admin/security/sanitize.ts` (`escapeHtml`, `safeUrl`, `safeImageUrl`, `safeCssValue`, `sanitizeCss`) and mirrored identical checks in `public/_ext/site-config.js` | `src/admin/security/security.test.ts` ("XSS / unsafe URLs", "CSS injection") |
| SEC-04 | `src/admin/services/media.ts` & `src/routes/admin.products_.$handle.tsx` | SVG / HTML script upload disguised with an image extension | Added `sniffImage()` magic-byte inspection (`JPEG`, `PNG`, `GIF`, `WebP`, `AVIF` only; SVG rejected), `400 KB` max size, and `6000 px` max dimension across both Media Library and Product image uploads | `src/admin/security/security.test.ts` ("Uploads") |
| SEC-05 | `src/admin/security/auth.ts` | Plaintext demo password shipped in client bundle; no session expiry or lockout | Replaced plaintext check with SHA-256 hash comparison, generic error messages, 5-attempt / 15-minute lockout, 30-minute idle / 8-hour absolute timeout, and 5-minute password re-confirmation (`reauthenticate()`) for sensitive actions | `src/admin/security/security.test.ts` ("Login lockout and session expiry") |
| SEC-06 | `public/_ext/site-config.js` | Analytics recording query strings (which may contain emails/tokens) or recording before cookie consent | Added `stripQuery()` / `noQ()` to strip `?query#hash` from tracked URLs, and paused local analytics until cookie banner consent when the banner is enabled | `src/admin/security/security.test.ts` ("Analytics privacy") |
| SEC-07 | `src/lib/backend-status.ts` | Risk of accidental `service_role` or `sb_secret_` key exposure in `VITE_*` browser variables | Added `leakedSecretInBrowserEnv()` check surfaced on `/admin/security` | `/admin/security` |

---

## 3. Database & RBAC Architecture (`database/`)

- **`01_core_schema.sql`**: Strict `CHECK` constraints on lengths, URL schemes, numeric bounds (`numeric(12,2) >= 0`), and no PII in analytics (`path !~ '[?#]'`).
- **`02_audit_log.sql`**: Private `security.audit_log` table with trigger `audit_no_update` blocking `UPDATE`, `DELETE`, and `TRUNCATE`, automatic secret-key stripping in `security.audit()`, and row-change triggers on all sensitive tables.
- **`03_rbac.sql`**: 8 roles (`super_admin`, `admin`, `content_manager`, `product_manager`, `order_manager`, `marketing_manager`, `analytics_viewer`, `support_agent`) and 23 permissions synced with `src/admin/security/permissions.ts`. `grant_role()` and `revoke_role()` enforce `roles.manage` (`super_admin` only) and forbid self-modification.
- **`04_grants.sql` & `05_rls_policies.sql`**: `ENABLE` and `FORCE ROW LEVEL SECURITY` on all 19 tables, least-privilege column/table grants, and strict BOLA/IDOR isolation.
- **`06_rpc_functions.sql` & `07_storage.sql`**: Audited `SECURITY DEFINER` RPCs and storage bucket rules (`public-media` and `private-documents`).

---

## 4. Known Dependency Advisories (as of 2026-10-27)

1. **`zod 3.25.76` (High)**: Memory exhaustion on oversized collections. All database JSONB columns and server routes enforce strict payload size caps; upgrade to `zod ^4` after reviewing form schemas.
2. **`js-yaml` via `@tanstack/react-start` (High)**: Build-time only; not shipped to visitor browsers.
3. **`source-map-js` via `@tailwindcss/vite` (High)**: Build-time only; not shipped to visitor browsers.

