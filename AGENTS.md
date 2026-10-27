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
