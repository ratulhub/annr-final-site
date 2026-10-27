# Security Remediation & Production Migration Plan (`docs/security-remediation-plan.md`)

This document outlines how to transition the Shihiko Admin Panel from its current **Demo / Browser-Only Mode** to full production enforcement once a PostgreSQL / Supabase / Lovable Cloud backend is connected.

---

## Phase 1: Completed in Repository (Frontend + Proxy + SQL Package)

- [x] Proxy hardening (`src/routes/$.ts`): method allowlist, 1 MB payload cap, `safeRedirectTarget()`, `staticPagePath()`, and `SECURITY_HEADERS`.
- [x] Static header rules (`public/_headers`): HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `/admin*` `X-Robots-Tag: noindex`, and `Content-Security-Policy-Report-Only`.
- [x] Untrusted admin content sanitization (`src/admin/security/sanitize.ts` & `public/_ext/site-config.js`): HTML escaping, safe URL/image schemes, CSS value/stylesheet sanitization, and analytics query-string stripping.
- [x] Upload magic-byte verification (`src/admin/services/media.ts`): `sniffImage()` blocking SVG/HTML, enforcing ≤ 400 KB and ≤ 6000 px on both Media Library and Product image uploads.
- [x] Demo auth hardening (`src/admin/security/auth.ts`): no plaintext password in bundle, lockout after 5 failed attempts, 30-min idle / 8-h absolute expiry, and 5-min password re-confirmation (`reauthenticate()`) before destructive/sensitive actions.
- [x] Complete SQL migration suite (`database/sql/01..07`), RLS verification test suite (`database/tests/rls_verification.sql`), and runbook (`database/README.md`).

---

## Phase 2: Database Activation (Run in SQL Editor)

1. Execute `database/sql/01_core_schema.sql` through `database/sql/07_storage.sql` in numerical order (see `database/README.md` §3).
2. Create the first `super_admin` user in `auth.users` and assign their role via the SQL Editor (`database/README.md` §4).
3. Run `database/tests/rls_verification.sql` and verify that all checks pass with zero exceptions (`database/README.md` §5).
4. Schedule the daily `security.purge_old_audit_logs(400)` job (`database/README.md` §7).

---

## Phase 3: Authentication & Data Source Swap

1. **Auth (`src/admin/security/auth.ts`)**:
   - Replace demo `login()`, `logout()`, `getSession()`, and `reauthenticate()` with Supabase Auth (`signInWithPassword`, `signOut`, `getSession`, and MFA factor verification `auth.mfa.challengeAndVerify`).
   - Require TOTP MFA (`aal2`) for all staff roles (`super_admin`, `admin`, and managers).
2. **Data Source (`src/admin/services/dataSource.ts` & `src/admin/store.ts`)**:
   - Replace `localStorage` reads/writes with queries to `public.products`, `public.collections`, `public.site_pages`, and `public.publish_site_config()`.
   - Serve the latest published `public.site_config_versions` row to the storefront instead of `localStorage["shihiko-site-config"]`.
3. **Media (`src/admin/services/media.ts`)**:
   - Replace `FileReader` data URL return in `storeFile()` with an upload to the `public-media` bucket (`storage.from('public-media').upload(...)`), while keeping `sniffImage()` client-side pre-validation.

---

## Phase 4: Edge / Server Rate Limiting & Monitoring

1. Configure server/edge rate limits on `/admin` login, `/contact` submissions, and media uploads.
2. Review browser console reports from `Content-Security-Policy-Report-Only` on the deployed domain; once clean, promote the header in `public/_headers` to `Content-Security-Policy`.
3. Connect an error-monitoring provider (e.g., Sentry) via server environment variables.

