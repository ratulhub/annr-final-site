# AnnR Fashion Storefront & Super Admin Panel — Security Threat Model (`docs/security-threat-model.md`)

> **Scope**: Public fashion storefront (`public/`, `/home.html`, `/p/$slug`), SSR proxy & request handler (`src/routes/$.ts`, `src/server.ts`), Super Admin Panel (`/admin/*`, `src/admin/*`), and prepared PostgreSQL/Supabase backend (`database/sql/01..07`, `supabase/migrations/20261028000001..07`).
> **Posture Principle**: Security is implemented, verified, and maintained in layers. No system is ever claimed to be "100% secure." Client-side controls improve UX and defence-in-depth, while authoritative enforcement resides at the server and database (RLS + `SECURITY DEFINER` RPC) layers.

---

## 1. Architecture & Trust Boundaries

```
+-----------------------------------------------------------------------------------+
| BOUNDARY 1: Untrusted Public Internet / Visitor Browser                           |
|  - Static HTML/CSS/JS storefront (public/home.html, products/*, collections/*)    |
|  - DOM override loader (public/_ext/site-config.js)                               |
|  - React Custom Page renderer (/p/$slug -> src/site/PageView.tsx)                 |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS (HSTS, CSP-Report-Only,
                                          | X-Frame-Options: SAMEORIGIN, COOP)
                                          v
+-----------------------------------------------------------------------------------+
| BOUNDARY 2: Application Server / SSR & Reverse Proxy (src/server.ts, $.ts)        |
|  - Per-IP sliding-window rate limiter (30 POST/min, 120 GET/min -> HTTP 429)      |
|  - Same-origin CSRF guard (Sec-Fetch-Site / Origin / Referer -> HTTP 403)         |
|  - 1 MB request body cap (HTTP 413) & path validation (blocks //open-redirect)    |
|  - Sanitized 500 error boundary (no stack traces or internal paths leaked)        |
+--------------------+-----------------------------------------+--------------------+
                     |                                         |
                     | Upstream Proxy (Cart/Search)            | Supabase Client (HTTPS/JWT)
                     v                                         v
+----------------------------------------+   +--------------------------------------+
| BOUNDARY 3: Shopify Live Storefront    |   | BOUNDARY 4: Supabase Backend (Ready) |
|  - Cart, recommendations, predictive   |   |  - Supabase Auth (AAL2 TOTP MFA)     |
|    search, and hosted PCI checkout     |   |  - 19 tables w/ ENABLE + FORCE RLS   |
|  - Card numbers never touch AnnR       |   |  - Private `security.audit_log`      |
+----------------------------------------+   +--------------------------------------+
```

---

## 2. High-Value Assets & Sensitivity Classification

| Asset | Sensitivity | Current Storage (Demo Mode) | Production Storage (Supabase) | Primary Threat if Compromised |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Roles & Permissions** | **Critical** | `sessionStorage` (`shihiko-admin-session`) | `public.user_roles` + `public.role_permissions` (RLS + `grant_role` RPC) | Full storefront defacement, price manipulation, data exfiltration |
| **Published Storefront Config** | **High** | `localStorage` (`shihiko-site-config`) | `public.site_config_versions` (`publish_site_config` RPC) | Stored XSS across all storefront pages, malicious redirect injection |
| **Product Pricing & Inventory** | **High** | `localStorage` (`shihiko-admin-v1`) | `public.products`, `product_variants`, `inventory` (`create_validated_order` RPC) | Checkout at `0.01` BDT, negative-quantity refund fraud, overselling |
| **Customer PII, Orders & Addresses** | **High** | Seeded mock rows (`src/admin/catalog.json`) | `public.profiles`, `customer_addresses`, `orders`, `order_items` | BOLA/IDOR mass customer data breach, GDPR/privacy violation |
| **Security Audit Trail** | **High** | `localStorage` (`shihiko-auth-events`) | `security.audit_log` (private schema, append-only trigger) | Attackers erasing evidence of privilege escalation or price changes |
| **Uploaded Media & Documents** | **Medium–High** | Data URLs in `localStorage` (magic-byte checked) | `storage.objects` (`public-media` vs `private-documents` buckets) | Stored XSS via polyglot SVG/HTML upload, invoice leakage |
| **Supabase Secret / Service Keys** | **Critical** | None (verified by `leakedSecretInBrowserEnv()`) | Server-only environment (never in `VITE_*`) | Complete bypass of Row Level Security across all tables |

---

## 3. STRIDE Threat Analysis & Mitigations

| STRIDE Category | Concrete Threat Scenario | Affected Component | Layered Mitigation Implemented |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker brute-forces admin login or crafts cross-site POST to `/cart/add.js` or `/contact`. | `src/admin/security/auth.ts`, `src/routes/$.ts` | Client demo lockout (5 fails -> 15 min lock), generic error string, SHA-256 credential hashing, `isSameOriginMutation()` CSRF origin check (`403`), and Supabase Auth + AAL2 MFA readiness. |
| **Tampering** | Malicious admin or imported JSON injects `<script>` via custom page heading level (`b.level = "script"`), CSS `url(javascript:...)`, or DOM override. | `src/site/PageView.tsx`, `src/admin/security/sanitize.ts`, `public/_ext/site-config.js` | Strict tag allowlist (`h1`/`h2`/`h3`), numeric clamping (`columns` 1..6, `size` 8..400), `safeUrl()`, `safeColor()`, `safeCssLength()`, `textContent`-only DOM patching, and `isValidImport()` schema/role validation. |
| **Repudiation** | Privileged user changes product prices, exports customer data, or grants roles and deletes the log. | `src/admin/security/auth.ts`, `database/sql/02_audit_log.sql` | Client logs `login_*`, `reauth_*`, `data_export`, `data_import`, `data_reset`, `site_publish`, `site_unpublish`, `site_restore`; Postgres `security.audit_log` enforces `before update or delete or truncate` rejection trigger. |
| **Information Disclosure** | Attacker enumerates another customer's orders/addresses (IDOR), leaks tokens via analytics URL query strings, or triggers verbose SSR stack traces. | `database/sql/05_rls_policies.sql`, `src/admin/analytics/tracker.ts`, `src/server.ts` | `auth.uid() = user_id` RLS policies verified by `rls_verification.sql`, query-string stripping on analytics paths, `Cache-Control: no-store` on `/admin*`, and generic `500` handler in `src/server.ts`. |
| **Denial of Service** | Bot floods `/cart` or `/search` proxy, uploads 50 MB image bomb, or imports a 100,000-row JSON state. | `src/routes/$.ts`, `src/admin/ui.tsx`, `src/routes/admin.settings.tsx` | Per-IP rate limiter (`30 POST/min`, `120 GET/min`), 1 MB proxy body limit (`413`), 400 KB / 6000×6000 px upload cap, and `isValidImport()` array bounds (`products <= 500`, `pages <= 200`). |
| **Elevation of Privilege** | Regular user or `content_manager` attempts to insert `super_admin` into `user_roles` or forge `payment_status = 'paid'`. | `src/admin/security/permissions.ts`, `database/sql/03_rbac.sql`, `06_rpc_functions.sql` | `user_roles` and `orders` revoke direct client writes; `public.grant_role()` requires `roles.manage` + blocks `actor == target`; `public.create_validated_order()` computes totals from DB prices and forces `payment_status = 'unpaid'`. |

---

## 4. Residual Risks & Operational Requirements

1. **Browser-Only Demo Mode Limitation**: Until Supabase is connected and `.env.local` is configured, anyone with local DevTools access to their own browser can edit their own `localStorage`/`sessionStorage`. This affects only their own browser tab, never other visitors.
2. **Upstream Shopify Dependency**: Cart, search, and checkout proxy to the upstream store. Payment card security relies on Shopify's PCI-DSS Level 1 hosted checkout.
3. **CSP Enforcement Progression**: `Content-Security-Policy-Report-Only` is active so inline Shopify theme scripts continue to work without breaking storefront layout; transition to enforced CSP with script nonces/hashes once theme inline scripts are cataloged.

