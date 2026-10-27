# Admin Control Inventory (Part 1)

The storefront is a static mirror of shihiko.com in `public/` (158 HTML pages). Cart, search and recommendations are proxied to the live store by `src/routes/$.ts`.

## Store routes
| Route | Content | Admin control |
|---|---|---|
| `/home.html` | Hero video, collection list, product grids, footer | Settings → meta title/description (live); hero fields in Theme (stored, not yet applied) |
| `/products/<handle>/index.html` (93) | Title, price, images, sizes, description, related products | Products → title, price, status, SEO (live); others stored |
| `/collections/<handle>/index.html` (22) | Product grid | Collections → title/SEO (live on page head) |
| `/pages/<handle>/index.html` | Policies, FAQ, about | Pages → SEO (live on page head) |
| `/account/login`, `/account/register` | VIP login/signup, admin link | Not editable yet |
| Cart drawer, search | Live Shopify via proxy | Not editable (owned by Shopify) |

## Control coverage (Part 2)
Edits save to a **draft**. The store only changes after **Preview & publish → Publish** (last 10 versions can be restored). Add `?preview=1` to any store page to see the draft.

| Store element | Admin control |
|---|---|
| Product title, price, status, SEO | /admin/products, /admin/seo |
| Collection title, visibility, SEO | /admin/collections, /admin/seo |
| Info pages (FAQ, policies): text, visibility, SEO | /admin/pages, /admin/website |
| Hide any store page | /admin/website |
| New pages built from blocks (/p/slug) | /admin/website → Edit |
| Section order, visibility, spacing, background, alignment, width, device (home, product, collection, info pages) | /admin/sections |
| Any wording on any page | /admin/content → Text replacements |
| Any image or video | /admin/content → Image replacements + /admin/media |
| Announcement bar, popup | /admin/content |
| Header menu items, VIP/cart buttons, extra button, sticky | /admin/navigation |
| Footer columns and links, newsletter, contact email, payment icons, copyright | /admin/navigation |
| Colours, fonts, text size, buttons, inputs, page width, header/footer colours, dark mode, custom CSS | /admin/theme |
| Logo, favicon | /admin/theme |
| Page transition, product labels | /admin/theme |
| Newsletter + search wording, consent text | /admin/forms |
| Site SEO defaults, title pattern, noindex, sharing image | /admin/seo |
| Maintenance mode, hidden-page message, cookie notice | /admin/settings |

## Needs a different approach
- Header drop-down contents (Shop, Collections mega menus): renamed/hidden/moved only; inner links edited through Text replacements.
- Cart drawer, checkout, VIP login/signup, search results: run by live Shopify (shihiko.com); wording saved for later.
- Form submissions: forms post to Shopify, so none are recorded here.
- Orders/customers: sample data only; real ones need Shopify or a backend.
- robots.txt, canonical, structured data: saved settings; need a server to serve them.
- Users & roles: needs real login (backend).

## Architecture
- `src/admin/store.ts` state, draft/publish/history, activity log; `src/admin/services/dataSource.ts` storage boundary; `src/admin/services/media.ts` upload boundary.
- `src/admin/site/` site config types, defaults (copied from the original store), section/block registry, field components.
- `public/_ext/site-config.js` applies the published config on every store page.
- Login is a hardcoded demo check; not secure.

## Analytics (Part 3)
- 12 reports at /admin/analytics/<id> share one filter bar (range, custom dates, interval, device, channel, page, compare) and a data-source switch.
- Sources: **Demo Data** (sample numbers, always labelled) or **Local** (real events recorded by `public/_ext/site-config.js` in this browser only). No provider is connected.
- Provider boundary: `src/admin/analytics/provider.ts` (getAnalyticsOverview, getTrafficReport, …, trackEvent via `window.shihikoTrack`).
- SEO report uses real admin data checks; search clicks need Search Console.
- Ecommerce numbers are demo: real orders live in Shopify.

## Gap audit (re-check against Parts 1–3)
| Requirement | Admin control |
|---|---|
| Duplicate / remove / add sections | /admin/sections — Duplicate, Remove (copies & added), Add section (text, image banner, call to action) |
| Configurable dashboard cards | /admin — Customise cards (show/hide, order) |
| Header notifications & account menu | Admin top bar |
| Integrations module | /admin/integrations |
| Users & permissions | /admin/users — staff list + role permission plan (not enforced without backend) |
| Broken links | Analytics → Errors & site health — real link check |
| Configurable Core Web Vitals thresholds | Analytics → Website performance |
| Cohorts / retention | Analytics → Visitors — shown as unavailable until a provider is connected |

## Security & Database Hardening (Part 4)
- **Security Center (`/admin/security`)**: Honest status indicators (`Verified · passing`, `Failed / insecure`, `Not checked`, `Not connected`, `Demo data`), live HTTP header and open-redirect checks, password re-confirmation, RBAC permission matrix, recent browser auth events, and dependency vulnerability report.
- **Frontend & Proxy Hardening**: `src/admin/security/sanitize.ts` (XSS, URL scheme, CSS value/stylesheet, and analytics query stripping mirrored in `public/_ext/site-config.js`), `src/admin/services/media.ts` (`sniffImage()` magic-byte validation blocking SVG), `src/admin/security/auth.ts` (SHA-256 demo login, 5-attempt lockout, 30-min idle / 8-h absolute timeout, 5-min `confirmReauth()`), and `src/routes/$.ts` (open-redirect prevention, method allowlist, 1 MB body cap, `SECURITY_HEADERS`).
- **Database Migrations & Verification (`database/`)**: `database/sql/01_core_schema.sql` through `07_storage.sql`, `database/tests/rls_verification.sql`, and `database/README.md`.
- **Security Documentation (`docs/`)**: `docs/security-report.md`, `docs/security-remediation-plan.md`, and `docs/security-verification-checklist.md`.
