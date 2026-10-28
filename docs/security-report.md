# AnnR Executive Security Report (`docs/security-report.md`)

> **Brand**: AnnR (`https://ratul.site` creator credit)
> **Last Updated**: 2026-10-28
> **Documentation Index**:
> 1. [`docs/security-threat-model.md`](./security-threat-model.md) — Architecture, trust boundaries, asset classification & STRIDE analysis
> 2. [`docs/security-audit.md`](./security-audit.md) — Complete OWASP ASVS / Top 10 / API Security audit (`SEC-01` through `SEC-13`)
> 3. [`docs/security-remediation-plan.md`](./security-remediation-plan.md) — Code fixes applied & staged Supabase cutover plan
> 4. [`docs/supabase-security-plan.md`](./supabase-security-plan.md) — 19-table RLS matrix, RBAC roles/permissions & SQL migration runbook
> 5. [`docs/security-verification-checklist.md`](./security-verification-checklist.md) — Automated unit test, proxy, admin & SQL verification checklist

---

## 1. Summary of Security Posture

| Layer | Current Status | Key Controls Implemented |
| :--- | :---: | :--- |
| **Storefront & Custom Pages** | **Hardened (Active)** | Zero layout/design alterations; DOM overrides (`public/_ext/site-config.js`) use `textContent` + URL/CSS allowlists; custom page builder (`src/site/PageView.tsx`) allowlists heading tags (`h1..h3`) and clamps CSS grid/spacer values. |
| **SSR Server & Proxy (`$.ts`, `server.ts`)** | **Hardened (Active)** | Per-IP sliding-window rate limiter (`30 POST/min`, `120 GET/min`), `isSameOriginMutation()` CSRF origin check (`403`), 1 MB body cap (`413`), open-redirect block, sanitized `500` responses, and full security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `COOP`, `Referrer-Policy`, `Permissions-Policy`, `CSP-Report-Only`, `Cache-Control: no-store` on `/admin*`). |
| **Super Admin Panel (`/admin`)** | **Hardened (Demo Mode)** | SHA-256 credential check, `sessionStorage` session with 30m idle / 8h absolute expiry, 5-try / 15m lockout, 5m `confirmReauth()` step-up prompt before sensitive operations, 8-role × 23-permission RBAC checks on routes and action buttons, magic-byte upload sniffer (`sniffImage`), bounded/role-validated JSON import (`isValidImport`), and honest 12-section Security Center (`/admin/security`). |
| **Supabase / PostgreSQL Package** | **Prepared (Ready to Run)** | 7 ordered idempotent SQL files in `database/sql/01..07` and `supabase/migrations/20261028000001..07`, enforcing `ENABLE` + `FORCE ROW LEVEL SECURITY` on all 19 tables, append-only `security.audit_log`, MFA check (`public.is_mfa_verified()`), authoritative checkout RPC (`public.create_validated_order()`), and 10-part automated test suite (`database/tests/rls_verification.sql`). |

---

## 2. What Requires Manual Action Later

1. **Connect Supabase & Run SQL (`01..07` + `rls_verification.sql`)**: Follow [`database/README.md`](../database/README.md) to execute the prepared SQL scripts in the Supabase SQL Editor.
2. **Enable Supabase Auth & TOTP MFA**: Configure `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, bootstrap the first `super_admin`, and require TOTP MFA (`aal2`).
3. **Connect External Error Monitoring & Edge Rate Limiting**: Connect Sentry/Logflare for server alert notifications and Cloudflare/Supabase Edge rate limits in front of production endpoints.
