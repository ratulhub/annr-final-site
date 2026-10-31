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

