-- >>> FILE: 01_core_schema.sql
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
create index if not exists collections_status_idx on public.collections(status);

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
create index if not exists collection_products_product_idx on public.collection_products(product_id);

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
create index if not exists site_pages_status_idx on public.site_pages(status);

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
create index if not exists saved_items_product_idx on public.saved_items(product_id);

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
create index if not exists order_items_variant_idx on public.order_items(variant_id);

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


-- >>> FILE: 02_audit_log.sql
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


-- >>> FILE: 03_rbac.sql
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

revoke all on function public.has_permission(text), public.has_role(public.app_role) from public;
grant execute on function public.has_permission(text), public.has_role(public.app_role) to anon, authenticated;

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


-- >>> FILE: 04_grants.sql
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


-- >>> FILE: 05_rls_policies.sql
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
  using (id = (select auth.uid()) or public.has_permission('customers.read') or public.has_permission('users.manage'));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_permission('customers.write'))
  with check (id = (select auth.uid()) or public.has_permission('customers.write'));

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
  using (user_id = (select auth.uid()) or public.has_permission('customers.read'));

drop policy if exists customer_addresses_write_own on public.customer_addresses;
create policy customer_addresses_write_own on public.customer_addresses
  for all to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('customers.write'))
  with check (user_id = (select auth.uid()) or public.has_permission('customers.write'));

-- ---------- Saved Items / Wishlist (strict BOLA isolation) ----------
drop policy if exists saved_items_own on public.saved_items;
create policy saved_items_own on public.saved_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Orders & Order Items ----------
drop policy if exists orders_select_own_or_staff on public.orders;
create policy orders_select_own_or_staff on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('orders.read'));

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
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
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
  with check (status = 'new' and (user_id is null or user_id = (select auth.uid())));

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
  using (user_id = (select auth.uid()) or public.has_permission('users.manage') or public.has_permission('security.read'));

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated on public.role_permissions
  for select to authenticated
  using (true);



-- >>> FILE: 06_rpc_functions.sql
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




-- >>> FILE: 07_storage.sql
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



-- >>> FILE: 08_campaign_events_and_page_visibility.sql
-- =====================================================================================
-- 08 CAMPAIGN EVENTS & PAGE VISIBILITY — AnnR store + admin
-- Run after 01 → 07.
-- Adds campaign_events and hidden_pages tables, ensures collections has is_visible,
-- enables and forces RLS, grants least privilege, configures audit logging,
-- and establishes row level security policies.
-- Safe to re-run: objects use IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =====================================================================================

-- ---------- 1. Ensure is_visible column on collections ----------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'collections' and column_name = 'is_visible'
  ) then
    alter table public.collections add column is_visible boolean not null default true;
  end if;
end $$;

-- ---------- 2. Campaign Events & Promotional Drops Table ----------
create table if not exists public.campaign_events (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title                   text not null check (char_length(title) between 1 and 200),
  tag                     text check (char_length(tag) <= 60),
  badge_text              text check (char_length(badge_text) <= 60),
  event_type              text not null default 'gift_drop' check (event_type in ('gift_drop','flash_sale','seasonal_drop','countdown_drop','member_exclusive')),
  status                  text not null default 'draft' check (status in ('active','paused','scheduled','draft','ended')),
  starts_at               timestamptz,
  ends_at                 timestamptz,
  min_spend               numeric(12,2) not null default 0 check (min_spend >= 0),
  target_collections      text[] not null default '{}',
  discount_code           text check (char_length(discount_code) <= 50),
  gift_item               text check (char_length(gift_item) <= 200),
  gift_value              text check (char_length(gift_value) <= 50),
  gift_image              text check (gift_image is null or gift_image ~ '^(https://|/|data:image/)'),
  gift_description        text check (char_length(gift_description) <= 2000),
  show_top_bar            boolean not null default true,
  top_bar_text            text check (char_length(top_bar_text) <= 300),
  top_bar_url             text check (top_bar_url is null or top_bar_url ~ '^(https://|/)'),
  show_ticker             boolean not null default false,
  ticker_text             text check (char_length(ticker_text) <= 300),
  show_floating_gift_pill boolean not null default true,
  pill_text               text check (char_length(pill_text) <= 60),
  bg                      text not null default '#050505' check (char_length(bg) <= 30),
  text_color              text not null default '#ffffff' check (char_length(text_color) <= 30),
  accent_color            text not null default '#e10600' check (char_length(accent_color) <= 30),
  created_by              uuid references auth.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists campaign_events_status_idx on public.campaign_events(status);
create index if not exists campaign_events_dates_idx on public.campaign_events(starts_at, ends_at);

-- ---------- 3. Hidden Pages & Path Visibility Registry Table ----------
create table if not exists public.hidden_pages (
  id          uuid primary key default gen_random_uuid(),
  page_path   text not null unique check (page_path ~ '^/[a-zA-Z0-9_./-]{1,250}$'),
  title       text check (char_length(title) <= 200),
  category    text not null default 'store' check (category in ('store','collections','pages','custom')),
  is_hidden   boolean not null default true,
  note        text check (char_length(note) <= 300),
  hidden_by   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists hidden_pages_path_idx on public.hidden_pages(page_path);
create index if not exists hidden_pages_is_hidden_idx on public.hidden_pages(is_hidden);

-- ---------- 4. Audit Logging Triggers ----------
do $$ declare t text; begin
  foreach t in array array['campaign_events', 'hidden_pages'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
  end loop;
end $$;

-- ---------- 5. RLS Enablement & Enforcement ----------
alter table public.campaign_events enable row level security;
alter table public.campaign_events force row level security;

alter table public.hidden_pages enable row level security;
alter table public.hidden_pages force row level security;

-- ---------- 6. Least-Privilege Grants ----------
grant usage on schema public to anon, authenticated;

-- Public read access (anon & authenticated)
grant select on public.campaign_events to anon, authenticated;
grant select on public.hidden_pages to anon, authenticated;

-- Staff administrative mutation access
grant select, insert, update, delete on public.campaign_events to authenticated;
grant select, insert, update, delete on public.hidden_pages to authenticated;

-- ---------- 7. Row Level Security Policies ----------

-- Campaign Events: Visitors can see active or active-scheduled events. Staff can read all.
drop policy if exists campaign_events_select_public on public.campaign_events;
create policy campaign_events_select_public on public.campaign_events
  for select to anon, authenticated
  using (
    status = 'active'
    or (status = 'scheduled' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.has_permission('marketing.write')
    or public.has_permission('content.read')
  );

-- Campaign Events: Staff with marketing.write or content.write can manage campaigns
drop policy if exists campaign_events_write_staff on public.campaign_events;
create policy campaign_events_write_staff on public.campaign_events
  for all to authenticated
  using (public.has_permission('marketing.write') or public.has_permission('content.write'))
  with check (public.has_permission('marketing.write') or public.has_permission('content.write'));

-- Hidden Pages: Public storefront can read hidden paths to enforce storefront unavailable screens & navigation purging
drop policy if exists hidden_pages_select_public on public.hidden_pages;
create policy hidden_pages_select_public on public.hidden_pages
  for select to anon, authenticated
  using (is_hidden = true or public.has_permission('content.read'));

-- Hidden Pages: Staff with content.write or site.publish can manage page visibility
drop policy if exists hidden_pages_write_staff on public.hidden_pages;
create policy hidden_pages_write_staff on public.hidden_pages
  for all to authenticated
  using (public.has_permission('content.write') or public.has_permission('site.publish'))
  with check (public.has_permission('content.write') or public.has_permission('site.publish'));


-- =====================================================================================
-- 10 VIP LOYALTY, REFERRAL COUPONS, POINTS WALLET, WITHDRAWALS AND BALL DROP ENGINE
-- =====================================================================================
-- =====================================================================================
-- 10 VIP LOYALTY, REFERRAL COUPONS, POINTS WALLET, WITHDRAWALS & BALL DROP ENGINE
-- Run after 09_refine_campaign_presentation.sql.
-- Includes:
-- 1. loyalty_settings: Singleton admin-controlled parameters (point value, friend discount, min withdraw, pending window, ball drop).
-- 2. vip_members: Extended VIP customer profiles with tier, balance, BD divisions/districts, and payout info.
-- 3. referral_coupons: Personal referral coupon codes per VIP member.
-- 4. referral_uses: Audit record of coupon use on orders.
-- 5. points_ledger: Append-only ledger for points credits, debits, withdrawals, and reversals.
-- 6. withdrawal_requests: Customer cash-out requests with approval/payout workflow.
-- 7. Secure SECURITY DEFINER RPCs with RLS, anti-fraud self-referral blocks, and atomic balance locking.
-- =====================================================================================

-- ---------- 1. Loyalty & Campaign Global Settings ----------
create table if not exists public.loyalty_settings (
  id                        int primary key check (id = 1),
  program_enabled           boolean not null default true,
  reward_mode               text not null default 'fixed_points' check (reward_mode in ('fixed_points','percent_order')),
  points_per_referral       int not null default 100 check (points_per_referral >= 0),
  percent_order_points      numeric(5,2) not null default 5.00 check (percent_order_points between 0 and 50),
  point_value_bdt           numeric(10,2) not null default 1.00 check (point_value_bdt > 0),
  friend_discount_type      text not null default 'percent' check (friend_discount_type in ('percent','fixed')),
  friend_discount_value     numeric(10,2) not null default 10.00 check (friend_discount_value > 0),
  min_order_for_coupon      numeric(12,2) not null default 1000.00 check (min_order_for_coupon >= 0),
  min_withdrawal_bdt        numeric(12,2) not null default 500.00 check (min_withdrawal_bdt > 0),
  max_withdrawal_bdt        numeric(12,2) not null default 25000.00 check (max_withdrawal_bdt >= min_withdrawal_bdt),
  pending_days_return_window int not null default 7 check (pending_days_return_window >= 0),
  coupon_prefix             text not null default 'VIP-' check (char_length(coupon_prefix) <= 10),
  allowed_payout_methods    text[] not null default array['bkash','nagad','rocket','bank'],
  ball_drop_enabled         boolean not null default false,
  ball_drop_config          jsonb not null default '{
    "title": "AnnR Vault Ball Drop",
    "subtitle": "Drop the sphere & claim instant store credits",
    "playsPerCustomer": 1,
    "prizes": [
      {"label": "৳500 OFF voucher", "code": "BALL500", "weight": 20},
      {"label": "10% OFF discount", "code": "DROP10", "weight": 40},
      {"label": "Free Socks Bundle", "code": "DROPGIFT", "weight": 25},
      {"label": "50 Bonus VIP Points", "points": 50, "weight": 15}
    ],
    "theme": "dark_cyberpunk"
  }'::jsonb,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references auth.users(id) on delete set null
);

-- Seed initial settings if empty
insert into public.loyalty_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------- 2. VIP Member Profiles ----------
create table if not exists public.vip_members (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users(id) on delete cascade,
  email               text not null unique check (email ~* '^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$'),
  full_name           text not null check (char_length(full_name) between 1 and 120),
  phone               text not null check (char_length(phone) between 8 and 30),
  is_whatsapp         boolean not null default true,
  division            text not null check (division in ('Barishal','Chattogram','Dhaka','Khulna','Mymensingh','Rajshahi','Rangpur','Sylhet')),
  district            text not null check (char_length(district) between 2 and 50),
  upazila             text check (char_length(upazila) <= 60),
  full_address        text not null check (char_length(full_address) <= 300),
  date_of_birth       date,
  gender              text check (gender in ('male','female','other','prefer_not_to_say')),
  tier                text not null default 'Silver' check (tier in ('Silver','Gold','Diamond','Black')),
  tier_multiplier     numeric(4,2) not null default 1.00 check (tier_multiplier >= 1.00),
  available_points    int not null default 0 check (available_points >= 0),
  pending_points      int not null default 0 check (pending_points >= 0),
  withdrawn_points    int not null default 0 check (withdrawn_points >= 0),
  total_earned_points int not null default 0 check (total_earned_points >= 0),
  referral_code       text unique not null check (referral_code ~ '^[A-Z0-9_-]{4,20}$'),
  referred_by_code    text check (referred_by_code ~ '^[A-Z0-9_-]{4,20}$'),
  default_payout_method text check (default_payout_method in ('bkash','nagad','rocket','bank')),
  default_payout_account text check (char_length(default_payout_account) <= 50),
  bank_details        jsonb,
  status              text not null default 'active' check (status in ('active','suspended','frozen')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists vip_members_refcode_idx on public.vip_members(referral_code);
create index if not exists vip_members_email_idx on public.vip_members(email);
create index if not exists vip_members_phone_idx on public.vip_members(phone);

-- ---------- 3. Personal Referral Coupons ----------
create table if not exists public.referral_coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null check (code ~ '^[A-Z0-9_-]{4,20}$'),
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  discount_type       text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value      numeric(10,2) not null check (discount_value > 0),
  min_order_bdt       numeric(12,2) not null default 1000.00 check (min_order_bdt >= 0),
  times_used          int not null default 0 check (times_used >= 0),
  total_points_generated int not null default 0 check (total_points_generated >= 0),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists referral_coupons_member_idx on public.referral_coupons(vip_member_id);

-- ---------- 4. Referral Coupon Uses (Order linking) ----------
create table if not exists public.referral_uses (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  coupon_code         text not null references public.referral_coupons(code) on delete restrict,
  referrer_member_id  uuid not null references public.vip_members(id) on delete restrict,
  buyer_email         text not null,
  buyer_user_id       uuid references auth.users(id) on delete set null,
  order_total_bdt     numeric(12,2) not null check (order_total_bdt >= 0),
  discount_given_bdt  numeric(12,2) not null check (discount_given_bdt >= 0),
  points_awarded      int not null default 0 check (points_awarded >= 0),
  points_status       text not null default 'pending' check (points_status in ('pending','available','cancelled','reversed')),
  maturation_date     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists referral_uses_order_idx on public.referral_uses(order_id);
create index if not exists referral_uses_referrer_idx on public.referral_uses(referrer_member_id);

-- ---------- 5. Append-Only Points Ledger ----------
create table if not exists public.points_ledger (
  id                  bigint generated always as identity primary key,
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  amount              int not null, -- positive = credit, negative = debit
  balance_after       int not null check (balance_after >= 0),
  transaction_type    text not null check (transaction_type in ('referral_pending','referral_matured','withdrawal_locked','withdrawal_paid','withdrawal_refunded','admin_adjustment','order_cancelled')),
  reference_id        text, -- order_id or withdrawal_id
  note                text not null check (char_length(note) <= 300),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists points_ledger_member_idx on public.points_ledger(vip_member_id, created_at desc);

-- ---------- 6. Withdrawal Requests ----------
create table if not exists public.withdrawal_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      bigint generated always as identity unique,
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  points_amount       int not null check (points_amount > 0),
  money_amount_bdt    numeric(12,2) not null check (money_amount_bdt > 0),
  payout_method       text not null check (payout_method in ('bkash','nagad','rocket','bank')),
  account_number      text not null check (char_length(account_number) <= 50),
  account_name        text check (char_length(account_name) <= 100),
  bank_details        jsonb,
  status              text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_notes         text check (char_length(admin_notes) <= 500),
  transaction_ref     text check (char_length(transaction_ref) <= 100),
  requested_at        timestamptz not null default now(),
  processed_at        timestamptz,
  processed_by        uuid references auth.users(id) on delete set null
);

create index if not exists withdrawal_requests_member_idx on public.withdrawal_requests(vip_member_id);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);

-- Enable & Force Row Level Security on all new tables
alter table public.loyalty_settings enable row level security;
alter table public.loyalty_settings force row level security;

alter table public.vip_members enable row level security;
alter table public.vip_members force row level security;

alter table public.referral_coupons enable row level security;
alter table public.referral_coupons force row level security;

alter table public.referral_uses enable row level security;
alter table public.referral_uses force row level security;

alter table public.points_ledger enable row level security;
alter table public.points_ledger force row level security;

alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_requests force row level security;

-- ---------- 7. Grants ----------
grant select on public.loyalty_settings to anon, authenticated;
grant update on public.loyalty_settings to authenticated;

grant select, insert, update on public.vip_members to anon, authenticated;
grant select on public.referral_coupons to anon, authenticated;
grant insert, update on public.referral_coupons to authenticated;

grant select on public.referral_uses to authenticated;
grant select on public.points_ledger to authenticated;
grant select, insert on public.withdrawal_requests to anon, authenticated;
grant update on public.withdrawal_requests to authenticated;

-- ---------- 8. RLS Policies ----------

-- Loyalty Settings: anyone can read public settings, staff with marketing/admin can update
drop policy if exists loyalty_settings_read_public on public.loyalty_settings;
create policy loyalty_settings_read_public on public.loyalty_settings
  for select to anon, authenticated using (true);

drop policy if exists loyalty_settings_update_staff on public.loyalty_settings;
create policy loyalty_settings_update_staff on public.loyalty_settings
  for update to authenticated using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- VIP Members: users can read & update their own record; staff with loyalty/marketing/admin can read all
drop policy if exists vip_members_read_own_or_staff on public.vip_members;
create policy vip_members_read_own_or_staff on public.vip_members
  for select to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager','support_agent')
    )
  );

-- Anonymous customers can register as VIP
drop policy if exists vip_members_insert_any on public.vip_members;
create policy vip_members_insert_any on public.vip_members
  for insert to anon, authenticated with check (true);

drop policy if exists vip_members_update_own_or_staff on public.vip_members;
create policy vip_members_update_own_or_staff on public.vip_members
  for update to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- Referral Coupons: public can read active coupon codes for checkout validation; members read their own; staff read all
drop policy if exists referral_coupons_read_public on public.referral_coupons;
create policy referral_coupons_read_public on public.referral_coupons
  for select to anon, authenticated using (
    active = true or
    exists (
      select 1 from public.vip_members vm
      where vm.id = referral_coupons.vip_member_id and vm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- Withdrawal Requests: members read their own; staff read all
drop policy if exists withdrawal_requests_read_own_or_staff on public.withdrawal_requests;
create policy withdrawal_requests_read_own_or_staff on public.withdrawal_requests
  for select to authenticated using (
    exists (
      select 1 from public.vip_members vm
      where vm.id = withdrawal_requests.vip_member_id and vm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager','order_manager')
    )
  );

drop policy if exists withdrawal_requests_insert_member on public.withdrawal_requests;
create policy withdrawal_requests_insert_member on public.withdrawal_requests
  for insert to authenticated with check (
    exists (
      select 1 from public.vip_members vm
      where vm.id = withdrawal_requests.vip_member_id and vm.user_id = auth.uid()
    )
  );

drop policy if exists withdrawal_requests_update_staff on public.withdrawal_requests;
create policy withdrawal_requests_update_staff on public.withdrawal_requests
  for update to authenticated using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- ---------- 9. Secure Business Logic RPC Functions ----------

-- A. Register or Login VIP Member and retrieve full wallet
create or replace function public.register_vip_member(
  p_full_name       text,
  p_email           text,
  p_phone           text,
  p_division        text,
  p_district        text,
  p_upazila         text default null,
  p_full_address    text default '',
  p_is_whatsapp     boolean default true,
  p_dob             date default null,
  p_gender          text default 'prefer_not_to_say',
  p_referred_by     text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_member          record;
  v_ref_code        text;
  v_coupon          record;
  v_uid             uuid;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_uid := auth.uid();
  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);

  -- Check existing member
  select * into v_member from public.vip_members where email = p_email or (v_uid is not null and user_id = v_uid);
  if found then
    -- Return existing profile & coupon
    select * into v_coupon from public.referral_coupons where vip_member_id = v_member.id limit 1;
    return jsonb_build_object(
      'ok', true,
      'member', row_to_json(v_member),
      'coupon', row_to_json(v_coupon),
      'settings', row_to_json(v_settings)
    );
  end if;

  -- Generate unique referral coupon code: e.g. VIP-RATUL88 or ANNR-XXXX
  v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-') || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6)) || floor(random() * 899 + 100)::text;

  -- Ensure code uniqueness
  while exists (select 1 from public.vip_members where referral_code = v_ref_code or exists (select 1 from public.referral_coupons where code = v_ref_code)) loop
    v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-') || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 4)) || floor(random() * 8999 + 1000)::text;
  end loop;

  -- Clean referred_by code (prevent self-referral)
  if p_referred_by is not null then
    p_referred_by := upper(trim(p_referred_by));
    if p_referred_by = v_ref_code then
      p_referred_by := null;
    end if;
  end if;

  -- Insert VIP Member
  insert into public.vip_members (
    user_id, email, full_name, phone, is_whatsapp, division, district, upazila, full_address,
    date_of_birth, gender, referral_code, referred_by_code
  ) values (
    v_uid, p_email, p_full_name, p_phone, p_is_whatsapp, p_division, p_district, p_upazila, p_full_address,
    p_dob, p_gender, v_ref_code, p_referred_by
  )
  returning * into v_member;

  -- Create corresponding referral coupon
  insert into public.referral_coupons (
    code, vip_member_id, discount_type, discount_value, min_order_bdt
  ) values (
    v_ref_code, v_member.id, v_settings.friend_discount_type, v_settings.friend_discount_value, v_settings.min_order_for_coupon
  )
  returning * into v_coupon;

  return jsonb_build_object(
    'ok', true,
    'member', row_to_json(v_member),
    'coupon', row_to_json(v_coupon),
    'settings', row_to_json(v_settings)
  );
end;
$$;

-- B. Validate Referral Coupon at Checkout (with Anti-Self-Referral Enforcement)
create or replace function public.validate_referral_coupon(
  p_code        text,
  p_order_total numeric,
  p_buyer_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_coupon    record;
  v_owner     record;
  v_discount  numeric(12,2) := 0;
begin
  p_code := upper(trim(p_code));
  p_buyer_email := lower(trim(p_buyer_email));

  select * into v_coupon from public.referral_coupons where code = p_code and active = true;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code');
  end if;

  select * into v_owner from public.vip_members where id = v_coupon.vip_member_id;
  if not found or v_owner.status <> 'active' then
    return jsonb_build_object('valid', false, 'error', 'Coupon is currently unavailable');
  end if;

  -- Anti-Fraud Rule: A coupon owner CANNOT use their own referral coupon
  if v_owner.email = p_buyer_email or (auth.uid() is not null and v_owner.user_id = auth.uid()) then
    return jsonb_build_object('valid', false, 'error', 'Self-referral is strictly prohibited. You cannot use your own referral code.');
  end if;

  -- Minimum spend check
  if p_order_total < v_coupon.min_order_bdt then
    return jsonb_build_object('valid', false, 'error', 'Minimum order amount for this coupon is ৳' || v_coupon.min_order_bdt::text);
  end if;

  -- Calculate discount amount
  if v_coupon.discount_type = 'percent' then
    v_discount := round((p_order_total * (v_coupon.discount_value / 100.0)), 2);
  else
    v_discount := least(v_coupon.discount_value, p_order_total);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'referrer_name', v_owner.full_name
  );
end;
$$;

-- C. Customer Withdrawal Request (Atomic lock from available balance)
create or replace function public.request_vip_withdrawal(
  p_points_amount   int,
  p_payout_method   text,
  p_account_number  text,
  p_account_name    text default null,
  p_bank_details    jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_member          record;
  v_money_bdt       numeric(12,2);
  v_req             record;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  if not v_settings.program_enabled then
    return jsonb_build_object('ok', false, 'error', 'Rewards program is currently paused');
  end if;

  -- Get member (must match authenticated user)
  select * into v_member from public.vip_members where user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'VIP member record not found');
  end if;

  if v_member.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Your VIP account is ' || v_member.status || '. Withdrawals are locked.');
  end if;

  if p_points_amount <= 0 or p_points_amount > v_member.available_points then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available points');
  end if;

  -- Calculate Taka value
  v_money_bdt := round(p_points_amount * v_settings.point_value_bdt, 2);

  if v_money_bdt < v_settings.min_withdrawal_bdt then
    return jsonb_build_object('ok', false, 'error', 'Minimum withdrawal amount is ৳' || v_settings.min_withdrawal_bdt::text || ' (' || ceil(v_settings.min_withdrawal_bdt / v_settings.point_value_bdt)::text || ' points)');
  end if;

  if v_money_bdt > v_settings.max_withdrawal_bdt then
    return jsonb_build_object('ok', false, 'error', 'Maximum withdrawal per request is ৳' || v_settings.max_withdrawal_bdt::text);
  end if;

  -- Deduct atomically from member's available points and add to withdrawn_points
  update public.vip_members
  set
    available_points = available_points - p_points_amount,
    withdrawn_points = withdrawn_points + p_points_amount,
    updated_at = now()
  where id = v_member.id;

  -- Insert withdrawal request
  insert into public.withdrawal_requests (
    vip_member_id, points_amount, money_amount_bdt, payout_method, account_number, account_name, bank_details, status
  ) values (
    v_member.id, p_points_amount, v_money_bdt, p_payout_method, trim(p_account_number), p_account_name, p_bank_details, 'pending'
  )
  returning * into v_req;

  -- Write to append-only points ledger
  insert into public.points_ledger (
    vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
  ) values (
    v_member.id, -p_points_amount, v_member.available_points - p_points_amount, 'withdrawal_locked', v_req.id::text,
    'Withdrawal request #' || v_req.request_number::text || ' to ' || p_payout_method || ' (' || trim(p_account_number) || ')',
    auth.uid()
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_req.id,
    'request_number', v_req.request_number,
    'money_amount_bdt', v_money_bdt,
    'remaining_points', v_member.available_points - p_points_amount
  );
end;
$$;

-- D. Staff Process Withdrawal (Approve, Pay, or Reject)
create or replace function public.admin_process_withdrawal(
  p_request_id        uuid,
  p_action            text, -- 'paid', 'approved', 'rejected'
  p_transaction_ref   text default null,
  p_admin_notes       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_req               record;
  v_member            record;
begin
  -- RBAC permission check
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request not found');
  end if;

  if v_req.status in ('paid', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Request has already been finalized as ' || v_req.status);
  end if;

  select * into v_member from public.vip_members where id = v_req.vip_member_id for update;

  if p_action = 'paid' then
    update public.withdrawal_requests
    set
      status = 'paid',
      transaction_ref = p_transaction_ref,
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;

    insert into public.points_ledger (
      vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
    ) values (
      v_member.id, 0, v_member.available_points, 'withdrawal_paid', v_req.id::text,
      'Paid ৳' || v_req.money_amount_bdt::text || ' via ' || v_req.payout_method || ' (Trx: ' || coalesce(p_transaction_ref, 'N/A') || ')',
      auth.uid()
    );

  elsif p_action = 'rejected' then
    -- Refund points back to member available points
    update public.vip_members
    set
      available_points = available_points + v_req.points_amount,
      withdrawn_points = withdrawn_points - v_req.points_amount,
      updated_at = now()
    where id = v_member.id;

    update public.withdrawal_requests
    set
      status = 'rejected',
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;

    insert into public.points_ledger (
      vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
    ) values (
      v_member.id, v_req.points_amount, v_member.available_points + v_req.points_amount, 'withdrawal_refunded', v_req.id::text,
      'Withdrawal #' || v_req.request_number::text || ' rejected: ' || coalesce(p_admin_notes, 'Cancelled by admin'),
      auth.uid()
    );

  elsif p_action = 'approved' then
    update public.withdrawal_requests
    set
      status = 'approved',
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid action');
  end if;

  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$;

-- E. Public RPC to fetch published store configuration (fast cached JSON for site-config.js)
create or replace function public.get_published_site_config() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conf jsonb;
begin
  select config into v_conf from public.site_config_versions where is_published = true order by id desc limit 1;
  return coalesce(v_conf, '{}'::jsonb);
end;
$$;

-- F. Place Store Order (Direct DB Checkout: Cash on Delivery or bKash/Nagad)
create or replace function public.place_store_order(
  p_customer_name   text,
  p_email           text,
  p_phone           text,
  p_division        text,
  p_district        text,
  p_full_address    text,
  p_items           jsonb,
  p_payment_method  text, -- 'cod', 'bkash', 'nagad', 'rocket'
  p_trx_id          text default null,
  p_coupon_code     text default null,
  p_customer_notes  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_order_id        uuid;
  v_order_num       bigint;
  v_subtotal        numeric(12,2) := 0;
  v_shipping        numeric(12,2) := 130;
  v_discount        numeric(12,2) := 0;
  v_total           numeric(12,2) := 0;
  v_item            jsonb;
  v_ref_coupon      record;
  v_regular_coupon  record;
  v_ref_member      record;
  v_is_referral     boolean := false;
  v_uid             uuid;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_uid := auth.uid();
  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);

  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Shopping bag is empty');
  end if;

  -- 1. Calculate items subtotal
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (coalesce((v_item->>'price')::numeric, 0) * coalesce((v_item->>'quantity')::int, 1));
  end loop;

  -- 2. Shipping calculation by district
  if lower(trim(p_district)) = 'dhaka' then
    v_shipping := 70.00;
  elsif lower(trim(p_district)) in ('gazipur', 'narayanganj') then
    v_shipping := 100.00;
  else
    v_shipping := 130.00;
  end if;

  -- 3. Coupon validation
  if p_coupon_code is not null and char_length(trim(p_coupon_code)) > 0 then
    p_coupon_code := upper(trim(p_coupon_code));

    -- Check if it's a VIP referral coupon
    select * into v_ref_coupon from public.referral_coupons where code = p_coupon_code and active = true;
    if found then
      select * into v_ref_member from public.vip_members where id = v_ref_coupon.vip_member_id;
      if found and v_ref_member.status = 'active' then
        -- Anti-self-referral check
        if v_ref_member.email = p_email or (v_uid is not null and v_ref_member.user_id = v_uid) then
          return jsonb_build_object('ok', false, 'error', 'Self-referral is strictly prohibited.');
        end if;

        if v_subtotal >= v_ref_coupon.min_order_bdt then
          v_is_referral := true;
          if v_ref_coupon.discount_type = 'percent' then
            v_discount := round(v_subtotal * (v_ref_coupon.discount_value / 100.0), 2);
          else
            v_discount := least(v_ref_coupon.discount_value, v_subtotal);
          end if;
        end if;
      end if;
    else
      -- Check if it's a standard promotional discount
      select * into v_regular_coupon from public.discounts where code = p_coupon_code and active = true;
      if found then
        if (v_regular_coupon.starts_at is null or v_regular_coupon.starts_at <= now()) and
           (v_regular_coupon.ends_at is null or v_regular_coupon.ends_at >= now()) then
          if v_regular_coupon.kind = 'percent' then
            v_discount := round(v_subtotal * (v_regular_coupon.value / 100.0), 2);
          else
            v_discount := least(v_regular_coupon.value, v_subtotal);
          end if;
          update public.discounts set used_count = used_count + 1 where id = v_regular_coupon.id;
        end if;
      end if;
    end if;
  end if;

  v_total := greatest(0, (v_subtotal - v_discount) + v_shipping);

  -- 4. Create Order
  insert into public.orders (
    user_id, email, status, payment_status, subtotal, discount_total, shipping_total, total,
    currency, payment_provider_ref, shipping_address
  ) values (
    v_uid, p_email, 'pending',
    case when p_payment_method = 'cod' then 'unpaid' else 'paid' end,
    v_subtotal, v_discount, v_shipping, v_total, 'BDT',
    p_payment_method || case when p_trx_id is not null and char_length(trim(p_trx_id)) > 0 then ':' || trim(p_trx_id) else '' end,
    jsonb_build_object(
      'full_name', p_customer_name,
      'phone', p_phone,
      'division', p_division,
      'district', p_district,
      'full_address', p_full_address,
      'notes', p_customer_notes
    )
  )
  returning id, order_number into v_order_id, v_order_num;

  -- 5. Insert order items
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (
      order_id, title, unit_price, quantity
    ) values (
      v_order_id,
      coalesce(v_item->>'title', 'AnnR Apparel'),
      coalesce((v_item->>'price')::numeric, 0),
      coalesce((v_item->>'quantity')::int, 1)
    );
  end loop;

  -- 6. Attach referral record if VIP coupon was used
  if v_is_referral then
    declare
      v_points int := 0;
    begin
      if v_settings.reward_mode = 'fixed_points' then
        v_points := round(v_settings.points_per_referral * v_ref_member.tier_multiplier);
      else
        v_points := round((v_total * (v_settings.percent_order_points / 100.0)) * v_ref_member.tier_multiplier);
      end if;

      insert into public.referral_uses (
        order_id, coupon_code, referrer_member_id, buyer_email, buyer_user_id,
        order_total_bdt, discount_given_bdt, points_awarded, points_status,
        maturation_date
      ) values (
        v_order_id, p_coupon_code, v_ref_member.id, p_email, v_uid,
        v_total, v_discount, v_points, 'pending',
        now() + (v_settings.pending_days_return_window || ' days')::interval
      );

      update public.referral_coupons
      set
        times_used = times_used + 1,
        total_points_generated = total_points_generated + v_points,
        updated_at = now()
      where id = v_ref_coupon.id;

      -- Add to member pending balance
      update public.vip_members
      set
        pending_points = pending_points + v_points,
        total_earned_points = total_earned_points + v_points,
        updated_at = now()
      where id = v_ref_member.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_ref_member.id, v_points, v_ref_member.available_points, 'referral_pending', v_order_id::text,
        'Pending ' || v_points::text || ' pts from order #' || v_order_num::text || ' (Matures after return window)',
        v_uid
      );
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_num,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'discount', v_discount,
    'total', v_total
  );
end;
$$;

-- G. Order Lifecycle & Points Maturation RPC (Staff only)
create or replace function public.update_store_order_status(
  p_order_id        uuid,
  p_new_status      text, -- 'pending', 'paid', 'fulfilled', 'cancelled', 'refunded'
  p_payment_status  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_ref_use         record;
  v_member          record;
begin
  -- RBAC permission check
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','order_manager')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  update public.orders
  set
    status = p_new_status,
    payment_status = coalesce(p_payment_status, payment_status),
    updated_at = now()
  where id = p_order_id;

  -- Check if order has a referral use
  select * into v_ref_use from public.referral_uses where order_id = p_order_id for update;
  if found then
    select * into v_member from public.vip_members where id = v_ref_use.referrer_member_id for update;

    -- If order is fulfilled/delivered, mature points into available_points
    if p_new_status = 'fulfilled' and v_ref_use.points_status = 'pending' then
      update public.referral_uses
      set points_status = 'available', updated_at = now()
      where id = v_ref_use.id;

      update public.vip_members
      set
        pending_points = greatest(0, pending_points - v_ref_use.points_awarded),
        available_points = available_points + v_ref_use.points_awarded,
        updated_at = now()
      where id = v_member.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_member.id, v_ref_use.points_awarded, v_member.available_points + v_ref_use.points_awarded,
        'referral_matured', p_order_id::text,
        'Matured ' || v_ref_use.points_awarded::text || ' pts for order delivery',
        auth.uid()
      );

    -- If order cancelled/refunded, reverse points
    elsif p_new_status in ('cancelled', 'refunded') and v_ref_use.points_status in ('pending', 'available') then
      if v_ref_use.points_status = 'pending' then
        update public.vip_members
        set
          pending_points = greatest(0, pending_points - v_ref_use.points_awarded),
          total_earned_points = greatest(0, total_earned_points - v_ref_use.points_awarded),
          updated_at = now()
        where id = v_member.id;
      elsif v_ref_use.points_status = 'available' then
        update public.vip_members
        set
          available_points = greatest(0, available_points - v_ref_use.points_awarded),
          total_earned_points = greatest(0, total_earned_points - v_ref_use.points_awarded),
          updated_at = now()
        where id = v_member.id;
      end if;

      update public.referral_uses
      set points_status = 'reversed', updated_at = now()
      where id = v_ref_use.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_member.id, -v_ref_use.points_awarded, v_member.available_points,
        'order_cancelled', p_order_id::text,
        'Reversed ' || v_ref_use.points_awarded::text || ' pts due to order ' || p_new_status,
        auth.uid()
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'status', p_new_status);
end;
$$;



grant execute on function public.get_published_site_config() to anon, authenticated;
grant execute on function public.register_vip_member to anon, authenticated;
grant execute on function public.validate_referral_coupon to anon, authenticated;
grant execute on function public.request_vip_withdrawal to authenticated;
grant execute on function public.admin_process_withdrawal to authenticated;
grant execute on function public.place_store_order to anon, authenticated;
grant execute on function public.update_store_order_status to authenticated;



-- =====================================================================================
-- 11 VIP AUTH HARDENING AND REAL DATABASE POLICIES
-- =====================================================================================
-- =====================================================================
-- 11_vip_auth_hardening.sql
-- Real Supabase Auth for VIP members + admin staff. Idempotent; safe to re-run.
--
-- Fixes (security review, 2026-11-03):
--  1. register_vip_member() returned ANY member's profile by email to anon callers (IDOR / PII leak).
--     Now requires auth.uid() and only ever returns the caller's own row.
--  2. vip_members had INSERT WITH CHECK (true) and own-row UPDATE on every column, so a member could
--     set available_points themselves. Direct INSERT/UPDATE revoked; profile edits via column grants only.
--  3. withdrawal_requests allowed direct INSERT (bypassing the balance lock). Now RPC-only.
--  4. referral_coupons were enumerable by anon. Checkout validation goes through validate_referral_coupon().
--  5. New RPCs: get_my_vip_dashboard() and get_my_staff_role() so the UI never trusts the browser.
-- =====================================================================

-- ---------- Settings: admin-controlled welcome bonus (0 = no bonus) ----------
alter table public.loyalty_settings
  add column if not exists welcome_bonus_points int not null default 0 check (welcome_bonus_points between 0 and 10000);

-- Ledger: allow welcome bonus entries
alter table public.points_ledger drop constraint if exists points_ledger_transaction_type_check;
alter table public.points_ledger add constraint points_ledger_transaction_type_check
  check (transaction_type in ('referral_pending','referral_matured','withdrawal_locked','withdrawal_paid',
                              'withdrawal_refunded','admin_adjustment','order_cancelled','welcome_bonus'));

-- ---------- Lock down direct table writes ----------
revoke all on public.vip_members from anon;
revoke insert, update, delete on public.vip_members from authenticated;
grant select on public.vip_members to authenticated;               -- RLS: own row or staff
grant update (full_name, phone, is_whatsapp, division, district, upazila, full_address,
              date_of_birth, gender, default_payout_method, default_payout_account)
  on public.vip_members to authenticated;                          -- RLS: own row or staff

drop policy if exists vip_members_insert_any on public.vip_members;

revoke all on public.withdrawal_requests from anon;
revoke insert, delete on public.withdrawal_requests from authenticated;
grant select, update on public.withdrawal_requests to authenticated; -- RLS: update = staff only
drop policy if exists withdrawal_requests_insert_member on public.withdrawal_requests;

revoke all on public.referral_coupons from anon;
revoke insert, update, delete on public.referral_coupons from authenticated;
grant select on public.referral_coupons to authenticated;
drop policy if exists referral_coupons_read_public on public.referral_coupons;
create policy referral_coupons_read_own_or_staff on public.referral_coupons
  for select to authenticated using (
    exists (select 1 from public.vip_members vm where vm.id = referral_coupons.vip_member_id and vm.user_id = auth.uid())
    or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid()
               and ur.role in ('super_admin','admin','marketing_manager'))
  );

revoke all on public.points_ledger from anon;
grant select on public.points_ledger to authenticated;
drop policy if exists points_ledger_read_own_or_staff on public.points_ledger;
create policy points_ledger_read_own_or_staff on public.points_ledger
  for select to authenticated using (
    exists (select 1 from public.vip_members vm where vm.id = points_ledger.vip_member_id and vm.user_id = auth.uid())
    or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid()
               and ur.role in ('super_admin','admin','marketing_manager'))
  );

-- ---------- A. Register the signed-in user as a VIP member (own row only) ----------
create or replace function public.register_vip_member(
  p_full_name       text,
  p_email           text,
  p_phone           text,
  p_division        text,
  p_district        text,
  p_upazila         text default null,
  p_full_address    text default '',
  p_is_whatsapp     boolean default true,
  p_dob             date default null,
  p_gender          text default 'prefer_not_to_say',
  p_referred_by     text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings   record;
  v_member     record;
  v_ref_code   text;
  v_uid        uuid := auth.uid();
  v_email      text;
  v_base       text;
  v_bonus      int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Please sign in first');
  end if;

  -- Email always comes from the verified auth account, never from the client
  select lower(email) into v_email from auth.users where id = v_uid;

  select * into v_member from public.vip_members where user_id = v_uid;
  if found then
    return jsonb_build_object('ok', true, 'existing', true);
  end if;

  if exists (select 1 from public.vip_members where email = v_email) then
    return jsonb_build_object('ok', false, 'error', 'This email is already linked to another VIP account');
  end if;

  p_full_name := trim(coalesce(p_full_name, ''));
  p_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if p_phone ~ '^8801[3-9][0-9]{8}$' then p_phone := substring(p_phone from 3); end if;
  if char_length(p_full_name) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your full name');
  end if;
  if p_phone !~ '^01[3-9][0-9]{8}$' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid 11-digit Bangladesh mobile number');
  end if;
  if p_division not in ('Barishal','Chattogram','Dhaka','Khulna','Mymensingh','Rajshahi','Rangpur','Sylhet') then
    return jsonb_build_object('ok', false, 'error', 'Select a valid division');
  end if;
  if char_length(trim(coalesce(p_district,''))) < 2 or char_length(trim(coalesce(p_full_address,''))) < 3 then
    return jsonb_build_object('ok', false, 'error', 'District and delivery address are required');
  end if;
  if p_gender is null or p_gender not in ('male','female','other','prefer_not_to_say') then
    p_gender := 'prefer_not_to_say';
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;

  v_base := upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6));
  if char_length(v_base) < 2 then v_base := 'ANNR'; end if;
  loop
    v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-') || v_base || floor(random() * 8999 + 1000)::text;
    exit when not exists (select 1 from public.vip_members where referral_code = v_ref_code)
          and not exists (select 1 from public.referral_coupons where code = v_ref_code);
  end loop;

  -- Only accept a referral code that really exists (and is not their own)
  p_referred_by := nullif(upper(trim(coalesce(p_referred_by, ''))), '');
  if p_referred_by is not null and not exists (
       select 1 from public.referral_coupons where code = p_referred_by and active = true) then
    p_referred_by := null;
  end if;

  v_bonus := greatest(coalesce(v_settings.welcome_bonus_points, 0), 0);

  insert into public.vip_members (
    user_id, email, full_name, phone, is_whatsapp, division, district, upazila, full_address,
    date_of_birth, gender, referral_code, referred_by_code, available_points, total_earned_points
  ) values (
    v_uid, v_email, left(p_full_name, 120), p_phone, coalesce(p_is_whatsapp, true), p_division,
    left(trim(p_district), 50), nullif(left(trim(coalesce(p_upazila,'')), 60), ''), left(trim(p_full_address), 300),
    p_dob, p_gender, v_ref_code, p_referred_by, v_bonus, v_bonus
  ) returning * into v_member;

  insert into public.referral_coupons (code, vip_member_id, discount_type, discount_value, min_order_bdt)
  values (v_ref_code, v_member.id, v_settings.friend_discount_type, v_settings.friend_discount_value,
          v_settings.min_order_for_coupon);

  if v_bonus > 0 then
    insert into public.points_ledger (vip_member_id, amount, balance_after, transaction_type, note, created_by)
    values (v_member.id, v_bonus, v_bonus, 'welcome_bonus', 'VIP welcome bonus', v_uid);
  end if;

  return jsonb_build_object('ok', true, 'existing', false);
end;
$$;

-- ---------- B. Signed-in member dashboard (all numbers computed server-side) ----------
create or replace function public.get_my_vip_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_m   record;
  v_c   record;
  v_s   record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v_m from public.vip_members where user_id = v_uid;
  if not found then
    return jsonb_build_object('ok', true, 'member', null);
  end if;
  select * into v_c from public.referral_coupons where vip_member_id = v_m.id order by created_at limit 1;
  select point_value_bdt, friend_discount_type, friend_discount_value, points_per_referral,
         min_withdrawal_bdt, max_withdrawal_bdt, min_order_for_coupon, program_enabled, allowed_payout_methods
    into v_s from public.loyalty_settings where id = 1;

  return jsonb_build_object(
    'ok', true,
    'member', jsonb_build_object(
      'full_name', v_m.full_name, 'email', v_m.email, 'phone', v_m.phone, 'tier', v_m.tier,
      'division', v_m.division, 'district', v_m.district, 'status', v_m.status,
      'available_points', v_m.available_points, 'pending_points', v_m.pending_points,
      'withdrawn_points', v_m.withdrawn_points, 'total_earned_points', v_m.total_earned_points,
      'referral_code', v_m.referral_code, 'created_at', v_m.created_at),
    'referrals', jsonb_build_object(
      'orders', coalesce(v_c.times_used, 0),
      'points_generated', coalesce(v_c.total_points_generated, 0),
      'pending_orders', (select count(*) from public.referral_uses where referrer_member_id = v_m.id and points_status = 'pending')),
    'withdrawals', coalesce((
      select jsonb_agg(jsonb_build_object(
               'request_number', w.request_number, 'points_amount', w.points_amount,
               'money_amount_bdt', w.money_amount_bdt, 'payout_method', w.payout_method,
               'account_number', w.account_number, 'status', w.status,
               'transaction_ref', w.transaction_ref, 'requested_at', w.requested_at) order by w.requested_at desc)
        from (select * from public.withdrawal_requests where vip_member_id = v_m.id
              order by requested_at desc limit 20) w), '[]'::jsonb),
    'settings', to_jsonb(v_s)
  );
end;
$$;

-- ---------- C. Staff role of the signed-in user (admin panel gate) ----------
create or replace function public.get_my_staff_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ur.role::text from public.user_roles ur
  where ur.user_id = auth.uid()
  order by case ur.role::text
    when 'super_admin' then 1 when 'admin' then 2 when 'content_manager' then 3
    when 'product_manager' then 4 when 'order_manager' then 5 when 'marketing_manager' then 6
    when 'analytics_viewer' then 7 when 'support_agent' then 8 else 9 end
  limit 1;
$$;

-- ---------- Grants ----------
revoke all on function public.register_vip_member(text,text,text,text,text,text,text,boolean,date,text,text) from public, anon;
grant execute on function public.register_vip_member(text,text,text,text,text,text,text,boolean,date,text,text) to authenticated;
revoke all on function public.get_my_vip_dashboard() from public, anon;
grant execute on function public.get_my_vip_dashboard() to authenticated;
revoke all on function public.get_my_staff_role() from public, anon;
grant execute on function public.get_my_staff_role() to authenticated;
revoke all on function public.request_vip_withdrawal(int,text,text,text,jsonb) from public, anon;
grant execute on function public.request_vip_withdrawal(int,text,text,text,jsonb) to authenticated;

-- =====================================================================
-- ONE-TIME: make yourself super admin (run AFTER signing up at /admin or /account/login
-- with your real email, and confirming the email). Replace the email below.
--
--   insert into public.user_roles (user_id, role)
--   select id, 'super_admin' from auth.users where email = 'YOUR-REAL-EMAIL@example.com'
--   on conflict do nothing;
-- =====================================================================

