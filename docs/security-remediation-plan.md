# AnnR Security Remediation Plan (`docs/security-remediation-plan.md`)

This document tracks all remediated security vulnerabilities (`SEC-01` through `SEC-13`) and the remaining operational steps required when connecting the live Supabase backend.

---

## 1. Completed Code & SQL Remediations (`SEC-01` → `SEC-13`)

| ID | Vulnerability | Severity | Status | Files Remediated |
| :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | Open redirect via protocol-relative clean URL (`//evil.example`) | High | **Fixed & Verified** | `src/routes/$.ts`, `src/admin/security/security.test.ts` |
| **SEC-02** | Unbounded proxy request body & unchecked `POST` `Content-Type` | High | **Fixed & Verified** | `src/routes/$.ts` (`MAX_BODY_BYTES = 1_000_000`, `413` / `415`) |
| **SEC-03** | Stored XSS & CSS injection in storefront DOM overrides & admin fields | Critical | **Fixed & Verified** | `public/_ext/site-config.js`, `src/admin/security/sanitize.ts`, `src/admin/site/fields.tsx` |
| **SEC-04** | Unsafe file uploads & SVG/HTML polyglot script execution | High | **Fixed & Verified** | `src/admin/ui.tsx`, `src/admin/security/sanitize.ts` (`sniffImage`), `database/sql/07_storage.sql` |
| **SEC-05** | Plaintext demo password, missing brute-force lockout & missing step-up reauth | High | **Fixed & Verified** | `src/admin/security/auth.ts`, `src/routes/admin*.tsx` |
| **SEC-06** | Query-string token/PII leakage in analytics & browser env secret exposure check | Medium | **Fixed & Verified** | `src/admin/analytics/tracker.ts`, `src/lib/backend-status.ts`, `.env.example` |
| **SEC-07** | Database RBAC, RLS, append-only audit log & storage policies | Critical | **Prepared in SQL** | `database/sql/01..07`, `supabase/migrations/20261028000001..07`, `database/tests/rls_verification.sql` |
| **SEC-08** | Missing server-side rate limiting & CSRF Origin validation on proxy `POST` routes | High | **Fixed & Verified** | `src/routes/$.ts` (`checkRateLimit`, `isSameOriginMutation`), `src/admin/security/security.test.ts` |
| **SEC-09** | Missing security headers & `Cache-Control: no-store` on SSR / `/admin*` / `500` responses | Medium | **Fixed & Verified** | `src/server.ts`, `src/routes/$.ts`, `public/_headers` |
| **SEC-10** | Stored XSS (`b.level = "script"`) & CSS injection (`b.columns`) in Custom Page Builder (`PageView.tsx`) | Critical | **Fixed & Verified** | `src/site/PageView.tsx`, `src/routes/p.$slug.tsx`, `src/admin/security/security.test.ts` |
| **SEC-11** | Unauthenticated admin data export & unbounded/unvalidated JSON import in Settings | Medium | **Fixed & Verified** | `src/routes/admin.settings.tsx` (`isValidImport`, `confirmReauth`, `can(role, "data.export")`) |
| **SEC-12** | Missing `site.publish` permission check & audit logging on Publish / Restore actions | Medium | **Fixed & Verified** | `src/routes/admin.publish.tsx`, `src/routes/admin.tsx` |
| **SEC-13** | E-commerce order price tampering, discount abuse & overselling race condition | Critical | **Prepared in SQL** | `database/sql/06_rpc_functions.sql` (`public.create_validated_order`), `database/tests/rls_verification.sql` |

---

## 2. Staged Production Cutover Plan (When Connecting Supabase)

### Step 1 — Provision Database & Run Ordered Migrations
1. Open the Supabase SQL Editor for your project.
2. Execute `database/sql/01_core_schema.sql` through `database/sql/07_storage.sql` (or the identical files in `supabase/migrations/20261028000001..07_*.sql`) in order.
3. Execute `database/tests/rls_verification.sql` and confirm it completes with `ROLLBACK` and zero exceptions.

### Step 2 — Configure Supabase Auth & Bootstrap First Super Admin
1. Enable Email/Password authentication and TOTP (Authenticator App) MFA in Supabase Auth settings.
2. Create the initial administrator user via Supabase Auth and run the bootstrap query from `database/README.md §4` to assign `super_admin` in `public.user_roles`.
3. Log in and enroll TOTP MFA (`aal2`).

### Step 3 — Wire Frontend Data Source Adapter
1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
2. Swap the browser-local adapter in `src/admin/services/dataSource.ts` and `src/admin/security/auth.ts` to call Supabase Auth and the `public.*` RPCs (`publish_site_config`, `adjust_inventory`, `update_order_status`, `create_validated_order`, `grant_role`, `revoke_role`, `read_audit_log`).
3. Verify all indicators in `/admin/security` transition from `Demo data` / `Not connected` to `Verified · passing`.

### Step 4 — Transition CSP from Report-Only to Enforced
1. Monitor browser console / CSP reports from `Content-Security-Policy-Report-Only`.
2. Promote `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy` in `src/routes/$.ts` and `public/_headers`.
