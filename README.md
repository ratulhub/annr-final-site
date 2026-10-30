# AnnR · Streetwear Clothing & Fashion Online Store

Official dynamic storefront and administrative suite for **AnnR** streetwear, apparel, and accessories.

## Architecture

1. **Storefront (`public/`)**:
   - High-performance, SEO-optimized storefront mirroring official AnnR collections and products.
   - Dynamic real-time catalog overrides, search suggestions, and client-side configuration managed via `public/_ext/site-config.js`.
2. **Server & Proxy Router (`src/routes/$.ts`, `src/server.ts`)**:
   - TanStack Start SSR routing with automated static asset fallback.
   - Built-in sliding-window rate limiting, origin/CSRF validation, and strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Permissions-Policy`).
3. **Admin Panel (`/admin/*`)**:
   - Modern, modular control panel for product catalog, collections, dynamic pages, design themes, order management, and RBAC permissions.
4. **Database & Security Layer (`database/`)**:
   - PostgreSQL / Supabase SQL schema migrations (`database/sql/01..07`) with full Row Level Security (RLS) and audited `SECURITY DEFINER` RPCs.

## Development

Requirements: Node.js 20+ and npm.

```sh
# Install dependencies
npm install

# Start local development server (port 8080)
npm run dev

# Run security and unit test suite
npm test

# Type check
npx tsc --noEmit

# Production build
npm run build
```

## Creator Credit
Created by [Ratul](https://ratul.site).
