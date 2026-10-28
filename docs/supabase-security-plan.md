# AnnR Supabase & PostgreSQL Security Architecture (`docs/supabase-security-plan.md`)

> **Execution Policy**: All database migrations and verification scripts are prepared in `database/sql/01..07` and mirrored in `supabase/migrations/20261028000001..07`. None of these scripts have been executed automatically; execute them manually in the Supabase SQL Editor when connecting your project.

---

## 1. Migration Execution Order

Run these 7 idempotent SQL files in strict numerical order inside the Supabase SQL Editor (as `postgres`):

| Order | File (`database/sql/` & `supabase/migrations/`) | Purpose & Key Security Controls |
| :---: | :--- | :--- |
| **1** | `01_core_schema.sql` (`20261028000001_core_schema.sql`) | Creates `pgcrypto` extension, private `security` schema (`revoke all on schema security from public, anon, authenticated`), 17 domain tables with strict `CHECK` constraints, `touch_updated_at()` trigger, and `handle_new_user()` profile trigger (never assigns a role on sign-up). |
| **2** | `02_audit_log.sql` (`20261028000002_audit_log.sql`) | Creates `security.audit_log`, `security.forbid_audit_mutation()` trigger (blocks `UPDATE`, `DELETE`, `TRUNCATE`), `security.audit()` helper, and automatic row-change audit triggers on sensitive tables (`products`, `product_variants`, `inventory`, `orders`, `discounts`, `site_pages`, `site_config_versions`, `user_roles`). |
| **3** | `03_rbac.sql` (`20261028000003_rbac.sql`) | Defines `public.app_role` (8 roles), `public.user_roles`, `public.role_permissions` (23 permissions), `public.has_permission(_perm)`, `public.is_mfa_verified()` (`aal = 'aal2'`), `public.grant_role()`, `public.revoke_role()` (blocks self-promotion/demotion), and `public.read_audit_log()`. |
| **4** | `04_grants.sql` (`20261028000004_grants.sql`) | Runs `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` on all 19 public tables; revokes default `PUBLIC` privileges and grants only explicit table/column operations to `anon` and `authenticated`. |
| **5** | `05_rls_policies.sql` (`20261028000005_rls_policies.sql`) | Defines deny-by-default Row Level Security policies across all 19 tables separating `anon`, customer (`auth.uid() = user_id`), and staff (`public.has_permission(...)`). |
| **6** | `06_rpc_functions.sql` (`20261028000006_rpc_functions.sql`) | Defines `SECURITY DEFINER` RPCs (`set search_path = ''`): `publish_site_config`, `adjust_inventory`, `update_order_status`, `check_discount_code`, `purge_old_audit_logs`, and `create_validated_order`. |
| **7** | `07_storage.sql` (`20261028000007_storage.sql`) | Configures `public-media` (400 KB max, raster MIME allowlist, no SVG) and `private-documents` (10 MB max, PDF only) buckets and `storage.objects` RLS policies. |

After running `01..07`, execute `database/tests/rls_verification.sql` (`supabase/tests/rls_verification.sql`) in the SQL Editor. It runs inside `BEGIN ... ROLLBACK` and raises an exception if any of its 10 security assertions fail.

---

## 2. Table-by-Table Access Matrix (19 Public Tables + 1 Private Table)

| Table | `anon` (Public Visitor) | `authenticated` (Customer) | Admin / Staff Roles (via `has_permission`) | Direct Client Write? |
| :--- | :--- | :--- | :--- | :--- |
| `public.profiles` | Deny | `SELECT`, `UPDATE` own row (`id = auth.uid()`) | `SELECT` with `customers.read` | Own profile only |
| `public.collections` | `SELECT` (`status = 'active'`) | `SELECT` (`status = 'active'`) | `SELECT` (`catalog.read`), `ALL` (`catalog.write`) | Staff with `catalog.write` |
| `public.products` | `SELECT` (`status = 'active'`) | `SELECT` (`status = 'active'`) | `SELECT` (`catalog.read`), `ALL` (`catalog.write`) | Staff with `catalog.write` |
| `public.product_images` | `SELECT` (if product active) | `SELECT` (if product active) | `SELECT` (`catalog.read`), `ALL` (`catalog.write`) | Staff with `catalog.write` |
| `public.product_variants` | `SELECT` (if product active) | `SELECT` (if product active) | `SELECT` (`catalog.read`), `ALL` (`catalog.write` + `pricing.write`) | Staff with `pricing.write` |
| `public.inventory` | `SELECT` (if product active) | `SELECT` (if product active) | `SELECT` (`catalog.read`), write via `adjust_inventory` RPC (`inventory.write`) | **RPC / Staff only** |
| `public.collection_products` | `SELECT` | `SELECT` | `ALL` (`catalog.write`) | Staff with `catalog.write` |
| `public.site_pages` | `SELECT` (`status = 'published'`) | `SELECT` (`status = 'published'`) | `SELECT` (`content.read`), `ALL` (`content.write`) | Staff with `content.write` |
| `public.site_config_versions` | `SELECT` (`is_published = true`) | `SELECT` (`is_published = true`) | `SELECT` (`content.read`), publish via `publish_site_config` RPC (`site.publish`) | **RPC / Staff only** |
| `public.media_assets` | `SELECT` (`bucket = 'public-media'`) | `SELECT` (`bucket = 'public-media'`) | `SELECT` (`content.read`), `ALL` (`media.write`) | Staff with `media.write` |
| `public.customer_addresses` | Deny | `SELECT`, `INSERT`, `UPDATE`, `DELETE` own (`user_id = auth.uid()`) | `SELECT` (`customers.read`) | Customer own rows only |
| `public.saved_items` | Deny | `SELECT`, `INSERT`, `DELETE` own (`user_id = auth.uid()`) | Deny | Customer own rows only |
| `public.orders` | Deny | `SELECT` own (`user_id = auth.uid()`) | `SELECT` (`orders.read`); status via `update_order_status` RPC (`orders.write` / `refunds.issue`) | **RPC only (`create_validated_order`)** |
| `public.order_items` | Deny | `SELECT` own (via parent order) | `SELECT` (`orders.read`) | **RPC only (`create_validated_order`)** |
| `public.discounts` | Validate single code via `check_discount_code(_code)` RPC | Validate single code via `check_discount_code(_code)` RPC | `ALL` (`marketing.write`) | Staff with `marketing.write` |
| `public.contact_submissions` | `INSERT` (`status = 'new'`) | `INSERT` (`status = 'new'`) | `SELECT`, `UPDATE` (`content.read` / `customers.read`) | Insert-only for public |
| `public.analytics_events` | `INSERT` (sanitized path) | `INSERT` (sanitized path) | `SELECT` (`analytics.read`) | Insert-only for public |
| `public.user_roles` | Deny | `SELECT` own roles (`user_id = auth.uid()`) | `SELECT` (`users.manage`), mutate via `grant_role` / `revoke_role` RPC (`roles.manage`) | **RPC only (`super_admin`)** |
| `public.role_permissions` | Deny | `SELECT` | `SELECT` | Seeded by migration only |
| `security.audit_log` | Deny (private schema) | Deny (private schema) | Read via `public.read_audit_log()` RPC (`audit.read`) | **Append-only via server triggers** |

---

## 3. Supabase Auth & MFA Hardening Checklist

1. **Email + Password & TOTP MFA**:
   - Enable TOTP (Authenticator App) MFA in Supabase Dashboard -> Authentication -> Multi-Factor.
   - Require every `super_admin` and `admin` to enroll a TOTP factor immediately after first login.
   - To enforce MFA on all privileged operations at the database layer, uncomment the `public.is_mfa_verified()` check inside `public.has_permission()` in `database/sql/03_rbac.sql`.
2. **Disable Self-Role Assignment**:
   - Roles are stored exclusively in `public.user_roles`. Never read roles from `auth.users.raw_user_meta_data` (which is user-editable via `supabase.auth.updateUser()`).
3. **Bootstrap First `super_admin`**:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'super_admin'::public.app_role
     from auth.users
    where lower(email) = lower('ratul123@gmail.com')
   on conflict (user_id, role) do nothing;
   ```
4. **Environment Variables (`.env.local`)**:
   - Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - Never place `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_...` in any `VITE_*` variable.

