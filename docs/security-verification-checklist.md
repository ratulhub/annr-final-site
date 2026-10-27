# Security Verification Checklist (`docs/security-verification-checklist.md`)

Use this checklist before and after deploying or connecting a backend database. Every check must be verified with concrete evidence rather than assumed from UI presence.

---

## 1. Automated Local Checks

- [ ] **Unit & Security Tests**: Run `npm test` (`vitest run`) and confirm all tests in `src/admin/security/security.test.ts` and `src/test/app-routing.test.tsx` pass.
- [ ] **Production Build**: Run `npm run build` and confirm zero TypeScript or bundler errors.
- [ ] **No Secret Keys in Client Env**: Open `/admin/security` → **Security overview** → verify **Secret keys in browser code** shows `Verified · passing`.

---

## 2. Deployed HTTP Headers & Redirect Checks

On the deployed domain (and visible live in `/admin/security` → **Storage, headers & deployment**):

- [ ] `GET /home.html` returns:
  - `x-content-type-options: nosniff`
  - `referrer-policy: strict-origin-when-cross-origin`
  - `permissions-policy: camera=(), microphone=(), geolocation=(), payment=(self)`
  - `strict-transport-security: max-age=31536000; includeSubDomains`
  - `content-security-policy-report-only` (or enforced `content-security-policy`)
- [ ] `GET /admin` returns `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.
- [ ] `GET /x//evil.example` (manual redirect mode) returns `302` to `/x/evil.example/index.html` or `404` — **never** an external redirect to `//evil.example`.

---

## 3. Admin Panel Controls (Demo & Production)

- [ ] **Brute-force lockout**: Enter 5 wrong passwords on `/admin` and verify the 15-minute lockout triggers with a generic error message on attempts 1–4.
- [ ] **Re-authentication on sensitive actions**: Verify that **Import data**, **Reset to original** (`/admin/settings`), **Unpublish all** (`/admin/publish`), and **Role changes** (`/admin/users`) require a recent password confirmation (`recentlyReauthed()` within 5 minutes or inline password prompt).
- [ ] **Upload validation**: Attempt to upload an `.svg` file or a `.html` file renamed to `.png` in `/admin/media` or `/admin/products/<handle>` and verify it is rejected by magic-byte inspection (`sniffImage()`).

---

## 4. Database & RLS Checks (When Backend is Connected)

- [ ] All 7 SQL files (`database/sql/01_core_schema.sql` → `07_storage.sql`) have been executed in order without errors.
- [ ] `database/tests/rls_verification.sql` runs cleanly with zero `SECURITY FAILURE` exceptions.
- [ ] Attempting `DELETE FROM security.audit_log;` fails with `42501: audit log is append-only`.
- [ ] First `super_admin` has authenticator-app MFA enabled.

