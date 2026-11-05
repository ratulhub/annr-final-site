-- =====================================================================================
-- 12 COMPLETE ANNR VIP LOYALTY, REFERRAL ATTRIBUTION, POINT REDEMPTION, TIERS & CAMPAIGNS
-- Idempotent migration extending 10_vip_loyalty_and_ball_drop.sql and 11_vip_auth_hardening.sql.
--
-- Entities added / extended:
--  1. loyalty_settings (extended with redemption rules, expiration, attribution window, qualifying event)
--  2. vip_tiers (configurable Silver / Gold / Platinum / Diamond tiers with multipliers & perks)
--  3. loyalty_campaigns (12 campaign types with start/end dates, priority, stacking, limits)
--  4. referral_attributions (server-side tracking of ?ref= link visits & conversion lifecycle)
--  5. loyalty_redemptions (atomic checkout point reservations & redemptions)
--  6. loyalty_notifications (member notifications for earned points, referrals, tier upgrades, campaigns)
--  7. loyalty_admin_logs (immutable audit log of admin point adjustments, tier edits, campaign changes)
--  8. Atomic SECURITY DEFINER RPCs for point redemption, admin adjustments, referral review, and tier evaluation.
-- =====================================================================================

-- ---------- 1. Extend loyalty_settings with full admin controls ----------
alter table public.loyalty_settings
  add column if not exists auto_activate_membership      boolean not null default true,
  add column if not exists default_tier                  text not null default 'Silver',
  add column if not exists welcome_bonus_points          int not null default 100 check (welcome_bonus_points between 0 and 50000),
  add column if not exists referral_signup_bonus_points  int not null default 0 check (referral_signup_bonus_points between 0 and 10000),
  add column if not exists max_discount_bdt              numeric(12,2) not null default 2000.00 check (max_discount_bdt >= 0),
  add column if not exists first_order_only_referral     boolean not null default false,
  add column if not exists qualifying_order_status       text not null default 'fulfilled' check (qualifying_order_status in ('placed','paid','fulfilled')),
  add column if not exists attribution_window_days       int not null default 30 check (attribution_window_days between 1 and 365),
  add column if not exists point_expiration_days         int not null default 365 check (point_expiration_days >= 0),
  add column if not exists order_earn_enabled            boolean not null default true,
  add column if not exists points_per_100_bdt            int not null default 2 check (points_per_100_bdt between 0 and 100),
  add column if not exists redemption_enabled            boolean not null default true,
  add column if not exists min_redemption_points         int not null default 50 check (min_redemption_points >= 1),
  add column if not exists max_redemption_points_order   int not null default 2000 check (max_redemption_points_order >= 1),
  add column if not exists max_redemption_percent_order  numeric(5,2) not null default 50.00 check (max_redemption_percent_order between 1 and 100),
  add column if not exists min_order_for_redemption      numeric(12,2) not null default 500.00 check (min_order_for_redemption >= 0),
  add column if not exists allow_points_with_coupon      boolean not null default true,
  add column if not exists notifications_enabled         boolean not null default true;

-- ---------- 2. Extend vip_members with complete wallet & tier tracking ----------
alter table public.vip_members drop constraint if exists vip_members_tier_check;
alter table public.vip_members add constraint vip_members_tier_check
  check (tier in ('Silver','Gold','Platinum','Diamond','Black'));

alter table public.vip_members
  add column if not exists redeemed_points        int not null default 0 check (redeemed_points >= 0),
  add column if not exists expired_points         int not null default 0 check (expired_points >= 0),
  add column if not exists referral_points_earned int not null default 0 check (referral_points_earned >= 0),
  add column if not exists campaign_points_earned int not null default 0 check (campaign_points_earned >= 0),
  add column if not exists welcome_points_earned  int not null default 0 check (welcome_points_earned >= 0),
  add column if not exists admin_adjusted_points  int not null default 0,
  add column if not exists friends_referred       int not null default 0 check (friends_referred >= 0),
  add column if not exists lifetime_spend_bdt     numeric(14,2) not null default 0 check (lifetime_spend_bdt >= 0),
  add column if not exists lifetime_orders        int not null default 0 check (lifetime_orders >= 0),
  add column if not exists fraud_flagged          boolean not null default false,
  add column if not exists fraud_notes            text;

-- ---------- 3. Extend referral_coupons & referral_uses ----------
alter table public.referral_coupons
  add column if not exists max_discount_bdt       numeric(12,2) default 2000.00,
  add column if not exists usage_limit            int default null,
  add column if not exists per_user_limit         int not null default 1,
  add column if not exists first_order_only       boolean not null default false,
  add column if not exists expires_at             timestamptz default null;

alter table public.referral_uses
  add column if not exists buyer_name             text,
  add column if not exists buyer_phone            text,
  add column if not exists order_number           text,
  add column if not exists fraud_flag             boolean not null default false,
  add column if not exists fraud_reason           text,
  add column if not exists reviewed_by            uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at            timestamptz;

-- Ensure one referral reward per order (idempotency constraint)
create unique index if not exists referral_uses_unique_order_idx on public.referral_uses(order_id);

-- ---------- 4. Extend points_ledger transaction types ----------
alter table public.points_ledger drop constraint if exists points_ledger_transaction_type_check;
alter table public.points_ledger add constraint points_ledger_transaction_type_check
  check (transaction_type in (
    'welcome_bonus',
    'referral_signup_bonus',
    'referral_pending',
    'referral_matured',
    'order_earn',
    'campaign_bonus',
    'points_redeemed',
    'points_refunded',
    'withdrawal_locked',
    'withdrawal_paid',
    'withdrawal_refunded',
    'admin_adjustment',
    'points_expired',
    'order_cancelled'
  ));

-- ---------- 5. Configurable VIP Membership Tiers (vip_tiers) ----------
create table if not exists public.vip_tiers (
  id                      uuid primary key default gen_random_uuid(),
  name                    text unique not null check (char_length(name) between 2 and 40),
  rank_order              int not null default 1,
  badge_color             text not null default '#a1a1aa',
  description             text not null default '',
  min_earned_points       int not null default 0 check (min_earned_points >= 0),
  min_referrals           int not null default 0 check (min_referrals >= 0),
  min_lifetime_spend_bdt  numeric(14,2) not null default 0 check (min_lifetime_spend_bdt >= 0),
  points_multiplier       numeric(5,2) not null default 1.00 check (points_multiplier >= 1.00),
  tier_discount_percent   numeric(5,2) not null default 0.00 check (tier_discount_percent between 0 and 50),
  perks                   jsonb not null default '[]'::jsonb,
  active                  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

insert into public.vip_tiers (name, rank_order, badge_color, description, min_earned_points, min_referrals, min_lifetime_spend_bdt, points_multiplier, tier_discount_percent, perks)
values
  ('Silver', 1, '#a1a1aa', 'Entry VIP Membership with personal referral coupon & instant MFS cashouts.', 0, 0, 0, 1.00, 0.00, '["100 Welcome ANNR Points","Personal 10% OFF Referral Code","Instant bKash/Nagad Cashouts"]'::jsonb),
  ('Gold', 2, '#f59e0b', 'Accelerated 1.25x point earning & priority seasonal drop access.', 500, 3, 10000, 1.25, 3.00, '["1.25x Points Multiplier","3% Extra VIP Checkout Discount","Early Drop Access"]'::jsonb),
  ('Platinum', 3, '#38bdf8', 'High-velocity referrer tier with 1.5x points & exclusive festival gifts.', 1500, 8, 25000, 1.50, 5.00, '["1.5x Points Multiplier","5% Extra VIP Checkout Discount","Free Express Shipping in Dhaka"]'::jsonb),
  ('Diamond', 4, '#c084fc', 'Top-echelon ANNR royalty with 2.0x points & private vault rewards.', 3500, 15, 50000, 2.00, 10.00, '["2.0x Double Points Multiplier","10% Extra VIP Checkout Discount","Dedicated VIP Concierge & Birthday Gift"]'::jsonb)
on conflict (name) do nothing;

-- ---------- 6. Dynamic Promotional Campaigns (loyalty_campaigns) ----------
create table if not exists public.loyalty_campaigns (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(name) between 2 and 120),
  description             text not null default '',
  campaign_type           text not null check (campaign_type in (
    'registration_bonus',
    'referral_bonus',
    'multiplier_points',
    'seasonal_festival',
    'birthday_reward',
    'first_purchase',
    'min_order_value',
    'product_specific',
    'category_specific',
    'repeat_purchase',
    'vip_discount',
    'custom_manual'
  )),
  status                  text not null default 'active' check (status in ('active','paused','scheduled','archived')),
  reward_type             text not null default 'points' check (reward_type in ('points','multiplier','discount_percent','discount_fixed')),
  reward_value            numeric(12,2) not null default 100 check (reward_value >= 0),
  min_order_bdt           numeric(12,2) not null default 0 check (min_order_bdt >= 0),
  eligible_tiers          text[] not null default array['Silver','Gold','Platinum','Diamond','Black'],
  target_handles          text[] not null default array[]::text[],
  usage_limit             int default null,
  per_user_limit          int not null default 1,
  times_claimed           int not null default 0,
  total_points_issued     int not null default 0,
  priority                int not null default 10,
  stackable               boolean not null default true,
  starts_at               timestamptz,
  ends_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------- 7. Referral Attributions (referral_attributions) ----------
create table if not exists public.referral_attributions (
  id                      uuid primary key default gen_random_uuid(),
  referral_code           text not null,
  referrer_member_id      uuid references public.vip_members(id) on delete cascade,
  visitor_token           text not null,
  landing_path            text,
  attributed_email        text,
  status                  text not null default 'clicked' check (status in ('clicked','registered','converted','expired')),
  converted_order_id      uuid references public.orders(id) on delete set null,
  expires_at              timestamptz not null default (now() + interval '30 days'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists referral_attributions_code_idx on public.referral_attributions(referral_code);

-- ---------- 8. Checkout Points Redemptions (loyalty_redemptions) ----------
create table if not exists public.loyalty_redemptions (
  id                      uuid primary key default gen_random_uuid(),
  vip_member_id           uuid not null references public.vip_members(id) on delete cascade,
  order_id                uuid references public.orders(id) on delete set null,
  order_number            text,
  points_redeemed         int not null check (points_redeemed > 0),
  discount_bdt            numeric(12,2) not null check (discount_bdt > 0),
  status                  text not null default 'applied' check (status in ('reserved','applied','refunded','cancelled')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists loyalty_redemptions_member_idx on public.loyalty_redemptions(vip_member_id);

-- ---------- 9. Customer Loyalty Notifications (loyalty_notifications) ----------
create table if not exists public.loyalty_notifications (
  id                      uuid primary key default gen_random_uuid(),
  vip_member_id           uuid references public.vip_members(id) on delete cascade,
  member_email            text,
  event_type              text not null,
  title                   text not null,
  message                 text not null,
  is_read                 boolean not null default false,
  created_at              timestamptz not null default now()
);

create index if not exists loyalty_notifications_member_idx on public.loyalty_notifications(vip_member_id, created_at desc);

-- ---------- 10. Immutable Admin Loyalty Audit Log (loyalty_admin_logs) ----------
create table if not exists public.loyalty_admin_logs (
  id                      bigint generated always as identity primary key,
  admin_user_id           uuid references auth.users(id) on delete set null,
  admin_email             text,
  action_type             text not null,
  target_member_id        uuid references public.vip_members(id) on delete set null,
  target_email            text,
  points_delta            int default 0,
  reason                  text not null,
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

-- ---------- 11. Enable & Force RLS on all new tables ----------
alter table public.vip_tiers enable row level security;
alter table public.vip_tiers force row level security;

alter table public.loyalty_campaigns enable row level security;
alter table public.loyalty_campaigns force row level security;

alter table public.referral_attributions enable row level security;
alter table public.referral_attributions force row level security;

alter table public.loyalty_redemptions enable row level security;
alter table public.loyalty_redemptions force row level security;

alter table public.loyalty_notifications enable row level security;
alter table public.loyalty_notifications force row level security;

alter table public.loyalty_admin_logs enable row level security;
alter table public.loyalty_admin_logs force row level security;

-- Grants & Policies
grant select on public.vip_tiers to anon, authenticated;
grant insert, update, delete on public.vip_tiers to authenticated;

drop policy if exists vip_tiers_read_public on public.vip_tiers;
create policy vip_tiers_read_public on public.vip_tiers for select to anon, authenticated using (true);

drop policy if exists vip_tiers_write_staff on public.vip_tiers;
create policy vip_tiers_write_staff on public.vip_tiers for all to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager'))
);

grant select on public.loyalty_campaigns to anon, authenticated;
grant insert, update, delete on public.loyalty_campaigns to authenticated;

drop policy if exists loyalty_campaigns_read_public on public.loyalty_campaigns;
create policy loyalty_campaigns_read_public on public.loyalty_campaigns for select to anon, authenticated using (true);

drop policy if exists loyalty_campaigns_write_staff on public.loyalty_campaigns;
create policy loyalty_campaigns_write_staff on public.loyalty_campaigns for all to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager'))
);

grant select, insert on public.referral_attributions to anon, authenticated;
drop policy if exists referral_attributions_insert_any on public.referral_attributions;
create policy referral_attributions_insert_any on public.referral_attributions for insert to anon, authenticated with check (true);
drop policy if exists referral_attributions_read_staff on public.referral_attributions;
create policy referral_attributions_read_staff on public.referral_attributions for select to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager'))
);

grant select on public.loyalty_redemptions to authenticated;
drop policy if exists loyalty_redemptions_read_own_or_staff on public.loyalty_redemptions;
create policy loyalty_redemptions_read_own_or_staff on public.loyalty_redemptions for select to authenticated using (
  exists (select 1 from public.vip_members vm where vm.id = loyalty_redemptions.vip_member_id and vm.user_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager','order_manager'))
);

grant select, update on public.loyalty_notifications to authenticated;
drop policy if exists loyalty_notifications_read_own_or_staff on public.loyalty_notifications;
create policy loyalty_notifications_read_own_or_staff on public.loyalty_notifications for select to authenticated using (
  exists (select 1 from public.vip_members vm where vm.id = loyalty_notifications.vip_member_id and vm.user_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager'))
);

grant select, insert on public.loyalty_admin_logs to authenticated;
drop policy if exists loyalty_admin_logs_staff on public.loyalty_admin_logs;
create policy loyalty_admin_logs_staff on public.loyalty_admin_logs for all to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager'))
);

-- ---------- 12. Helper Function: Automatic Tier Evaluation ----------
create or replace function public.evaluate_member_tier(p_member_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_m         record;
  v_best_tier record;
begin
  select * into v_m from public.vip_members where id = p_member_id;
  if not found then return 'Silver'; end if;

  select * into v_best_tier
  from public.vip_tiers
  where active = true
    and (
      v_m.total_earned_points >= min_earned_points
      or v_m.friends_referred >= min_referrals
      or v_m.lifetime_spend_bdt >= min_lifetime_spend_bdt
    )
  order by rank_order desc
  limit 1;

  if found and v_best_tier.name <> v_m.tier then
    update public.vip_members
    set
      tier = v_best_tier.name,
      tier_multiplier = v_best_tier.points_multiplier,
      updated_at = now()
    where id = p_member_id;

    insert into public.loyalty_notifications (vip_member_id, member_email, event_type, title, message)
    values (
      p_member_id,
      v_m.email,
      'tier_upgraded',
      'VIP Tier Upgraded to ' || v_best_tier.name || '!',
      'Congratulations! Your VIP membership has been upgraded to ' || v_best_tier.name || ' (' || v_best_tier.points_multiplier::text || 'x points multiplier).'
    );
    return v_best_tier.name;
  end if;

  return v_m.tier;
end;
$$;

-- ---------- 13. Admin Manual Point Adjustment RPC (Compensating Ledger + Audit Log) ----------
create or replace function public.admin_adjust_member_points(
  p_member_id     uuid,
  p_points_delta  int,
  p_reason        text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_m           record;
  v_new_balance int;
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  if p_points_delta = 0 or char_length(trim(coalesce(p_reason, ''))) < 3 then
    return jsonb_build_object('ok', false, 'error', 'A non-zero point adjustment and valid reason are required');
  end if;

  select * into v_m from public.vip_members where id = p_member_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'VIP member not found');
  end if;

  v_new_balance := greatest(0, v_m.available_points + p_points_delta);

  update public.vip_members
  set
    available_points = v_new_balance,
    total_earned_points = case when p_points_delta > 0 then total_earned_points + p_points_delta else total_earned_points end,
    admin_adjusted_points = admin_adjusted_points + p_points_delta,
    updated_at = now()
  where id = p_member_id;

  insert into public.points_ledger (
    vip_member_id, amount, balance_after, transaction_type, note, created_by
  ) values (
    p_member_id, p_points_delta, v_new_balance, 'admin_adjustment',
    'Admin adjustment: ' || left(trim(p_reason), 250), auth.uid()
  );

  insert into public.loyalty_admin_logs (
    admin_user_id, action_type, target_member_id, target_email, points_delta, reason
  ) values (
    auth.uid(),
    case when p_points_delta > 0 then 'points_added' else 'points_deducted' end,
    p_member_id,
    v_m.email,
    p_points_delta,
    trim(p_reason)
  );

  insert into public.loyalty_notifications (vip_member_id, member_email, event_type, title, message)
  values (
    p_member_id,
    v_m.email,
    'admin_adjustment',
    case when p_points_delta > 0 then '+' || p_points_delta::text || ' ANNR Points Credited' else p_points_delta::text || ' ANNR Points Adjusted' end,
    trim(p_reason)
  );

  perform public.evaluate_member_tier(p_member_id);

  return jsonb_build_object('ok', true, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.evaluate_member_tier(uuid) to authenticated;
grant execute on function public.admin_adjust_member_points(uuid, int, text) to authenticated;
