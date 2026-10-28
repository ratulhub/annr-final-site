# AnnR Storefront & Admin Codebase Map (`CODEBASE.md`)

> **CRITICAL RULE — PRESERVE STOREFRONT STRUCTURE & ANNR BRANDING:**
> The storefront is served as static HTML from `public/` (158 HTML pages + `/cdn/shop/...` + `/_ext/...`) with **AnnR** branding across all titles, logos (`.icon-logo:before` in `fonts.css` & `image_logo.svg`), descriptions, policies, and admin defaults, and footer credit `created by Ratul` (`https://ratul.site`).
> - **Never alter** the layout, structure, or functionality of the static HTML, CSS, JS, or media files in `public/` (or how `src/routes/index.tsx` and `src/routes/$.ts` serve/proxy them).
> - Note: Remote Shopify CDN asset URLs (`https://shihiko.com/cdn/...`), custom element tags (`<shihiko-header>`, `<shihiko-localization-modal>`), and static product folder handles must remain intact so images and scripts continue working.

---

## 1. High-Level Architecture

1. **Storefront (Static Mirror + Live Proxy)**
   - `public/home.html`, `public/products/<handle>/index.html` (93 products), `public/collections/<handle>/index.html` (22 collections), `public/pages/<handle>/index.html`, `public/policies/<handle>/index.html`, `public/account/...`, `public/search/index.html`.
   - `src/routes/index.tsx`: Redirects `/` → `/home.html`.
   - `src/routes/$.ts`: Catch-all server route:
     - Proxies dynamic Shopify endpoints (`/cart`, `/search`, `/recommendations`, `/localization`, `/discount`, `/contact`) to live `https://shihiko.com`, rewriting asset/page URLs and enforcing `safeRedirectTarget()` + security headers (`SECURITY_HEADERS`).
     - Redirects clean URLs (e.g., `/products/aka-manto-longsleeve`) to static copies (`/products/aka-manto-longsleeve/index.html`) via `staticPagePath()` (hardened against open redirects and path traversal).
   - `public/_ext/site-config.js`: Loaded by store pages. Reads `localStorage["shihiko-site-config"]` (or `shihiko-site-draft` when `?preview=1`) and applies **only** fields that differ from `siteDefaults()`. Also records privacy-safe browser events (`window.shihikoTrack` → `localStorage["shihiko-events"]`).
   - `src/routes/p.$slug.tsx` & `src/site/PageView.tsx`: Renders custom block-based pages created in the admin at `/p/<slug>`.

2. **Admin Panel (`/admin/*`)**
   - Built with TanStack Start / Router (`src/routes/admin*.tsx`) and scoped CSS (`src/admin/admin.css`).
   - **Data Layer (`src/admin/store.ts`)**: Seeded from `src/admin/catalog.json` and `src/admin/site/defaults.ts`. Persists draft state to `localStorage["shihiko-admin-v1"]` and `localStorage["shihiko-site-draft"]` through `src/admin/services/dataSource.ts`.
   - **Draft / Publish / Version History (`src/routes/admin.publish.tsx`, `src/admin/store.ts`)**: Admin edits only affect the draft until **Publish** writes `localStorage["shihiko-site-config"]` and saves up to 10 snapshots in `localStorage["shihiko-site-history"]`.
   - **Media Boundary (`src/admin/services/media.ts`)**: Validates image magic bytes (`sniffImage()`), blocks SVG, enforces ≤ 400 KB and ≤ 6000 px, and tracks usage (`mediaUsage()`).
   - **Analytics Boundary (`src/admin/analytics/`)**: 12 reports at `/admin/analytics/$report` (`provider.ts`, `filters.ts`, `reports.ts`, `charts.tsx`) supporting **Demo Data** and **Local (this browser)** modes.
   - **Security & RBAC (`src/admin/security/`)**:
     - `auth.ts`: SHA-256 demo sign-in (`ratul123@gmail.com`, role `super_admin`), 5-attempt / 15-min lockout, 30-min idle / 8-hour absolute session expiry, 5-min re-authentication (`reauthenticate()`, `recentlyReauthed()`), local auth event log.
     - `permissions.ts`: 8 roles (`super_admin`, `admin`, `content_manager`, `product_manager`, `order_manager`, `marketing_manager`, `analytics_viewer`, `support_agent`) and 23 permissions (`catalog.read`, `roles.manage`, etc.), route-level guard (`permissionForPath()`), and self/privilege escalation guard (`canAssignRole()`).
     - `sanitize.ts`: Pure XSS/URL/CSS/query sanitizers (`escapeHtml`, `safeUrl`, `safeImageUrl`, `safeCssValue`, `sanitizeCss`, `stripQuery`), mirrored in `public/_ext/site-config.js` and tested in `security.test.ts`.

3. **Database & Production Security Package (`database/`)**
   - PostgreSQL / Supabase SQL migration scripts in `database/sql/` (`01` → `07`), RLS verification test suite in `database/tests/rls_verification.sql`, and operator runbook in `database/README.md`.
   - The frontend stays in `"not_connected"` mode (`src/lib/backend-status.ts`) until `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured after running `01` → `07`.

---

## 2. File-by-File Inventory

### Root & Config
- `AGENTS.md`: Always-loaded agent rules and project constraints.
- `CODEBASE.md`: This permanent codebase reference file.
- `roadmap.md`: Checklist of completed project phases (Parts 1–4).
- `.env.example`: Public env template (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) with secret-leak warnings.
- `public/_headers`: Static-host security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Content-Security-Policy-Report-Only`, `/admin*` `noindex`).

### Server & Storefront Routes (`src/`)
- `src/server.ts` & `src/start.ts`: TanStack Start SSR entry, error normalization, and CSRF middleware.
- `src/routes/__root.tsx`: Root HTML shell, error boundary, 404 fallback.
- `src/routes/index.tsx`: Redirects `/` to `/home.html`.
- `src/routes/$.ts`: Proxy to live `shihiko.com` for cart/search/recommendations + safe static page redirects + security headers.
- `src/routes/p.$slug.tsx` & `src/site/PageView.tsx`: Custom block pages (`/p/$slug`).

### Admin Core (`src/admin/`)
- `src/admin/catalog.json`: Extracted seed catalog (93 products, 22 collections, info pages).
- `src/admin/store.ts`: State, `useAdmin()`, `setState()`, `setSite()`, `diffStates()` activity tracker, `publish()`, `discardDraft()`, `restoreVersion()`.
- `src/admin/ui.tsx`: Reusable admin primitives (`Card`, `Text`, `Area`, `Toggle`, `Select`, `RowList`, `KeyValueEditor`).
- `src/admin/admin.css`: Monochrome Brutalist admin styling (`Druk Wide`, `NB Architekt Std`, `FK Grotesk SemiMono`).
- `src/admin/config/navigation.ts`: Sidebar `NAV_GROUPS` and `MODULES`.
- `src/admin/services/dataSource.ts`: `localStorage` adapter boundary.
- `src/admin/services/media.ts`: `sniffImage()`, `storeFile()`, `mediaUsage()`.
- `src/admin/site/types.ts`, `defaults.ts`, `registry.ts`, `fields.tsx`, `IntegrationsCard.tsx`: Site configuration schema, defaults matching the original store, template section registry, custom page block validators, and device preview iframe.
- `src/admin/analytics/provider.ts`, `filters.ts`, `reports.ts`, `charts.tsx`: Analytics adapter, filter bar state, 12 report definitions, SVG charts, funnel & CSV export.
- `src/admin/security/auth.ts`, `permissions.ts`, `sanitize.ts`, `security.test.ts`: Auth/session/lockout/reauth, RBAC permissions, XSS/CSS/URL sanitizers, and unit tests.

### Admin Routes (`src/routes/admin*.tsx`)
- `admin.tsx`: Shell layout, sidebar search, breadcrumbs, login screen, idle timeout, route permission check, header notifications & account menu.
- `admin.index.tsx`: Customisable dashboard cards, weekly visitor chart, site status, recent activity, sample orders, low stock.
- `admin.publish.tsx`: Draft vs published diff status, live iframe preview (`?preview=1`), publish/discard, 10-version restore history.
- `admin.products.tsx` & `admin.products_.$handle.tsx`: Product list, search/filter, bulk status, full product editor (details, pricing, magic-byte validated images, variants/stock, collections, SEO).
- `admin.collections.tsx`: Collection visibility, sorting, SEO, and product membership.
- `admin.orders.tsx`, `admin.customers.tsx`, `admin.discounts.tsx`: Store operations tables.
- `admin.website.tsx` & `admin.website_.$id.tsx`: Original page visibility toggles + custom block page builder (`/p/$slug`).
- `admin.sections.tsx`: Drag-and-drop section ordering, visibility, spacing/colours, duplicate, and add section (`text`, `image`, `cta`) per template.
- `admin.pages.tsx`: Info/policy page body & SEO editor.
- `admin.content.tsx`: Announcement bar, popup, scoped text replacements, and scoped image replacements.
- `admin.theme.tsx`: Colours, typography, button/input radii, container width, logos/favicon, page transition toggle, custom CSS, live preview.
- `admin.media.tsx`: Media library, magic-byte checked uploads, external image links, usage tracker.
- `admin.navigation.tsx`: Header menu items/options and footer columns/links/contact/copyright.
- `admin.forms.tsx`: Newsletter, search, and VIP form wording & fields.
- `admin.seo.tsx`: Site-wide SEO defaults, title pattern, `robots.txt`, and bulk page/collection/product SEO table.
- `admin.settings.tsx`: General store identity, social URLs, maintenance mode, cookie notice, integrations, shipping/tax settings, re-auth protected JSON export/import/reset.
- `admin.integrations.tsx`: Honest integration status overview.
- `admin.analytics.$report.tsx`: 12 analytics reports (`overview`, `visitors`, `acquisition`, `content`, `events`, `funnels`, `performance`, `errors` with real broken-link checker, `seo` with live catalog audit, `ecommerce`, `reports`, `settings`).
- `admin.users.tsx`: Staff accounts & RBAC role assignment (synced with `permissions.ts`, enforcing `canAssignRole` and re-authentication).
- `admin.activity.tsx`: Searchable, filterable activity log.
- `admin.security.tsx`: Honest Security Center dashboard (`pass`, `fail`, `unchecked`, `disconnected`, `demo` badges, live header & open-redirect checks, re-authentication, RBAC matrix, auth log, dependency scan).
- `admin.m.$module.tsx`: Module overview & direct links to each completed admin module.

### Database & Docs (`database/`, `supabase/`, `docs/`)
- `database/sql/01_core_schema.sql` (`supabase/migrations/20261028000001_core_schema.sql`): Core tables, constraints, `touch_updated_at()`, `handle_new_user()`.
- `database/sql/02_audit_log.sql` (`supabase/migrations/20261028000002_audit_log.sql`): Private `security.audit_log` append-only table, `security.audit()`, row-change triggers.
- `database/sql/03_rbac.sql` (`supabase/migrations/20261028000003_rbac.sql`): `public.app_role`, `user_roles`, `role_permissions`, `has_permission()`, `is_mfa_verified()`, `has_role()`, `grant_role()`, `revoke_role()`, `read_audit_log()`.
- `database/sql/04_grants.sql` (`supabase/migrations/20261028000004_grants.sql`): Default privilege revocation, `ENABLE` + `FORCE ROW LEVEL SECURITY` on all tables, least-privilege table grants.
- `database/sql/05_rls_policies.sql` (`supabase/migrations/20261028000005_rls_policies.sql`): Explicit deny-by-default RLS policies for `anon` and `authenticated` across all 19 tables.
- `database/sql/06_rpc_functions.sql` (`supabase/migrations/20261028000006_rpc_functions.sql`): Audited `SECURITY DEFINER` RPCs (`publish_site_config`, `adjust_inventory`, `update_order_status`, `check_discount_code`, `purge_old_audit_logs`, `create_validated_order`).
- `database/sql/07_storage.sql` (`supabase/migrations/20261028000007_storage.sql`): `public-media` and `private-documents` storage buckets + `storage.objects` RLS policies.
- `database/tests/rls_verification.sql` (`supabase/tests/rls_verification.sql`): Self-contained 10-part SQL verification test suite for RLS, RBAC, BOLA/IDOR, authoritative checkout pricing/stock reservation, and append-only audit log.
- `database/README.md`: Operator runbook (§1–§7).
- `docs/admin-control-inventory.md`: Storefront control mapping (Parts 1–3).
- `docs/security-threat-model.md`: Architecture trust boundaries, asset inventory, STRIDE threat model.
- `docs/security-audit.md`: Complete OWASP ASVS / Top 10 / API Security audit (`SEC-01` through `SEC-13`).
- `docs/security-remediation-plan.md`: Remediation tracking & staged Supabase production cutover plan.
- `docs/supabase-security-plan.md`: 19-table RLS matrix, RBAC permissions, and Supabase Auth/MFA setup.
- `docs/security-verification-checklist.md`: Pre-production & post-deploy verification checklist.
- `docs/security-report.md`: Executive security posture summary.

