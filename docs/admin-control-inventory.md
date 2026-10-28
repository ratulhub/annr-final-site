# AnnR Super Admin Control Inventory (`docs/admin-control-inventory.md`)

The AnnR storefront is served from `public/` (158 static HTML pages + `/p/$slug` dynamic custom pages). Dynamic Shopify commerce endpoints (`/cart`, `/search`, `/recommendations`, `/localization`, `/discount`, `/contact`) are proxied by `src/routes/$.ts`.

All admin edits save first to a **draft** (`localStorage["shihiko-admin-v1"]` and `localStorage["shihiko-site-draft"]`). Public storefront pages change only after clicking **Publish** in `/admin/publish` (or the top-bar **Publish** button), which writes `localStorage["shihiko-site-config"]` and stores a 10-version rollback history in `localStorage["shihiko-site-history"]`. Append `?preview=1` to any storefront URL (or use the built-in `DevicePreview` iframe) to preview unpublished draft changes.

---

## 1. Public Storefront Routes & Verified Admin Controls

| Public Route | Storefront Elements & Sections | Verified Admin Destination | Shared Config & Storefront Application (`public/_ext/site-config.js` / `PageView.tsx`) |
| :--- | :--- | :--- | :--- |
| `/` → `/home.html` | Header, Hero video carousel (`home_hero_carousel_Wg4Rrh`), Product carousel (`product_carousel_showcase_VzeMj3`), 4 Parallax banners (`parallax_*`), Footer | `/admin/sections` (template: `home`), `/admin/content`, `/admin/theme`, `/admin/navigation`, `/admin/seo` | Section order, visibility, spacing, background, alignment, width, device visibility, duplicated sections, and added sections (`text`, `image`, `cta`) apply live; text/image replacements swap hero video/banners; `seo.homeTitle` sets `<title>`. |
| `/products/<handle>/index.html` (93 pages) | Title, price, compare-at price, badge/label, gallery images & thumbnails, size options & stock state, description accordion, size chart, reviews, recommendations, delivery info, recently viewed | `/admin/products`, `/admin/products/$handle`, `/admin/sections` (template: `product`), `/admin/seo` | `siteConfig(s).products[handle]` exports changed `title`, `price`, `compareAt`, `status`, `badge`, `images`, `description`, `sizeChart`, `variants`, `trackStock`, `allowBackorder`, `seoTitle`, `seoDescription`. `site-config.js` updates product cards store-wide AND product detail DOM (`.product-info-title`, `.product-info-price`, `.product-card-labels`, `.product-gallery-carousel`, `.product-info-detail-content-inner`, `.adm-size-chart`, out-of-stock button state, `<title>`, meta tags). |
| `/collections/<handle>/index.html` (22 pages) | Collection title, description, hero banner (`collection_hero`), story CTA (`collection_story_cta_bTzknC`), product grid (`template-collection`), product sorting & membership, visibility | `/admin/collections`, `/admin/sections` (template: `collection`), `/admin/seo` | `siteConfig(s).collections[handle]` exports changed `title`, `description`, `image`, `visible`, `sort`, `products`, `seoTitle`, `seoDescription`. `site-config.js` updates `.collection-title`, `.adm-col-desc`, `[id$="__collection_hero"]`, filters/sorts `.collection-product-grid`, or shows the 404 overlay when `visible === false`. |
| `/pages/<handle>/index.html` (`faq`, `legal-privacy`, `return-policy`, `shipping-policy`) | Page heading (`<h1>`), body content (`.js-textContent-section`), left article nav (`.text-nav`), visibility, SEO | `/admin/pages`, `/admin/website`, `/admin/sections` (template: `page`), `/admin/seo` | `siteConfig(s).pages[handle]` exports changed `title`, `body`, `visible`, `seoTitle`, `seoDescription`. `site-config.js` updates `<h1>` and `.js-textContent-section` on both `__template-faq` and `__template-policy` pages while preserving `.text-nav`. |
| `/policies/<handle>/index.html` (`privacy-policy`, `refund-policy`, `shipping-policy`, `terms-of-service`) | Policy title (`.shopify-policy__title h1`) and policy body (`.shopify-policy__body`) | `/admin/pages`, `/admin/website`, `/admin/content` | Mapped by `pageHandle(path)` in `site-config.js` so edits to `legal-privacy`, `return-policy`, and `shipping-policy` in `/admin/pages` also update `/policies/*`. |
| `/account/login/index.html` & `/account/register/index.html` | VIP intro text (`.vip-form__info`), email/password input placeholders (`#CustomerEmailLogin`, `#CustomerPasswordLogin`), submit button label (`.btn-vip-orange .text`), consent notice, page visibility | `/admin/forms` (`vip-login`, `vip-register`), `/admin/website` (visibility toggle) | `site-config.js` applies `fm.title`, `fm.button`, `fm.fields` placeholders, and `fm.consent` on `/account/login` and `/account/register`, and honors `hiddenPages` visibility toggles from `/admin/website`. |
| `/p/$slug` (Dynamic Custom Pages) | Custom block pages (`heading`, `text`, `image`, `button`, `faq`, `products`, `gallery`, `spacer`) | `/admin/website` → `/admin/website/$id` | Rendered by `src/routes/p.$slug.tsx` & `src/site/PageView.tsx` from published `customPages` (or draft when `?preview=1`); optional automatic header nav link when `showInNav === true`. |
| `/search/index.html` & Header Search Drawer | Search input placeholder (`input[name=q]`), predictive search proxy | `/admin/forms` (`search`), `/admin/content` | `site-config.js` updates `input[name=q]` placeholder; predictive search results are proxied & AnnR-rebranded via `src/routes/$.ts`. |

---

## 2. Element-by-Element Control Matrix

| Storefront Feature / Element | Admin Route | Shared State Key (`SiteConfig` / `State`) | Verification Status |
| :--- | :--- | :--- | :--- |
| **Product CRUD, status (`active`/`draft`/`archived`), duplicate, delete** | `/admin/products`, `/admin/products/$handle` | `state.products` → `cfg.products` | Verified (Live on cards & product pages) |
| **Product title, price, compare-at price, badge, description, size chart, images, stock** | `/admin/products/$handle` | `cfg.products[handle]` | Verified (Live on cards & product pages) |
| **Collection CRUD, title, description, hero image, visibility, sort order, product membership** | `/admin/collections` | `state.collections` → `cfg.collections` | Verified (Live on collection pages) |
| **Info & policy page CRUD, title, body text, visibility, SEO** | `/admin/pages`, `/admin/website` | `state.pages` → `cfg.pages` | Verified (Live on `/pages/*` & `/policies/*`) |
| **Custom block pages (`/p/$slug`) & 8 block types with live responsive preview** | `/admin/website`, `/admin/website/$id` | `site.customPages` | Verified (Live at `/p/$slug` & header menu) |
| **Section order (drag-and-drop / arrows), visibility, padding, background, alignment, width, device** | `/admin/sections` | `site.sections[tpl]` | Verified (`home`, `product`, `collection`, `page`) |
| **Duplicate existing section, remove copy/added section, add new section (`text`, `image`, `cta`)** | `/admin/sections` | `site.sections[tpl]` (`copyOf`, `added`) | Verified (Injected & ordered above footer) |
| **Global or page-scoped text replacements** | `/admin/content` | `site.texts` | Verified (DOM TreeWalker replacement) |
| **Global or page-scoped image/video replacements (`src`, `srcset`, `poster`, `alt`, `object-position`)** | `/admin/content` + `/admin/media` | `site.images`, `site.media` | Verified (Live across `img`, `source`, `video`) |
| **Announcement bar (toggle, text, URL, colours, device)** | `/admin/content` | `site.announcement` | Verified (`#adm-announce` top bar) |
| **Promotional popup (toggle, title, message, CTA button/link, delay seconds, once-per-visitor)** | `/admin/content` | `site.popup` | Verified (`#adm-popup` modal) |
| **Header navigation items (label, URL, new tab, device, visibility, order, add/delete)** | `/admin/navigation` | `site.header.items` | Verified (`.header-menu` DOM sync) |
| **Header options (show VIP button, show cart button, sticky header, extra CTA button)** | `/admin/navigation` | `site.header` | Verified (Live CSS & CTA injection) |
| **Footer menu columns & links (add/edit/reorder/hide/delete columns & links)** | `/admin/navigation` | `site.footer.columns` | Verified (`.footer-column.menu-column`) |
| **Footer toggles (newsletter, contact email, payment icons), contact email/label, copyright** | `/admin/navigation` | `site.footer`, `site.general` | Verified (Live on all pages) |
| **Social profile URLs (`instagram`, `facebook`, `tiktok`, `discord`, `youtube`, `x`)** | `/admin/settings` | `site.social` | Verified (Updates footer social links) |
| **Design tokens (background, text, accent, header/footer colours, light/dark mode)** | `/admin/theme` | `site.design` | Verified (Early `<style data-admin>` injection) |
| **Typography (heading font, body font, font scale)** | `/admin/theme` | `site.design` | Verified (Allowlisted fonts & scale) |
| **Buttons, inputs & layout (button colours, button/input border radius, max container width)** | `/admin/theme` | `site.design` | Verified (Live CSS rules) |
| **Logo, logo alt, secondary logo, favicon** | `/admin/theme` | `site.general` | Verified (`.header-logo`, `.footer-logo`, `link[rel~='icon']`) |
| **Store features (page transition toggle, product labels toggle, sanitized custom CSS)** | `/admin/theme` | `site.technical` | Verified (Live on storefront) |
| **Media library (magic-byte validated image uploads ≤ 400 KB, external URLs, alt/caption, usage tracker)** | `/admin/media` | `site.media` | Verified (`sniffImage()` + `mediaUsage()`) |
| **Forms configuration (`newsletter`, `search`, `vip-login`, `vip-register`)** | `/admin/forms` | `site.forms` | Verified (Wording/placeholders/consent live) |
| **SEO defaults (home title, title pattern, default description, OG image, canonical base, `noindex`, bulk table)** | `/admin/seo` | `site.seo`, `products`, `collections`, `pages` | Verified (Live head tags + `/admin/analytics/seo` audit) |
| **Maintenance mode overlay, custom 404 / hidden-page message, cookie consent banner** | `/admin/settings` | `site.technical`, `site.cookie` | Verified (`#adm-maint`, `#adm-404`, `#adm-cookie`) |
| **Draft vs. published diff, responsive iframe preview (`?preview=1`), 10-version rollback history** | `/admin/publish` | `shihiko-site-draft`, `shihiko-site-config`, `shihiko-site-history` | Verified (Full lifecycle working) |
| **12 Analytics reports, shared filter bar, Demo vs. Local browser events, CSV export, real broken-link checker** | `/admin/analytics/$report` | `src/admin/analytics/provider.ts`, `shihiko-events` | Verified (Clearly labelled Demo / Local) |
| **Users & RBAC permissions, Activity Log, 12-section Security Center** | `/admin/users`, `/admin/activity`, `/admin/security` | `src/admin/security/*`, `database/sql/01..07` | Verified (Enforced in UI + prepared in SQL) |

---

## 3. Remaining Backend-Dependent Functionality (Requires Supabase / Live Backend Connection)

The following capabilities are intentionally **not faked** in the browser-only admin and require connecting the prepared Supabase backend (`database/sql/01..07` / `supabase/migrations/20261028000001..07`) or a Shopify Admin API integration:

1. **Multi-User Persistence & Shared Publishing**:
   - Currently, draft and published state live in browser `localStorage` (`src/admin/services/dataSource.ts`). Connecting Supabase switches storage to `public.products`, `public.collections`, `public.site_pages`, and `public.site_config_versions` (via `public.publish_site_config()`).
2. **Server-Verified Admin Authentication, TOTP MFA & Password Recovery**:
   - Currently uses the hardened browser demo login (`src/admin/security/auth.ts`). Connecting Supabase Auth enables real multi-user accounts, email password reset, session revocation, and `aal2` TOTP MFA enforcement (`public.is_mfa_verified()`).
3. **Database-Enforced RBAC & Append-Only Audit Log**:
   - Role permissions (`src/admin/security/permissions.ts`) and activity logs are enforced at the PostgreSQL layer once `database/sql/02_audit_log.sql`, `03_rbac.sql`, `04_grants.sql`, and `05_rls_policies.sql` are executed.
4. **Live Checkout, Orders, Customers, Discounts & Form Submissions**:
   - Storefront cart, checkout, and customer login currently proxy to the live Shopify store (`src/routes/$.ts`). Admin Orders (`/admin/orders`), Customers (`/admin/customers`), and Discounts (`/admin/discounts`) edit local sample records until connected to `public.orders` (`public.create_validated_order` / `public.update_order_status`), `public.profiles`, `public.discounts`, and `public.contact_submissions`.
5. **Cloud File Storage (`public-media` & `private-documents`)**:
   - Uploaded images are validated by magic bytes (`sniffImage()`) and stored as data URLs in browser storage (max 400 KB). Executing `database/sql/07_storage.sql` enables permanent Supabase Storage buckets.
6. **Cross-Visitor Analytics, Cohorts & Search Console Queries**:
   - Analytics currently offers **Demo data** (deterministic sample numbers) and **Local (this browser)** real event tracking (`window.shihikoTrack`). Cross-visitor aggregation, retention cohorts, and Google Search Console click metrics require connecting `public.analytics_events` or GA4/Plausible/Search Console APIs.
7. **Server-Served `robots.txt` & Sitemap**:
   - `site.seo.robots` is saved in configuration and requires a backend config reader on the server route to serve dynamically across all visitors.
