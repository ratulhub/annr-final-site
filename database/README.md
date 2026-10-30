# AnnR Database & Security Runbook (`database/README.md`)

This folder (and its identical Supabase CLI mirror in `supabase/migrations/` and `supabase/tests/`) contains the complete PostgreSQL / Supabase schema, append-only security audit log, role-based access control (RBAC), Row Level Security (RLS) policies, storage rules, and verification test suite for the AnnR store and Super Admin Panel.

> [!IMPORTANT]
> Until you run these scripts on your database and configure `.env.local`, the admin panel runs in **Demo / Browser-Only Mode** and reports `Not connected` in `/admin/security`.

---

## §1. Overview & Architecture

- **Private Security Schema (`security`)**: Not exposed through the Data API. Holds `security.audit_log` and internal triggers.
- **Public Schema (`public`)**: Holds 19 application tables with `ENABLE` + `FORCE ROW LEVEL SECURITY` and least-privilege grants.
- **RBAC (`public.user_roles` & `public.role_permissions`)**: Mirrors `src/admin/security/permissions.ts` (8 roles, 23 permissions). Roles are never stored on `public.profiles` or `auth.users` metadata.
- **Trusted Writes (`SECURITY DEFINER` RPCs)**: Role changes (`grant_role`, `revoke_role`), publishing (`publish_site_config`), inventory adjustments (`adjust_inventory`), order status updates (`update_order_status`), and authoritative order creation (`create_validated_order`) validate caller permissions/stock/prices on the server and write to `security.audit_log`.

---

## §2. Prerequisites

- A PostgreSQL 15+ / Supabase database with `auth` and `storage` schemas available.
- Access to the SQL Editor as the database owner (`postgres`).

---

## §3. Running Migrations (`01` → `07`) in One Sitting

Run the files in `database/sql/` (or `supabase/migrations/`) in strict numerical order inside the SQL Editor:

1. `database/sql/01_core_schema.sql` (`supabase/migrations/20261028000001_core_schema.sql`) — Creates extensions, `security` schema, and all core tables/triggers.
2. `database/sql/02_audit_log.sql` (`supabase/migrations/20261028000002_audit_log.sql`) — Creates `security.audit_log`, immutability trigger, and row-change audit triggers.
3. `database/sql/03_rbac.sql` (`supabase/migrations/20261028000003_rbac.sql`) — Creates `public.app_role`, `user_roles`, `role_permissions`, `has_permission()`, `is_mfa_verified()`, `grant_role()`, `revoke_role()`, and `read_audit_log()`.
4. `database/sql/04_grants.sql` (`supabase/migrations/20261028000004_grants.sql`) — Enables and forces RLS on all 19 tables and sets least-privilege grants for `anon` and `authenticated`.
5. `database/sql/05_rls_policies.sql` (`supabase/migrations/20261028000005_rls_policies.sql`) — Creates deny-by-default RLS policies across all 19 tables.
6. `database/sql/06_rpc_functions.sql` (`supabase/migrations/20261028000006_rpc_functions.sql`) — Creates audited server RPC functions (`publish_site_config`, `adjust_inventory`, `update_order_status`, `check_discount_code`, `purge_old_audit_logs`, `create_validated_order`).
7. `database/sql/07_storage.sql` (`supabase/migrations/20261028000007_storage.sql`) — Configures `public-media` (400 KB max, raster images only, no SVG) and `private-documents` (10 MB max, PDF only) storage buckets and object policies.

All scripts use `IF NOT EXISTS`, `CREATE OR REPLACE`, and `DROP POLICY IF EXISTS`, making them safe to re-run.

---

## §4. Bootstrapping the First Super Admin

Because `public.grant_role()` requires a caller who already has `roles.manage` (and forbids self-elevation), the **first** `super_admin` must be inserted manually by the database owner in the SQL Editor after that user signs up through Auth:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin'::public.app_role
  from auth.users
 where lower(email) = lower('ratul123@gmail.com')
on conflict (user_id, role) do nothing;
```

Immediately after signing in as the first `super_admin`, enrol in authenticator-app MFA (TOTP).

---

## §5. Running the RLS Verification Tests

Before connecting the frontend, run `database/tests/rls_verification.sql` in the SQL Editor.
- The script runs inside `BEGIN ... ROLLBACK` so it leaves zero test data behind.
- If any table lacks forced RLS, or if any BOLA/RBAC/audit-log check fails, the script aborts with a `SECURITY FAILURE` exception.

---

## §6. Connecting the Frontend

1. Copy `.env.example` to `.env.local`.
2. Fill in only the **public** URL and publishable/anon key:
   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. **Never** place `service_role` or `sb_secret_...` keys in any `VITE_*` variable or client file.

---

## §7. Audit Log Retention & Scheduled Purge (400 Days)

`security.audit_log` is append-only (`UPDATE`, `DELETE`, and `TRUNCATE` are blocked by `audit_no_update`). To retain 400 days of history and purge older rows, schedule the owner-only maintenance function `security.purge_old_audit_logs(400)` via `pg_cron` (run as `postgres`):

```sql
select cron.schedule(
  'purge-security-audit-log',
  '15 3 * * *',
  $$select security.purge_old_audit_logs(400);$$
);
```

