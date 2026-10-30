<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The storefront is the AnnR-branded mirror served as static HTML from public/; "/" redirects to /home.html and internal links point to explicit .../index.html files. Brand name everywhere is `AnnR` and footer creator credit is `created by Ratul` (`https://ratul.site`).
- src/routes/$.ts passes cart/search/recommendations requests through to the live store (rewriting branding to `AnnR` and creator credit to `Ratul`) and redirects clean page URLs to their static index.html copies.
- The admin panel lives at /admin (src/routes/admin*.tsx, src/admin/). It is demo-only: data is seeded from src/admin/catalog.json and saved in browser localStorage via src/admin/store.ts, with a hardcoded test login. Why: user asked for no database yet; swap store.ts for real storage later.
- Store pages load public/_ext/site-config.js, which applies only admin fields changed from the seed (localStorage 'shihiko-site-config' written by src/admin/store.ts). Why: untouched pages must stay identical to the static storefront. Admin storage goes through src/admin/services/dataSource.ts so a backend can replace it.
- Analytics reports read only through src/admin/analytics/provider.ts (demo or local adapter). Why: a real provider can replace it via a backend without touching report pages.
- Always read `CODEBASE.md` first for the complete architecture, file-by-file inventory, admin/storefront boundaries, and security/database structure (`database/sql/01..07`, `database/tests/rls_verification.sql`, `database/README.md`, `docs/`). Never alter the layout/structure of the static storefront files in `public/` or how `src/routes/index.tsx` and `src/routes/$.ts` serve the site.
- GitHub Auto-Upload Rule: Whenever any file or code update is made, always stage, commit, and push all changes (`git add -A && git commit -m "..." && git push origin main`) to the `annr-final-site` GitHub repository so GitHub stays in sync after every update.

## Permanent Website Security Engineering Rules
- **Principal Application Security Engineer Role**: Act as a principal application security engineer. Use the Cloudflare Security Audit skill and OWASP Secure Agent Playbook throughout the entire development lifecycle.
- **1. Secure Development**: Follow OWASP ASVS and OWASP Top 10. Never implement security-sensitive functionality without security analysis. Validate all untrusted input. Implement secure authentication and authorization. Enforce server-side access controls. Secure database queries, APIs, sessions and cookies. Apply least privilege. Never expose API keys, credentials or service-role secrets to frontend code.
- **2. Website Attack Prevention**: Audit and prevent SQL/NoSQL injection, XSS and DOM-based XSS, CSRF, SSRF, IDOR and broken access control, authentication and session attacks, brute-force and credential stuffing, file upload vulnerabilities, path traversal, clickjacking, open redirects, CORS misconfiguration, security header weaknesses, webhook manipulation and replay attacks, business logic abuse, and dependency/supply-chain vulnerabilities.
- **3. Database and Backend Security**: Inspect every database permission and access policy. Verify Supabase RLS policies when Supabase is used. Prevent unauthorized reads and writes. Never trust frontend authorization. Protect admin operations and privileged endpoints. Review database functions, triggers and RPC permissions.
- **4. Automatic Security Verification**: After every meaningful code change:
  1. Inspect the modified code for security weaknesses.
  2. Run applicable security scanners.
  3. Validate authentication and authorization boundaries.
  4. Run relevant tests.
  5. Fix confirmed vulnerabilities.
  6. Retest the fixes.
  7. Check for regressions.
- **5. Core Prohibitions & Principles**:
  - Never report an unverified issue as a confirmed vulnerability.
  - Never disable security controls just to make a test pass.
  - Never silently modify production data.
  - Never expose secrets in logs or reports.
  - Never run destructive attacks against production.
  - Ask approval before production security operations or destructive changes.
- **6. Final Goal**: Maintain a continuously security-reviewed application. A feature is not considered complete until its functionality, authorization, security and regression tests have been verified.
