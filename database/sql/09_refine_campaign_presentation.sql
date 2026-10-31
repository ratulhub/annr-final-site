-- =====================================================================================
-- 09 REFINE CAMPAIGN PRESENTATION & REMOVE INTRUSIVE HEADER BARS
-- Run after 08_campaign_events_and_page_visibility.sql.
-- Changes:
-- 1. Updates campaign_events column defaults: show_top_bar and show_ticker default to false
--    so they never sandwich or disrupt the floating transparent storefront header.
-- 2. Ensures show_floating_gift_pill defaults to true for the non-intrusive bottom HUD capsule.
-- 3. Adds show_pdp_perk (default true) for native product detail page perks.
-- 4. Disables show_top_bar and show_ticker on existing events.
-- Safe to re-run: uses IF NOT EXISTS, ALTER COLUMN SET DEFAULT, and idempotent updates.
-- =====================================================================================

-- ---------- 1. Ensure column defaults prevent intrusive header sandwich ----------
alter table if exists public.campaign_events
  alter column show_top_bar set default false,
  alter column show_ticker set default false,
  alter column show_floating_gift_pill set default true;

-- ---------- 2. Add show_pdp_perk column if not exists ----------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'campaign_events' and column_name = 'show_pdp_perk'
  ) then
    alter table public.campaign_events add column show_pdp_perk boolean not null default true;
  end if;
end $$;

-- ---------- 3. Migrate any existing active events to modern luxury presentation ----------
update public.campaign_events
set
  show_top_bar = false,
  show_ticker = false,
  show_floating_gift_pill = true,
  updated_at = now()
where show_top_bar = true or show_ticker = true;

-- Log migration in audit trail
do $$ begin
  if exists (select 1 from pg_proc where proname = 'audit' and pronamespace = 'security'::regnamespace) then
    perform security.audit('campaign_events.refine_presentation', 'campaign_events', 'all', 'success',
      jsonb_build_object('action', 'disabled_intrusive_bars', 'enabled_hud_and_pdp', true));
  end if;
exception when others then
  null;
end $$;

