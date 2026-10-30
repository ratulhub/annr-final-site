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
create index if not exists collections_status_idx on public.collections(status);
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
