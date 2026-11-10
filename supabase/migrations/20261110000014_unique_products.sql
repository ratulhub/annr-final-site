-- =====================================================================================
-- 14 ONE-OF-ONE PRODUCTS, CATEGORIES & CAMPAIGNS — run after 13.
-- Every product is a single unique piece (stock 1, one fixed size + measurements).
-- Adds: categories, campaigns, product_reservations; extends products; reservation RPCs
-- (reserve_product / release_reservation / attach_reservation_order / mark_product_sold /
-- release_expired_reservations / search_products); RLS; indexes; seed data.
-- Idempotent: safe to re-run. Uses the existing RBAC helpers from 03 (has_permission).
-- =====================================================================================

-- ---------- 1. Categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 2000),
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists categories_visible_sort_idx on public.categories(is_visible, sort_order);

-- ---------- 2. Campaigns ----------
create table if not exists public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name           text not null check (char_length(name) between 1 and 120),
  description    text check (char_length(description) <= 5000),
  hero_image_url text check (hero_image_url is null or hero_image_url ~ '^(https://|/)'),
  hero_title     text check (char_length(hero_title) <= 160),
  hero_subtitle  text check (char_length(hero_subtitle) <= 400),
  status         text not null default 'draft' check (status in ('draft','active','ended','archived')),
  starts_at      timestamptz,
  ends_at        timestamptz,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists campaigns_status_sort_idx on public.campaigns(status, sort_order);

-- ---------- 3. Measurement validator (chest, length, shoulder, sleeve, waist, inseam; cm, optional) ----------
create or replace function public.valid_measurements(_m jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select _m is not null
     and jsonb_typeof(_m) = 'object'
     and not exists (
       select 1 from jsonb_each(_m) e
       where e.key not in ('chest','length','shoulder','sleeve','waist','inseam')
          or not (jsonb_typeof(e.value) = 'null'
                  or (jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric between 0 and 500)))
$$;

-- ---------- 4. Extend products (existing table from 01) ----------
alter table public.products add column if not exists code         text;
alter table public.products add column if not exists category_id  uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists campaign_id  uuid references public.campaigns(id) on delete set null;
alter table public.products add column if not exists size         text;
alter table public.products add column if not exists measurements jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists fabric       text;
alter table public.products add column if not exists condition    text;
alter table public.products add column if not exists images       text[] not null default '{}';
alter table public.products add column if not exists stock        int not null default 1;
alter table public.products add column if not exists reserved_until timestamptz;
alter table public.products add column if not exists sold_at      timestamptz;
alter table public.products add column if not exists published_at timestamptz;

-- Status: draft | active (live) | reserved | sold | archived.
do $$ declare c record; begin
  for c in
    select con.conname from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
    where con.conrelid = 'public.products'::regclass and con.contype = 'c' and a.attname = 'status'
  loop
    execute format('alter table public.products drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.products add constraint products_status_check
  check (status in ('draft','active','reserved','sold','archived'));

do $$ begin
  alter table public.products add constraint products_code_format check (code is null or code ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_size_len check (size is null or char_length(size) between 1 and 20);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_fabric_len check (fabric is null or char_length(fabric) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_condition_len check (condition is null or char_length(condition) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_stock_one check (stock between 0 and 1);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_measurements_valid check (public.valid_measurements(measurements));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_images_limit
    check (cardinality(images) <= 12 and pg_column_size(images) < 20000);
exception when duplicate_object then null; end $$;

-- Image URLs must be https:// or site-relative (no javascript:, data:, etc.). Enforced by trigger
-- because CHECK constraints cannot contain subqueries over array elements.
create or replace function public.products_validate_row() returns trigger
language plpgsql set search_path = '' as $$
declare u text;
begin
  if new.images is not null then
    foreach u in array new.images loop
      if u is null or u !~ '^(https://|/)[^\s"''<>]{1,1000}$' then
        raise exception 'invalid image url' using errcode = '22023';
      end if;
    end loop;
  end if;
  if new.code is not null then new.code := upper(new.code); end if;
  if new.status = 'sold' then
    new.stock := 0;
    new.sold_at := coalesce(new.sold_at, now());
    new.reserved_until := null;
  elsif new.status in ('active','draft','archived') then
    new.stock := 1;
    new.reserved_until := null;
    new.sold_at := null;
  end if;
  if new.status = 'active' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
drop trigger if exists products_validate_row on public.products;
create trigger products_validate_row before insert or update on public.products
  for each row execute function public.products_validate_row();

-- Indexes for scale (thousands of products).
create unique index if not exists products_code_unique on public.products(upper(code)) where code is not null;
create index if not exists products_category_idx on public.products(category_id, status, created_at desc);
create index if not exists products_campaign_idx on public.products(campaign_id, status, created_at desc);
create index if not exists products_status_created_idx on public.products(status, created_at desc, id);
create index if not exists products_price_idx on public.products(price);
do $$ begin
  create extension if not exists pg_trgm with schema extensions;
  execute 'create index if not exists products_search_trgm_idx on public.products using gin ((lower(coalesce(code, '''') || '' '' || title)) extensions.gin_trgm_ops)';
exception when others then
  raise notice 'pg_trgm unavailable (%); search falls back to sequential ILIKE', sqlerrm;
end $$;

-- ---------- 5. Reservations (private: tokens are never readable by anon) ----------
create table if not exists public.product_reservations (
  product_id uuid primary key references public.products(id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  expires_at timestamptz,               -- null once attached to an order (held until staff action)
  order_id   uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists product_reservations_expiry_idx on public.product_reservations(expires_at) where order_id is null;

-- ---------- 6. Triggers: updated_at + audit ----------
do $$ declare t text; begin
  foreach t in array array['categories','campaigns'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I; create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at();', t);
  end loop;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'security' and p.proname = 'audit_row_change') then
    foreach t in array array['categories','campaigns','product_reservations'] loop
      execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
    end loop;
  end if;
end $$;

-- ---------- 7. RLS + grants ----------
alter table public.categories enable row level security;            alter table public.categories force row level security;
alter table public.campaigns enable row level security;             alter table public.campaigns force row level security;
alter table public.product_reservations enable row level security;  alter table public.product_reservations force row level security;

revoke all on public.categories, public.campaigns, public.product_reservations from public, anon, authenticated;
grant select on public.categories, public.campaigns to anon, authenticated;
grant insert, update, delete on public.categories, public.campaigns to authenticated;
grant select on public.product_reservations to authenticated;       -- staff only via RLS; writes only via RPCs

drop policy if exists categories_select_public on public.categories;
create policy categories_select_public on public.categories for select to anon, authenticated
  using (is_visible or public.has_permission('catalog.read'));
drop policy if exists categories_write_staff on public.categories;
create policy categories_write_staff on public.categories for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

drop policy if exists campaigns_select_public on public.campaigns;
create policy campaigns_select_public on public.campaigns for select to anon, authenticated
  using (status in ('active','ended') or public.has_permission('catalog.read'));
drop policy if exists campaigns_write_staff on public.campaigns;
create policy campaigns_write_staff on public.campaigns for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

drop policy if exists product_reservations_select_staff on public.product_reservations;
create policy product_reservations_select_staff on public.product_reservations for select to authenticated
  using (public.has_permission('orders.read'));

-- Public storefront can read live, reserved and sold pieces (never drafts/archived).
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products for select to anon, authenticated
  using (status in ('active','reserved','sold') or public.has_permission('catalog.read'));
-- products_write_staff from 05 (catalog.write AND pricing.write) is kept unchanged.

drop policy if exists product_images_select_public on public.product_images;
create policy product_images_select_public on public.product_images for select to anon, authenticated
  using (public.has_permission('catalog.read')
         or exists (select 1 from public.products p where p.id = product_id and p.status in ('active','reserved','sold')));

-- ---------- 8. Reservation RPCs ----------
create or replace function public.release_expired_reservations()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with gone as (
    delete from public.product_reservations
    where order_id is null and expires_at is not null and expires_at < now()
    returning product_id
  )
  update public.products p set status = 'active', reserved_until = null, updated_at = now()
  from gone where p.id = gone.product_id and p.status = 'reserved';
  get diagnostics n = row_count;
  return n;
end $$;

-- Atomically reserve one piece for 15 minutes. Returns the authoritative price for checkout.
create or replace function public.reserve_product(p_product_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_p public.products%rowtype;
  v_r public.product_reservations%rowtype;
  v_token uuid := gen_random_uuid();
  v_until timestamptz := now() + interval '15 minutes';
begin
  if p_product_id is null then return jsonb_build_object('ok', false, 'error', 'missing_product'); end if;
  select * into v_p from public.products where id = p_product_id for update;
  if not found or v_p.status in ('draft','archived') then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_p.status = 'sold' then return jsonb_build_object('ok', false, 'error', 'sold'); end if;
  if v_p.status = 'reserved' then
    select * into v_r from public.product_reservations where product_id = p_product_id;
    if found and (v_r.order_id is not null or v_r.expires_at is null or v_r.expires_at >= now()) then
      return jsonb_build_object('ok', false, 'error', 'reserved', 'reserved_until', v_r.expires_at);
    end if;
    delete from public.product_reservations where product_id = p_product_id;
  end if;
  insert into public.product_reservations(product_id, token, expires_at) values (p_product_id, v_token, v_until)
  on conflict (product_id) do update set token = excluded.token, expires_at = excluded.expires_at, order_id = null, created_at = now();
  update public.products set status = 'reserved', reserved_until = v_until, updated_at = now() where id = p_product_id;
  return jsonb_build_object('ok', true, 'token', v_token, 'reserved_until', v_until,
    'product_id', v_p.id, 'price', v_p.price, 'title', v_p.title, 'code', v_p.code, 'size', v_p.size);
end $$;

-- Release by the customer holding the token, or by staff (orders.write) without a token.
create or replace function public.release_reservation(p_product_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_r public.product_reservations%rowtype; v_staff boolean := public.has_permission('orders.write');
begin
  select * into v_r from public.product_reservations where product_id = p_product_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_reservation'); end if;
  if not v_staff and (p_token is null or v_r.token <> p_token or v_r.order_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  delete from public.product_reservations where product_id = p_product_id;
  update public.products set status = 'active', reserved_until = null, updated_at = now()
   where id = p_product_id and status = 'reserved';
  return jsonb_build_object('ok', true);
end $$;

-- After place_store_order succeeds, link the hold to that order (held until staff marks sold or releases).
create or replace function public.attach_reservation_order(p_product_id uuid, p_token uuid, p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_r public.product_reservations%rowtype;
begin
  select * into v_r from public.product_reservations where product_id = p_product_id for update;
  if not found or v_r.token <> p_token or v_r.order_id is not null then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_r.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if not exists (select 1 from public.orders o where o.id = p_order_id and o.created_at > now() - interval '30 minutes') then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  update public.product_reservations set order_id = p_order_id, expires_at = null where product_id = p_product_id;
  update public.products set reserved_until = null, updated_at = now() where id = p_product_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mark_product_sold(p_product_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('orders.write') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform 1 from public.products where id = p_product_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  delete from public.product_reservations where product_id = p_product_id;
  update public.products set status = 'sold', stock = 0, sold_at = now(), reserved_until = null, updated_at = now()
   where id = p_product_id;
  return jsonb_build_object('ok', true);
end $$;

-- Storefront search by code or name (security invoker: RLS still applies).
create or replace function public.search_products(p_q text, p_limit int default 10)
returns table (id uuid, handle text, code text, title text, price numeric, compare_at_price numeric,
               size text, status text, images text[])
language sql stable security invoker set search_path = '' as $$
  select p.id, p.handle, p.code, p.title, p.price, p.compare_at_price, p.size, p.status, p.images
  from public.products p
  where p.status in ('active','reserved','sold')
    and char_length(trim(coalesce(p_q, ''))) between 1 and 80
    and lower(coalesce(p.code, '') || ' ' || p.title)
        like '%' || replace(replace(replace(lower(trim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by (upper(p.code) = upper(trim(p_q))) desc, (p.status = 'active') desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

revoke all on function public.release_expired_reservations(), public.reserve_product(uuid),
  public.release_reservation(uuid, uuid), public.attach_reservation_order(uuid, uuid, uuid),
  public.mark_product_sold(uuid), public.search_products(text, int), public.valid_measurements(jsonb) from public;
grant execute on function public.release_expired_reservations(), public.reserve_product(uuid),
  public.release_reservation(uuid, uuid), public.attach_reservation_order(uuid, uuid, uuid),
  public.search_products(text, int), public.valid_measurements(jsonb) to anon, authenticated;
grant execute on function public.mark_product_sold(uuid) to authenticated;

-- Optional: release expired holds every minute when pg_cron is available.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'annr_release_expired_reservations';
    perform cron.schedule('annr_release_expired_reservations', '* * * * *', 'select public.release_expired_reservations()');
  end if;
exception when others then raise notice 'pg_cron scheduling skipped: %', sqlerrm; end $$;

-- ---------- 9. Seed ----------
insert into public.categories(slug, name, sort_order) values
  ('hoodies','Hoodies',1), ('sweatshirts','Sweatshirts',2), ('trousers','Trousers',3), ('sweaters','Sweaters',4),
  ('t-shirts','T-Shirts',5), ('jackets','Jackets',6), ('knitwear','Knitwear',7), ('accessories','Accessories',8)
on conflict (slug) do nothing;

insert into public.campaigns(slug, name, description, hero_title, hero_subtitle, status, sort_order) values
  ('unique-campaign', 'Unique Campaign', 'One-of-one pieces. Every item exists exactly once.',
   'Unique Campaign', 'One of one. When it is gone, it is gone.', 'active', 1)
on conflict (slug) do nothing;
