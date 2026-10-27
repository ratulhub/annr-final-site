-- =====================================================================================
-- 04 GRANTS & RLS ENABLEMENT — run after 03.
-- Enables and forces Row Level Security on every public table and sets least-privilege
-- table/column grants for anon and authenticated roles.
-- Safe to re-run. Without 05_rls_policies.sql, enabling RLS denies all rows by default.
-- =====================================================================================

-- 1. Enable and FORCE Row Level Security on every public table.
do $$ declare t text; begin
  foreach t in array array[
    'profiles','collections','products','product_images','product_variants','inventory',
    'collection_products','site_pages','site_config_versions','media_assets',
    'customer_addresses','saved_items','orders','order_items','discounts',
    'contact_submissions','analytics_events','user_roles','role_permissions'
  ] loop
    execute format('alter table public.%1$I enable row level security; alter table public.%1$I force row level security;', t);
  end loop;
end $$;

-- 2. Revoke all default table/sequence privileges from public, anon, authenticated.
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- 3. Storefront read grants (anon + authenticated; filtered by RLS in 05 to active/published rows).
grant select on
  public.collections,
  public.products,
  public.product_images,
  public.product_variants,
  public.collection_products,
  public.site_pages,
  public.site_config_versions,
  public.media_assets
to anon, authenticated;

-- 4. Storefront public submission grants (write-only for anon; no SELECT for anon).
grant insert (form, name, email, message, user_id) on public.contact_submissions to anon, authenticated;
grant insert (name, path, props, session_hash) on public.analytics_events to anon, authenticated;
grant usage, select on sequence public.analytics_events_id_seq to anon, authenticated;

-- 5. Authenticated customer & staff grants (every operation is gated by RLS in 05).
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.customer_addresses, public.saved_items to authenticated;

-- Staff catalog, content, marketing, and media management (RLS enforces has_permission()).
grant select, insert, update, delete on
  public.collections,
  public.products,
  public.product_images,
  public.product_variants,
  public.inventory,
  public.collection_products,
  public.site_pages,
  public.media_assets,
  public.discounts
to authenticated;

grant select, insert, update on public.site_config_versions to authenticated;
grant usage, select on sequence public.site_config_versions_id_seq to authenticated;

-- Staff & customer order visibility (orders are created by trusted server code; status updates via 06 RPC or orders.write).
grant select on public.orders, public.order_items to authenticated;
grant update (status, payment_status) on public.orders to authenticated;

-- Staff read/triage of form submissions and analytics.
grant select, update (status) on public.contact_submissions to authenticated;
grant select on public.analytics_events to authenticated;

-- RBAC tables: read-only for authenticated (RLS restricts who sees what); writes ONLY via grant_role/revoke_role (03).
grant select on public.user_roles, public.role_permissions to authenticated;
