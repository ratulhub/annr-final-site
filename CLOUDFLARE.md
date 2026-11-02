# Cloudflare Workers Direct GitHub Deployment Guide

This repository (`annr-final-site`) is fully configured for direct deployment to **Cloudflare Workers** with native Git integration, static asset bindings, and SSR routing.

---

## Method 1: Cloudflare Dashboard Direct Git Connect (Recommended)

Cloudflare Workers can continuously build and deploy directly on every push to your GitHub `main` branch.

### Step 1: Open Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **Compute (Workers) > Workers & Pages** (or **Workers**).
3. Click **Create application** > **Connect to Git** (Workers Builds).

### Step 2: Select GitHub Repository
1. Authorize and select: `ratulhub/annr-final-site`.
2. Select **Production branch**: `main`.

### Step 3: Verify Build Settings
The repository includes `wrangler.json`, `.node-version`, and `.nvmrc` configured for Cloudflare:
- **Project / Worker Name**: `annr-final-site`
- **Framework / Preset**: `Nitro` / `Custom`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`
- **Root directory**: `/` (leave blank)
- **Node.js version**: `20` (auto-detected via `.node-version`)

### Step 4: Environment Variables (Optional)
Under **Environment Variables**, add any production values:
- `VITE_SUPABASE_URL`: *(Your Supabase project URL, e.g. `https://xyz.supabase.co`)*
- `VITE_SUPABASE_PUBLISHABLE_KEY`: *(Your Supabase anon/publishable key)*

*(If not provided, the storefront and admin panel will seamlessly run in local demo mode using localStorage).*

### Step 5: Deploy
Click **Save and Deploy**. Cloudflare will:
1. Run `npm ci`
2. Run `npm run build` (Nitro compiles static files to `.output/public` and the server worker to `.output/server`)
3. Execute `npx wrangler deploy` to publish the worker and upload all assets to Cloudflare's edge CDN.

---

## Method 2: Automated GitHub Actions CI/CD

A pre-configured GitHub Actions workflow is included at [`.github/workflows/deploy-cloudflare.yml`](./.github/workflows/deploy-cloudflare.yml).

To activate it:
1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: A Cloudflare API token with `Workers Scripts: Edit` and `Account: Read` permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on the Workers overview page).
3. Every `git push origin main` will automatically test, build, and deploy.

---

## Local Verification Commands

You can test Cloudflare packaging locally at any time:

```bash
# 1. Run tests
npm test

# 2. Build production assets & server worker
npm run build

# 3. Dry-run Wrangler deployment
npx wrangler deploy --dry-run

# 4. Deploy live directly from local terminal
npx wrangler deploy
```

---

## Architecture Summary
- **Worker Configuration**: Root [`wrangler.json`](./wrangler.json) with `compatibility_date: 2026-11-01` and `nodejs_compat`.
- **Static Assets Binding**: `env.ASSETS` points to `.output/public` (serves static storefront, fonts, CDN images, CSS, and JS).
- **Server Entry**: `.output/server/index.mjs` handles SSR, cart API pass-through, and dynamic rewrites.
- **Security & Headers**: Static caching and security headers defined in [`public/_headers`](./public/_headers).
