# AnnR Security Verification Checklist (`docs/security-verification-checklist.md`)

Use this checklist before and after connecting Supabase to verify that every security layer is active and tested.

---

## 1. Automated Code & Unit Test Verification (Run Now)

- [x] **TypeScript strict typecheck**: `.\node_modules\.bin\tsc --noEmit` exits with `0` errors.
- [x] **Security unit test suite**: `npm test` (`src/admin/security/security.test.ts`) passes 100% of tests:
  - [x] URL sanitizer (`safeUrl`) blocks `javascript:`, `vbscript:`, `data:text/html`, and `//evil.example`.
  - [x] CSS sanitizers (`safeColor`, `safeCssLength`, `safeFont`) block `;`, `{}`, `url(...)`, and `expression(...)`.
  - [x] Magic-byte file sniffer (`sniffImage`) accepts JPEG/PNG/GIF/WebP/AVIF and rejects SVG, HTML, and spoofed `.png` files.
  - [x] Authentication lockout (`registerFailure`, `isLocked`), session idle/absolute expiry (`sessionValid`), and SHA-256 verification.
  - [x] RBAC matrix (`can`, `canAssignRole`, `permissionForPath`) enforces all 8 roles × 23 permissions and blocks self-promotion.
  - [x] Browser secret scanner (`leakedSecretInBrowserEnv`) catches `service_role`, `sb_secret_`, and `postgres://` keys.
  - [x] Proxy rate limiter (`checkRateLimit`) enforces 30 POST/min and 120 GET/min per IP.
  - [x] CSRF origin guard (`isSameOriginMutation`) blocks cross-site `POST` requests while permitting same-origin mutations.
  - [x] Admin backup import validator (`isValidImport`) rejects oversized arrays and unknown admin roles.
- [x] **Production bundle verification**: `npm run build` succeeds and `dist/client` contains zero `service_role` or `sb_secret_` strings.

---

## 2. Public Storefront & Proxy Verification

- [x] **Open redirect blocked**: `GET /x//evil.example` does not redirect to `//evil.example`.
- [x] **Cross-origin POST blocked**: `POST /cart/add.js` with `Origin: https://evil.example` returns `403 Cross-origin mutation denied`.
- [x] **Oversized POST blocked**: `POST /contact` with `Content-Length > 1000000` returns `413 Payload too large`.
- [x] **Rate limit active**: Exceeding 30 `POST` requests/min from one IP returns `429 Too Many Requests` with `Retry-After`.
- [x] **Custom page XSS blocked**: `/p/$slug` (`src/site/PageView.tsx`) renders only `h1 | h2 | h3` headings and clamps gallery columns (`1..6`) and spacer height (`8..400`).
- [x] **Security headers sent**: SSR and proxy responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, and `Content-Security-Policy-Report-Only`.

---

## 3. Super Admin Panel Verification (`/admin`)

- [x] **No-cache headers on admin routes**: `/admin*` responses include `Cache-Control: no-store`.
- [x] **Step-up reauthentication (`confirmReauth`)**: Triggered before role changes, data export, data import, data reset, and unpublishing all store overrides.
- [x] **Permission guards**: Every admin route checks `permissionForPath(path)` and action handlers (`exportJson`, `PublishButton`, `PublishPage`, `UsersPage`) verify `can(role, perm)`.
- [x] **Honest Security Center (`/admin/security`)**: Every control displays its true status (`Verified · passing`, `Demo data`, `Not connected`, `Not checked`, or `Failed / insecure`).

---

## 4. Database & Supabase Cutover Verification (Run When Connecting Supabase)

- [ ] Run `database/sql/01_core_schema.sql` through `database/sql/07_storage.sql` (or `supabase/migrations/20261028000001..07_*.sql`) in the Supabase SQL Editor.
- [ ] Run `database/tests/rls_verification.sql` in the SQL Editor and confirm all 10 assertions pass:
  - [ ] Assertion 1: All 19 public tables have `relrowsecurity = true` and `relforcerowsecurity = true`.
  - [ ] Assertion 2–3: `anon` can read active products (`status = 'active'`) and cannot read draft products (`status = 'draft'`).
  - [ ] Assertion 4: Customer B cannot read Customer A's `customer_addresses` or `profiles` (BOLA/IDOR).
  - [ ] Assertion 5: `analytics_viewer` lacks `catalog.write` and cannot call `public.grant_role()`.
  - [ ] Assertion 6: `admin` cannot call `public.grant_role()` (restricted to `super_admin`).
  - [ ] Assertion 7: `super_admin` cannot revoke or modify their own role.
  - [ ] Assertion 8: `DELETE` on `security.audit_log` fails with `42501 insufficient_privilege`.
  - [ ] Assertion 9: `public.create_validated_order()` ignores forged client `unit_price: 0.01`, charges authoritative DB price, increments `inventory.reserved`, and rejects overselling beyond available stock.
  - [ ] Assertion 10: Customer B cannot read Customer A's `orders` or `order_items` (BOLA/IDOR).
- [ ] Bootstrap the first `super_admin` in `public.user_roles` (`database/README.md §4`) and enroll TOTP MFA.
