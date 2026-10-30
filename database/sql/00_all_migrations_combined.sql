-- =====================================================================================
-- ANNR COMPLETE PRODUCTION DATABASE SETUP (01 THROUGH 07 COMBINED)
-- Safe to run in Supabase SQL Editor in one click.
-- =====================================================================================

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 01_core_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 01 CORE SCHEMA — AnnR store + admin
-- Run FIRST. Creates tables only (no data, no destructive statements).
-- Safe to re-run: objects use IF NOT EXISTS / CREATE OR REPLACE.
-- Run 01 → 07 in one sitting: tables are only reachable through the Data API after 04 sets grants.
-- Money: numeric(12,2) in BDT. No card numbers, CVVs or passwords are ever stored here.
-- =====================================================================================

create extension if not exists pgcrypto;

-- Private schema for security internals (not exposed through the Data API).
create schema if not exists security;
revoke all on schema security from public, anon, authenticated;

-- ---------- Profiles (one per auth user) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  phone        text check (char_length(phone) <= 30),
  accepts_marketing boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Catalog ----------
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  handle      text not null unique check (handle ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 10000),
  image_url   text check (image_url ~ '^(https://|/)'),
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order  int not null default 0,
  seo_title   text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  handle      text not null unique check (handle ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 20000),
  vendor      text check (char_length(vendor) <= 100),
  product_type text check (char_length(product_type) <= 100),
  tags        text[] not null default '{}',
  price       numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency    char(3) not null default 'BDT',
  status      text not null default 'draft' check (status in ('draft','active','archived')),
  seo_title   text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_status_idx on public.products(status);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null check (url ~ '^(https://|/)'),
  alt         text check (char_length(alt) <= 200),
  position    int not null default 0
);
create index if not exists product_images_product_idx on public.product_images(product_id);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  sku         text unique check (char_length(sku) <= 64),
  option_size text check (char_length(option_size) <= 40),
  option_color text check (char_length(option_color) <= 40),
  price       numeric(12,2) check (price is null or price >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- Inventory is separate so only trusted roles can write stock counts.
create table if not exists public.inventory (
  variant_id  uuid primary key references public.product_variants(id) on delete cascade,
  on_hand     int not null default 0 check (on_hand >= 0),
  reserved    int not null default 0 check (reserved >= 0 and reserved <= on_hand),
  updated_at  timestamptz not null default now()
);

create table if not exists public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  position      int not null default 0,
  primary key (collection_id, product_id)
);

-- ---------- Website content ----------
create table if not exists public.site_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  title       text not null check (char_length(title) between 1 and 200),
  blocks      jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) < 512000),
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Draft vs published site configuration (header, footer, design, sections, SEO…). One row per version.
create table if not exists public.site_config_versions (
  id           bigint generated always as identity primary key,
  config       jsonb not null check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 2000000),
  is_published boolean not null default false,
  note         text check (char_length(note) <= 200),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create unique index if not exists site_config_one_published on public.site_config_versions(is_published) where is_published;

create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null check (bucket in ('public-media','private-documents')),
  path        text not null check (path ~ '^[a-z0-9/_.-]{1,200}$' and path !~ '\.\.'),
  mime_type   text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/avif','application/pdf')),
  size_bytes  int not null check (size_bytes > 0 and size_bytes <= 10485760),
  alt         text check (char_length(alt) <= 200),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

-- ---------- Customers ----------
create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) <= 120),
  line1       text not null check (char_length(line1) <= 200),
  line2       text check (char_length(line2) <= 200),
  city        text not null check (char_length(city) <= 100),
  postal_code text check (char_length(postal_code) <= 20),
  country     char(2) not null default 'BD',
  phone       text check (char_length(phone) <= 30),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id);

create table if not exists public.saved_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Orders (money and payment fields written ONLY by trusted server code) ----------
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null check (char_length(email) <= 254),
  status       text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled','refunded','partially_refunded')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','authorized','paid','refunded','failed')),
  subtotal     numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total        numeric(12,2) not null check (total >= 0),
  currency     char(3) not null default 'BDT',
  payment_provider_ref text check (char_length(payment_provider_ref) <= 200), -- provider id only, never card data
  idempotency_key text unique check (char_length(idempotency_key) <= 100),
  shipping_address jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  title       text not null check (char_length(title) <= 200),
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  quantity    int not null check (quantity between 1 and 20)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- Marketing ----------
create table if not exists public.discounts (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9_-]{3,40}$'),
  kind        text not null check (kind in ('percent','fixed')),
  value       numeric(12,2) not null check (value > 0),
  max_uses    int check (max_uses is null or max_uses > 0),
  used_count  int not null default 0 check (used_count >= 0),
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default false,
  check (kind <> 'percent' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ---------- Forms (anyone may submit; only staff read) ----------
create table if not exists public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  form        text not null check (form in ('contact','newsletter','vip')),
  name        text check (char_length(name) <= 120),
  email       text not null check (email ~* '^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$'),
  message     text check (char_length(message) <= 5000),
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'new' check (status in ('new','read','closed','spam')),
  created_at  timestamptz not null default now()
);
create index if not exists contact_submissions_created_idx on public.contact_submissions(created_at);

-- ---------- Analytics (no personal data) ----------
create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  name         text not null check (name ~ '^[a-z_]{2,40}$'),
  path         text check (char_length(path) <= 300 and path !~ '[?#]'),  -- no query strings (may hold emails/tokens)
  props        jsonb not null default '{}'::jsonb check (pg_column_size(props) < 4000),
  session_hash text check (char_length(session_hash) <= 64),             -- random per-visit id, not a user id
  created_at   timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at);

-- updated_at helper (no privileges needed; fixed search_path).
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','collections','products','site_pages','orders'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I; create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- New sign-ups get an empty profile (never a role).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values (new.id) on conflict do nothing; return new; end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 02_audit_log.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 02 SECURITY AUDIT LOG — run after 01.
-- Lives in the private "security" schema: not reachable through the Data API.
-- Append-only: UPDATE/DELETE/TRUNCATE are blocked by trigger. Read via public.read_audit_log() (03).
-- Never store passwords, tokens, keys or card data in metadata (the writer strips such keys).
-- Retention: keep 400 days; purge with a scheduled server job run by the database owner (README §7).
-- =====================================================================================

create table if not exists security.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  action      text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type text not null check (char_length(target_type) <= 60),
  target_id   text check (char_length(target_id) <= 120),
  result      text not null check (result in ('success','denied','failed')),
  metadata    jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 4000)
);
create index if not exists audit_log_at_idx on security.audit_log(at desc);
revoke all on security.audit_log from public, anon, authenticated;

create or replace function security.audit_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'audit log is append-only' using errcode = '42501'; end $$;
drop trigger if exists audit_no_update on security.audit_log;
create trigger audit_no_update before update or delete or truncate on security.audit_log
  for each statement execute function security.audit_immutable();

-- Internal writer. Not callable by API roles.
create or replace function security.audit(_action text, _type text, _id text, _result text, _meta jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into security.audit_log(actor_id, action, target_type, target_id, result, metadata)
  values (auth.uid(), _action, _type, left(_id, 120), _result,
    coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(_meta, '{}'::jsonb)) e(k, v)
              where k !~* '(password|token|secret|key|card|cvv)'), '{}'::jsonb));
end $$;
revoke all on function security.audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- Row-change auditing for sensitive tables (records WHO changed WHAT and WHEN, not the full row).
create or replace function security.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := to_jsonb(coalesce(new, old));
  perform security.audit(tg_table_name || '.' || lower(tg_op), tg_table_name,
    coalesce(r ->> 'id', r ->> 'variant_id', r ->> 'user_id'), 'success', '{}'::jsonb);
  return coalesce(new, old);
end $$;
revoke all on function security.audit_row_change() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['products','product_variants','inventory','collections','site_pages','site_config_versions',
                           'orders','discounts','media_assets'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
  end loop;
end $$;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 03_rbac.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 03 ROLES & PERMISSIONS (RBAC) — run after 02.
-- Roles live in their own table, never on profiles. Mirrors src/admin/security/permissions.ts.
-- Nobody can write roles through the Data API (no write grants, no write policies). The only path is
-- public.grant_role()/revoke_role(): super admins only, never on themselves, always audited.
-- The FIRST super admin is created manually by the database owner (README §4).
-- =====================================================================================

do $$ begin
  create type public.app_role as enum ('super_admin','admin','content_manager','product_manager',
    'order_manager','marketing_manager','analytics_viewer','support_agent');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.role_permissions (
  role       public.app_role not null,
  permission text not null check (permission ~ '^[a-z]+\.[a-z]+$'),
  primary key (role, permission)
);

insert into public.role_permissions(role, permission)
select v.r::public.app_role, p from (values
  ('super_admin', array['catalog.read','catalog.write','inventory.write','pricing.write','content.read','content.write','site.publish','orders.read','orders.write','refunds.issue','customers.read','customers.write','marketing.write','analytics.read','data.export','media.write','settings.write','integrations.write','users.manage','roles.manage','security.read','security.write','audit.read']),
  ('admin',       array['catalog.read','catalog.write','inventory.write','pricing.write','content.read','content.write','site.publish','orders.read','orders.write','refunds.issue','customers.read','customers.write','marketing.write','analytics.read','data.export','media.write','settings.write','integrations.write','users.manage','security.read','audit.read']),
  ('content_manager',  array['catalog.read','content.read','content.write','site.publish','media.write']),
  ('product_manager',  array['catalog.read','catalog.write','inventory.write','pricing.write','media.write','content.read']),
  ('order_manager',    array['orders.read','orders.write','customers.read','catalog.read']),
  ('marketing_manager',array['marketing.write','content.read','content.write','analytics.read','catalog.read']),
  ('analytics_viewer', array['analytics.read']),
  ('support_agent',    array['orders.read','customers.read','catalog.read'])
) v(r, perms), unnest(v.perms) p
on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['user_roles','role_permissions'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
  end loop;
end $$;

-- Permission checks used by every policy. SECURITY DEFINER avoids recursive RLS on user_roles;
-- they only answer about the CALLER (auth.uid()) and take no user id, so they cannot probe others.
create or replace function public.has_permission(_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = _perm)
$$;

create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role)
$$;

revoke all on function public.has_permission(text), public.has_role(public.app_role) from public, anon;
grant execute on function public.has_permission(text), public.has_role(public.app_role) to authenticated;

create or replace function public.grant_role(_user uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('roles.manage') then
    perform security.audit('role.grant', 'user_roles', _user::text, 'denied', jsonb_build_object('role', _role));
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _user = auth.uid() then raise exception 'cannot change your own roles' using errcode = '42501'; end if;
  insert into public.user_roles(user_id, role, granted_by) values (_user, _role, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.revoke_role(_user uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('roles.manage') then
    perform security.audit('role.revoke', 'user_roles', _user::text, 'denied', jsonb_build_object('role', _role));
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _user = auth.uid() then raise exception 'cannot change your own roles' using errcode = '42501'; end if;
  delete from public.user_roles where user_id = _user and role = _role;
end $$;

revoke all on function public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role) from public, anon;
grant execute on function public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role) to authenticated;

create or replace function public.read_audit_log(_limit int default 100, _before bigint default null)
returns setof security.audit_log language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('audit.read') then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select * from security.audit_log
    where _before is null or id < _before order by id desc limit least(greatest(_limit, 1), 500);
end $$;
revoke all on function public.read_audit_log(int, bigint) from public, anon;
grant execute on function public.read_audit_log(int, bigint) to authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 04_grants.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 05_rls_policies.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 05 ROW LEVEL SECURITY POLICIES — run after 04.
-- Deny-by-default: every table has RLS enabled and forced in 04.
-- Policies below grant the minimum access needed for visitors, signed-in customers,
-- and staff roles (checked via public.has_permission() from 03).
-- Safe to re-run: drops each named policy before creating it.
-- =====================================================================================

-- ---------- Profiles ----------
drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_permission('customers.read') or public.has_permission('users.manage'));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_permission('customers.write'))
  with check (id = auth.uid() or public.has_permission('customers.write'));

-- ---------- Collections ----------
drop policy if exists collections_select_public on public.collections;
create policy collections_select_public on public.collections
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('catalog.read'));

drop policy if exists collections_write_staff on public.collections;
create policy collections_write_staff on public.collections
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Products ----------
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select to anon, authenticated
  using (status = 'active' or public.has_permission('catalog.read'));

drop policy if exists products_write_staff on public.products;
create policy products_write_staff on public.products
  for all to authenticated
  using (public.has_permission('catalog.write') and public.has_permission('pricing.write'))
  with check (public.has_permission('catalog.write') and public.has_permission('pricing.write'));

-- ---------- Product Images ----------
drop policy if exists product_images_select_public on public.product_images;
create policy product_images_select_public on public.product_images
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists product_images_write_staff on public.product_images;
create policy product_images_write_staff on public.product_images
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Product Variants ----------
drop policy if exists product_variants_select_public on public.product_variants;
create policy product_variants_select_public on public.product_variants
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists product_variants_write_staff on public.product_variants;
create policy product_variants_write_staff on public.product_variants
  for all to authenticated
  using (public.has_permission('catalog.write') and public.has_permission('pricing.write'))
  with check (public.has_permission('catalog.write') and public.has_permission('pricing.write'));

-- ---------- Inventory ----------
drop policy if exists inventory_select_staff on public.inventory;
create policy inventory_select_staff on public.inventory
  for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('inventory.write'));

drop policy if exists inventory_write_staff on public.inventory;
create policy inventory_write_staff on public.inventory
  for all to authenticated
  using (public.has_permission('inventory.write'))
  with check (public.has_permission('inventory.write'));

-- ---------- Collection Products ----------
drop policy if exists collection_products_select_public on public.collection_products;
create policy collection_products_select_public on public.collection_products
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')
  );

drop policy if exists collection_products_write_staff on public.collection_products;
create policy collection_products_write_staff on public.collection_products
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Site Pages (/p/<slug>) ----------
drop policy if exists site_pages_select_public on public.site_pages;
create policy site_pages_select_public on public.site_pages
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('content.read'));

drop policy if exists site_pages_write_staff on public.site_pages;
create policy site_pages_write_staff on public.site_pages
  for all to authenticated
  using (public.has_permission('content.write'))
  with check (public.has_permission('content.write'));

-- ---------- Site Config Versions (draft vs published) ----------
drop policy if exists site_config_select_public on public.site_config_versions;
create policy site_config_select_public on public.site_config_versions
  for select to anon, authenticated
  using (is_published = true or public.has_permission('content.read'));

drop policy if exists site_config_insert_draft on public.site_config_versions;
create policy site_config_insert_draft on public.site_config_versions
  for insert to authenticated
  with check (
    (is_published = false and public.has_permission('content.write'))
    or (is_published = true and public.has_permission('site.publish'))
  );

drop policy if exists site_config_update_publish on public.site_config_versions;
create policy site_config_update_publish on public.site_config_versions
  for update to authenticated
  using (public.has_permission('site.publish'))
  with check (public.has_permission('site.publish'));

-- ---------- Media Assets ----------
drop policy if exists media_assets_select_public on public.media_assets;
create policy media_assets_select_public on public.media_assets
  for select to anon, authenticated
  using (bucket = 'public-media' or public.has_permission('media.write') or public.has_permission('orders.read'));

drop policy if exists media_assets_write_staff on public.media_assets;
create policy media_assets_write_staff on public.media_assets
  for all to authenticated
  using (public.has_permission('media.write'))
  with check (public.has_permission('media.write'));

-- ---------- Customer Addresses (strict BOLA isolation) ----------
drop policy if exists customer_addresses_select_own_or_staff on public.customer_addresses;
create policy customer_addresses_select_own_or_staff on public.customer_addresses
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission('customers.read'));

drop policy if exists customer_addresses_write_own on public.customer_addresses;
create policy customer_addresses_write_own on public.customer_addresses
  for all to authenticated
  using (user_id = auth.uid() or public.has_permission('customers.write'))
  with check (user_id = auth.uid() or public.has_permission('customers.write'));

-- ---------- Saved Items / Wishlist (strict BOLA isolation) ----------
drop policy if exists saved_items_own on public.saved_items;
create policy saved_items_own on public.saved_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Orders & Order Items ----------
drop policy if exists orders_select_own_or_staff on public.orders;
create policy orders_select_own_or_staff on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission('orders.read'));

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders
  for update to authenticated
  using (public.has_permission('orders.write'))
  with check (
    public.has_permission('orders.write')
    and (
      status not in ('refunded','partially_refunded')
      and payment_status <> 'refunded'
      or public.has_permission('refunds.issue')
    )
  );

drop policy if exists order_items_select_own_or_staff on public.order_items;
create policy order_items_select_own_or_staff on public.order_items
  for select to authenticated
  using (
    public.has_permission('orders.read')
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------- Discounts (never public-listable; checked via 06 RPC) ----------
drop policy if exists discounts_staff on public.discounts;
create policy discounts_staff on public.discounts
  for all to authenticated
  using (public.has_permission('marketing.write'))
  with check (public.has_permission('marketing.write'));

-- ---------- Contact & Form Submissions ----------
drop policy if exists contact_submissions_insert_public on public.contact_submissions;
create policy contact_submissions_insert_public on public.contact_submissions
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));

drop policy if exists contact_submissions_select_staff on public.contact_submissions;
create policy contact_submissions_select_staff on public.contact_submissions
  for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('customers.read'));

drop policy if exists contact_submissions_update_staff on public.contact_submissions;
create policy contact_submissions_update_staff on public.contact_submissions
  for update to authenticated
  using (public.has_permission('content.write') or public.has_permission('customers.write'))
  with check (public.has_permission('content.write') or public.has_permission('customers.write'));

-- ---------- Analytics Events ----------
drop policy if exists analytics_events_insert_public on public.analytics_events;
create policy analytics_events_insert_public on public.analytics_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists analytics_events_select_staff on public.analytics_events;
create policy analytics_events_select_staff on public.analytics_events
  for select to authenticated
  using (public.has_permission('analytics.read'));

-- ---------- RBAC Tables (read-only; writes only via grant_role/revoke_role in 03) ----------
drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.manage') or public.has_permission('security.read'));

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated on public.role_permissions
  for select to authenticated
  using (true);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 06_rpc_functions.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 06 SERVER RPC FUNCTIONS — run after 05.
-- High-risk operations run inside SECURITY DEFINER functions with a fixed search_path,
-- explicit permission checks, and append-only audit logging via security.audit().
-- Safe to re-run.
-- =====================================================================================

-- 1. Publish a site configuration atomically (unpublishes previous live row, inserts new published row).
create or replace function public.publish_site_config(_config jsonb, _note text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare _id bigint;
begin
  if auth.uid() is null or not public.has_permission('site.publish') then
    perform security.audit('site.publish', 'site_config_versions', 'live', 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.site_config_versions set is_published = false where is_published = true;
  insert into public.site_config_versions(config, is_published, note, created_by)
  values (_config, true, left(_note, 200), auth.uid())
  returning id into _id;
  perform security.audit('site.publish', 'site_config_versions', _id::text, 'success', jsonb_build_object('note', left(coalesce(_note, ''), 80)));
  return _id;
end $$;
revoke all on function public.publish_site_config(jsonb, text) from public, anon;
grant execute on function public.publish_site_config(jsonb, text) to authenticated;

-- 2. Adjust variant inventory with audit logging.
create or replace function public.adjust_inventory(_variant_id uuid, _on_hand int, _reserved int default 0)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('inventory.write') then
    perform security.audit('inventory.adjust', 'inventory', _variant_id::text, 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _on_hand < 0 or _reserved < 0 or _reserved > _on_hand then
    raise exception 'invalid inventory counts' using errcode = '22023';
  end if;
  insert into public.inventory(variant_id, on_hand, reserved, updated_at)
  values (_variant_id, _on_hand, _reserved, now())
  on conflict (variant_id) do update
    set on_hand = excluded.on_hand, reserved = excluded.reserved, updated_at = now();
  perform security.audit('inventory.adjust', 'inventory', _variant_id::text, 'success',
    jsonb_build_object('on_hand', _on_hand, 'reserved', _reserved));
end $$;
revoke all on function public.adjust_inventory(uuid, int, int) from public, anon;
grant execute on function public.adjust_inventory(uuid, int, int) to authenticated;

-- 3. Update order fulfilment / payment status (refunds require refunds.issue permission).
create or replace function public.update_order_status(_order_id uuid, _status text, _payment_status text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('orders.write') then
    perform security.audit('order.status', 'orders', _order_id::text, 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if (_status in ('refunded','partially_refunded') or _payment_status = 'refunded')
     and not public.has_permission('refunds.issue') then
    perform security.audit('order.refund', 'orders', _order_id::text, 'denied', '{}'::jsonb);
    raise exception 'refunds.issue permission required' using errcode = '42501';
  end if;
  update public.orders
     set status = _status,
         payment_status = coalesce(_payment_status, payment_status),
         updated_at = now()
   where id = _order_id;
  perform security.audit('order.status', 'orders', _order_id::text, 'success',
    jsonb_build_object('status', _status, 'payment_status', _payment_status));
end $$;
revoke all on function public.update_order_status(uuid, text, text) from public, anon;
grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- 4. Validate a single discount code without allowing callers to list all codes.
create or replace function public.check_discount_code(_code text)
returns table(code text, kind text, value numeric) language sql stable security definer set search_path = '' as $$
  select d.code, d.kind, d.value
    from public.discounts d
   where d.code = upper(trim(_code))
     and d.active = true
     and (d.starts_at is null or d.starts_at <= now())
     and (d.ends_at is null or d.ends_at > now())
     and (d.max_uses is null or d.used_count < d.max_uses)
   limit 1;
$$;
revoke all on function public.check_discount_code(text) from public;
grant execute on function public.check_discount_code(text) to anon, authenticated;

-- 5. Owner-only retention purge for security.audit_log (keep 400 days; see database/README.md §7).
-- Temporarily disables the append-only trigger inside the owner function to delete rows older than _keep_days.
create or replace function security.purge_old_audit_logs(_keep_days int default 400)
returns bigint language plpgsql security definer set search_path = '' as $$
declare _deleted bigint;
begin
  if _keep_days < 365 then
    raise exception 'retention must be at least 365 days' using errcode = '22023';
  end if;
  alter table security.audit_log disable trigger audit_no_update;
  delete from security.audit_log where at < now() - make_interval(days => _keep_days);
  get diagnostics _deleted = row_count;
  alter table security.audit_log enable trigger audit_no_update;
  return _deleted;
end $$;
revoke all on function security.purge_old_audit_logs(int) from public, anon, authenticated;

-- 6. Server-authoritative order creation & atomic inventory reservation (Phase 5 E-Commerce Security).
-- Never trusts client-supplied unit prices, subtotals, discounts, or payment status.
create or replace function public.create_validated_order(
  _email text,
  _items jsonb,
  _discount_code text default null,
  _shipping_address jsonb default null,
  _idempotency_key text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := auth.uid();
  _order_id uuid;
  _item jsonb;
  _vid uuid;
  _qty int;
  _unit_price numeric(12,2);
  _title text;
  _on_hand int;
  _reserved int;
  _subtotal numeric(12,2) := 0;
  _discount_total numeric(12,2) := 0;
  _disc record;
begin
  if _uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if _email is null or char_length(trim(_email)) = 0 or char_length(_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) < 1 or jsonb_array_length(_items) > 30 then
    raise exception 'order must contain between 1 and 30 line items' using errcode = '22023';
  end if;

  -- Idempotency guard: prevent duplicate order submission on network retry.
  if _idempotency_key is not null then
    select o.id into _order_id
      from public.orders o
     where o.idempotency_key = left(_idempotency_key, 100)
       and o.user_id = _uid;
    if _order_id is not null then
      return _order_id;
    end if;
  end if;

  -- First pass: validate every variant, check active product status, reserve inventory, and sum authoritative prices.
  for _item in select * from jsonb_array_elements(_items) loop
    _vid := (_item->>'variant_id')::uuid;
    _qty := (_item->>'quantity')::int;
    if _vid is null or _qty is null or _qty < 1 or _qty > 20 then
      raise exception 'invalid item quantity (must be 1..20)' using errcode = '22023';
    end if;

    select coalesce(pv.price, p.price), p.title
      into _unit_price, _title
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.id = _vid and p.status = 'active';
    if not found or _unit_price is null or _unit_price < 0 then
      raise exception 'product variant unavailable' using errcode = '22023';
    end if;

    select inv.on_hand, inv.reserved
      into _on_hand, _reserved
      from public.inventory inv
     where inv.variant_id = _vid
       for update;
    if not found or (_on_hand - _reserved) < _qty then
      raise exception 'insufficient stock for variant %', _vid using errcode = 'P0002';
    end if;

    update public.inventory
       set reserved = reserved + _qty, updated_at = now()
     where variant_id = _vid;

    _subtotal := _subtotal + (_unit_price * _qty);
  end loop;

  -- Optional server-side discount code calculation & usage counter increment.
  if _discount_code is not null and char_length(trim(_discount_code)) > 0 then
    select d.id, d.kind, d.value
      into _disc
      from public.discounts d
     where d.code = upper(trim(_discount_code))
       and d.active = true
       and (d.starts_at is null or d.starts_at <= now())
       and (d.ends_at is null or d.ends_at > now())
       and (d.max_uses is null or d.used_count < d.max_uses)
       for update;
    if not found then
      raise exception 'invalid or expired discount code' using errcode = '22023';
    end if;
    if _disc.kind = 'percent' then
      _discount_total := round(_subtotal * (_disc.value / 100.0), 2);
    else
      _discount_total := least(_subtotal, _disc.value);
    end if;
    update public.discounts set used_count = used_count + 1 where id = _disc.id;
  end if;

  insert into public.orders (
    user_id, email, status, payment_status,
    subtotal, discount_total, shipping_total, total,
    idempotency_key, shipping_address
  ) values (
    _uid, trim(_email), 'pending', 'unpaid',
    _subtotal, _discount_total, 0, greatest(0, _subtotal - _discount_total),
    case when _idempotency_key is not null then left(_idempotency_key, 100) else null end,
    _shipping_address
  ) returning id into _order_id;

  -- Insert order line items using authoritative DB prices.
  for _item in select * from jsonb_array_elements(_items) loop
    _vid := (_item->>'variant_id')::uuid;
    _qty := (_item->>'quantity')::int;
    select coalesce(pv.price, p.price), p.title
      into _unit_price, _title
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.id = _vid;
    insert into public.order_items (order_id, variant_id, title, unit_price, quantity)
    values (_order_id, _vid, left(_title, 200), _unit_price, _qty);
  end loop;

  perform security.audit('order.create', 'orders', _order_id::text, 'success',
    jsonb_build_object('subtotal', _subtotal, 'discount_total', _discount_total, 'total', greatest(0, _subtotal - _discount_total)));
  return _order_id;
end $$;
revoke all on function public.create_validated_order(text, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.create_validated_order(text, jsonb, text, jsonb, text) to authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- START OF FILE: 07_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =====================================================================================
-- 07 STORAGE BUCKETS & POLICIES — run after 06.
-- Creates two buckets:
--   1. public-media (public read, 400 KB max, safe raster images only — SVG blocked)
--   2. private-documents (private, 10 MB max, PDF invoices/documents only)
-- Enforces path hygiene, MIME allowlists, and RBAC permissions on storage.objects.
-- Safe to re-run.
-- =====================================================================================

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('public-media', 'public-media', true, 409600, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
      ('private-documents', 'private-documents', false, 10485760, array['application/pdf'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists storage_public_media_read on storage.objects;
    create policy storage_public_media_read on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'public-media');

    drop policy if exists storage_public_media_write on storage.objects;
    create policy storage_public_media_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'public-media'
        and public.has_permission('media.write')
        and name ~ '^[a-zA-Z0-9/_.-]{1,200}\.(jpg|jpeg|png|webp|gif|avif)$'
        and name !~ '\.\.'
      );

    drop policy if exists storage_public_media_delete on storage.objects;
    create policy storage_public_media_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'public-media' and public.has_permission('media.write'));

    drop policy if exists storage_private_docs_read on storage.objects;
    create policy storage_private_docs_read on storage.objects
      for select to authenticated
      using (bucket_id = 'private-documents' and public.has_permission('orders.read'));

    drop policy if exists storage_private_docs_write on storage.objects;
    create policy storage_private_docs_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'private-documents'
        and public.has_permission('orders.write')
        and name ~ '^[a-zA-Z0-9/_.-]{1,200}\.pdf$'
        and name !~ '\.\.'
      );
  end if;
end $$;

