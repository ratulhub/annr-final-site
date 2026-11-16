-- =============================================================================
-- 13_vip_auth_and_login.sql
-- Complete VIP Vault Authentication, Registration, Wallet Sync, Referral Rewards,
-- Withdrawal Processing, Order Points Sync & Admin Loyalty Synchronization
-- =============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard).
-- Safe to run multiple times (100% idempotent & matched to 00_all_migrations_combined.sql).
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA & CONSTRAINT UPGRADES (MATCHING LIVE SUPABASE TABLES)
-- -----------------------------------------------------------------------------
alter table public.vip_members
  add column if not exists password_hash text,
  add column if not exists plain_password_hint text,
  add column if not exists friends_referred int not null default 0,
  add column if not exists redeemed_points int not null default 0,
  add column if not exists lifetime_spend_bdt numeric(12,2) not null default 0,
  add column if not exists lifetime_orders int not null default 0,
  add column if not exists last_login_at timestamptz;

alter table public.loyalty_settings
  add column if not exists welcome_bonus_points int not null default 200,
  add column if not exists referral_signup_bonus_points int not null default 100,
  add column if not exists qualifying_order_status text not null default 'placed',
  add column if not exists order_earn_enabled boolean not null default true,
  add column if not exists points_per_100_bdt int not null default 2,
  add column if not exists redemption_enabled boolean not null default true,
  add column if not exists min_redemption_points int not null default 50,
  add column if not exists max_redemption_points_order int not null default 2000,
  add column if not exists max_redemption_percent_order numeric(5,2) not null default 50.00,
  add column if not exists min_order_for_redemption numeric(12,2) not null default 500.00,
  add column if not exists allow_points_with_coupon boolean not null default true;

-- Expand vip_members.tier check constraint to include 'Platinum'
alter table public.vip_members
  drop constraint if exists vip_members_tier_check;

alter table public.vip_members
  add constraint vip_members_tier_check
  check (tier in ('Silver', 'Gold', 'Platinum', 'Diamond', 'Black'));

-- Remove restrictive points_ledger transaction_type constraint so all storefront & admin ledger events work
alter table public.points_ledger
  drop constraint if exists points_ledger_transaction_type_check;

-- Remove restrictive withdrawal_requests payout_method constraint so upay/rocket/bkash/nagad/bank all work
alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_payout_method_check;

create index if not exists idx_vip_members_email_lower on public.vip_members (lower(email));
create index if not exists idx_vip_members_phone_clean on public.vip_members (regexp_replace(phone, '\D', '', 'g'));

-- Ensure default loyalty_settings row (id = 1) exists with active defaults
insert into public.loyalty_settings (
  id,
  program_enabled,
  welcome_bonus_points,
  referral_signup_bonus_points,
  reward_mode,
  points_per_referral,
  percent_order_points,
  point_value_bdt,
  friend_discount_type,
  friend_discount_value,
  min_order_for_coupon,
  min_withdrawal_bdt,
  max_withdrawal_bdt,
  pending_days_return_window,
  qualifying_order_status
)
values (
  1,
  true,
  200,
  100,
  'fixed_points',
  100,
  5.00,
  1.00,
  'percent',
  10.00,
  500.00,
  100.00,
  25000.00,
  0,
  'placed'
)
on conflict (id) do update set
  program_enabled = coalesce(public.loyalty_settings.program_enabled, true),
  welcome_bonus_points = case
    when coalesce(public.loyalty_settings.welcome_bonus_points, 0) = 0 then 200
    else public.loyalty_settings.welcome_bonus_points
  end,
  referral_signup_bonus_points = coalesce(public.loyalty_settings.referral_signup_bonus_points, 100),
  qualifying_order_status = 'placed',
  pending_days_return_window = 0;

-- Allow public read of loyalty_settings so storefront & admin never hit HTTP 401
grant select on public.loyalty_settings to anon, authenticated;
drop policy if exists loyalty_settings_read_public on public.loyalty_settings;
drop policy if exists "loyalty_settings_public_read" on public.loyalty_settings;
create policy "loyalty_settings_public_read"
  on public.loyalty_settings for select
  to anon, authenticated
  using (true);

-- Clean up temporary diagnostic test rows if present
delete from public.points_ledger
where vip_member_id in (
  select id from public.vip_members
  where lower(email) in ('diag_vip_check@annr.store', 'diag_vip_check2@annr.store', 'ratul_new_test_2026@gmail.com')
);
delete from public.referral_coupons
where vip_member_id in (
  select id from public.vip_members
  where lower(email) in ('diag_vip_check@annr.store', 'diag_vip_check2@annr.store', 'ratul_new_test_2026@gmail.com')
);
delete from public.vip_members
where lower(email) in ('diag_vip_check@annr.store', 'diag_vip_check2@annr.store', 'ratul_new_test_2026@gmail.com');

-- Ensure any existing VIP member created when welcome_bonus_points was 0 receives their welcome bonus
update public.vip_members
set
  available_points = greatest(available_points, 200),
  total_earned_points = greatest(total_earned_points, 200)
where available_points = 0 and total_earned_points = 0;

-- -----------------------------------------------------------------------------
-- 2. DROP ALL PREVIOUS OVERLOADS AUTOMATICALLY TO PREVENT HTTP 300 (PGRST203)
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'generate_vip_referral_code',
        'register_vip_member',
        'login_vip_member',
        'get_vip_member_wallet',
        'request_vip_withdrawal',
        'validate_referral_coupon',
        'place_store_order',
        'admin_get_loyalty_overview',
        'admin_save_loyalty_settings',
        'admin_adjust_member_points',
        'admin_update_vip_member',
        'admin_process_withdrawal'
      )
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. HELPER: GENERATE UNIQUE VIP REFERRAL CODE (MATCHING ^[A-Z0-9_-]{4,20}$)
-- -----------------------------------------------------------------------------
create or replace function public.generate_vip_referral_code(
  p_full_name text default 'VIP'
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prefix text := 'VIP-';
  v_stem text;
  v_code text;
  v_try int := 0;
begin
  select coalesce(nullif(upper(regexp_replace(coupon_prefix, '[^A-Z0-9_-]', '', 'g')), ''), 'VIP-')
  into v_prefix
  from public.loyalty_settings
  where id = 1;

  v_prefix := coalesce(v_prefix, 'VIP-');
  if length(v_prefix) > 6 then
    v_prefix := left(v_prefix, 6);
  end if;

  v_stem := upper(regexp_replace(coalesce(p_full_name, 'ANNR'), '[^a-zA-Z0-9]', '', 'g'));
  if length(v_stem) < 3 then
    v_stem := 'ANNR';
  else
    v_stem := left(v_stem, 6);
  end if;

  loop
    v_try := v_try + 1;
    v_code := v_prefix || v_stem || floor(random() * 899 + 100)::int::text;
    v_code := left(regexp_replace(upper(v_code), '[^A-Z0-9_-]', '', 'g'), 20);

    exit when not exists (
      select 1 from public.vip_members where upper(referral_code) = v_code
    ) and not exists (
      select 1 from public.referral_coupons where upper(code) = v_code
    );

    if v_try > 25 then
      v_code := 'VIP-' || floor(random() * 899999 + 100000)::int::text;
      exit;
    end if;
  end loop;

  return v_code;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. HELPER: BUILD FULL WALLET PAYLOAD FOR ANY VIP MEMBER
-- -----------------------------------------------------------------------------
create or replace function public.get_vip_member_wallet(
  p_identifier text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_id text := lower(trim(coalesce(p_identifier, '')));
  v_clean_phone text := regexp_replace(coalesce(p_identifier, ''), '\D', '', 'g');
  v_phone_last10 text;
  v_member public.vip_members;
  v_coupon public.referral_coupons;
  v_settings public.loyalty_settings;
  v_ledger jsonb := '[]'::jsonb;
  v_withdrawals jsonb := '[]'::jsonb;
  v_referrals jsonb := '[]'::jsonb;
  v_code text;
begin
  if v_clean_id = '' then
    return jsonb_build_object('ok', false, 'error', 'Identifier is required.');
  end if;

  if length(v_clean_phone) >= 10 then
    v_phone_last10 := right(v_clean_phone, 10);
  else
    v_phone_last10 := null;
  end if;

  -- Try UUID match first, then email match, then phone match
  select * into v_member
  from public.vip_members
  where id::text = v_clean_id
     or lower(email) = v_clean_id
     or (
       v_phone_last10 is not null
       and right(regexp_replace(phone, '\D', '', 'g'), 10) = v_phone_last10
     )
  order by (lower(email) = v_clean_id) desc, created_at desc
  limit 1;

  if v_member.id is null then
    return jsonb_build_object('ok', false, 'error', 'VIP member not found.');
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;
  select * into v_coupon from public.referral_coupons where vip_member_id = v_member.id limit 1;

  -- Auto-generate referral coupon if missing
  if v_coupon.code is null then
    v_code := coalesce(nullif(v_member.referral_code, ''), public.generate_vip_referral_code(v_member.full_name));
    insert into public.referral_coupons (
      code, vip_member_id, discount_type, discount_value, min_order_bdt, active
    )
    values (
      v_code,
      v_member.id,
      case when v_settings.friend_discount_type = 'fixed' then 'fixed' else 'percent' end,
      coalesce(v_settings.friend_discount_value, 10),
      coalesce(v_settings.min_order_for_coupon, 500),
      true
    )
    on conflict (code) do update set active = true
    returning * into v_coupon;
  end if;

  select coalesce(jsonb_agg(row_to_json(l)::jsonb order by l.created_at desc), '[]'::jsonb)
  into v_ledger
  from (
    select
      id,
      vip_member_id,
      vip_member_id as member_id,
      transaction_type,
      amount,
      amount as points_delta,
      balance_after,
      reference_id,
      note,
      created_at
    from public.points_ledger
    where vip_member_id = v_member.id
    order by created_at desc
    limit 50
  ) l;

  select coalesce(jsonb_agg(row_to_json(w)::jsonb order by w.requested_at desc), '[]'::jsonb)
  into v_withdrawals
  from (
    select
      id,
      request_number,
      vip_member_id,
      vip_member_id as member_id,
      points_amount,
      money_amount_bdt,
      money_amount_bdt as bdt_amount,
      payout_method,
      account_number,
      account_name,
      status,
      transaction_ref,
      admin_notes,
      admin_notes as admin_note,
      requested_at,
      requested_at as created_at,
      processed_at
    from public.withdrawal_requests
    where vip_member_id = v_member.id
    order by requested_at desc
    limit 30
  ) w;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc), '[]'::jsonb)
  into v_referrals
  from (
    select
      id,
      referrer_member_id,
      coupon_code,
      order_id,
      buyer_email,
      buyer_email as referee_email,
      order_total_bdt,
      discount_given_bdt,
      points_awarded,
      points_awarded as reward_points,
      points_status,
      points_status as status,
      created_at
    from public.referral_uses
    where referrer_member_id = v_member.id
    order by created_at desc
    limit 30
  ) r;

  return jsonb_build_object(
    'ok', true,
    'member', jsonb_build_object(
      'id', v_member.id,
      'user_id', v_member.user_id,
      'full_name', v_member.full_name,
      'email', v_member.email,
      'phone', v_member.phone,
      'is_whatsapp', v_member.is_whatsapp,
      'marketing_consent', v_member.is_whatsapp,
      'division', v_member.division,
      'district', v_member.district,
      'upazila', v_member.upazila,
      'full_address', v_member.full_address,
      'date_of_birth', v_member.date_of_birth,
      'gender', v_member.gender,
      'tier', v_member.tier,
      'tier_multiplier', v_member.tier_multiplier,
      'available_points', v_member.available_points,
      'pending_points', v_member.pending_points,
      'total_earned_points', v_member.total_earned_points,
      'lifetime_points_earned', v_member.total_earned_points,
      'withdrawn_points', v_member.withdrawn_points,
      'lifetime_points_withdrawn', v_member.withdrawn_points,
      'redeemed_points', coalesce(v_member.redeemed_points, 0),
      'friends_referred', greatest(coalesce(v_member.friends_referred, 0), coalesce(v_coupon.times_used, 0)),
      'referral_code', coalesce(v_coupon.code, v_member.referral_code),
      'referred_by_code', v_member.referred_by_code,
      'status', v_member.status,
      'created_at', v_member.created_at
    ),
    'coupon', jsonb_build_object(
      'code', coalesce(v_coupon.code, v_member.referral_code),
      'discount_type', coalesce(v_coupon.discount_type, 'percent'),
      'discount_value', coalesce(v_coupon.discount_value, 10),
      'min_order_bdt', coalesce(v_coupon.min_order_bdt, 500),
      'min_order_amount', coalesce(v_coupon.min_order_bdt, 500),
      'times_used', coalesce(v_coupon.times_used, 0),
      'total_points_generated', coalesce(v_coupon.total_points_generated, 0),
      'active', coalesce(v_coupon.active, true),
      'is_active', coalesce(v_coupon.active, true)
    ),
    'settings', to_jsonb(v_settings),
    'ledger', v_ledger,
    'withdrawals', v_withdrawals,
    'referrals', v_referrals
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. REGISTER VIP MEMBER (SUPPORTS SIGNUP, PASSWORD UPDATE & REFERRAL BONUS)
-- -----------------------------------------------------------------------------
create or replace function public.register_vip_member(
  p_full_name text,
  p_email text,
  p_phone text,
  p_division text default 'Dhaka',
  p_district text default 'Dhaka',
  p_full_address text default 'Dhaka',
  p_upazila text default null,
  p_is_whatsapp boolean default true,
  p_dob date default null,
  p_gender text default null,
  p_referred_by text default null,
  p_password_hash text default null,
  p_plain_password text default null,
  p_marketing_consent boolean default null,
  p_date_of_birth date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.vip_members;
  v_coupon public.referral_coupons;
  v_settings public.loyalty_settings;
  v_referrer_coupon public.referral_coupons;
  v_referrer_member public.vip_members;
  v_code text;
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_clean_ref text := upper(regexp_replace(trim(coalesce(p_referred_by, '')), '[^A-Za-z0-9_-]', '', 'g'));
  v_valid_ref text := null;
  v_consent boolean := coalesce(p_marketing_consent, p_is_whatsapp, true);
  v_birth_date date := coalesce(p_date_of_birth, p_dob);
  v_div text;
  v_dist text;
  v_addr text;
  v_gen text;
  v_final_hash text;
  v_welcome_pts int := 200;
  v_ref_bonus_pts int := 100;
begin
  if trim(coalesce(p_full_name, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'Full name is required.');
  end if;
  if v_clean_email = '' or position('@' in v_clean_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'A valid email address is required.');
  end if;
  if length(v_clean_phone) < 8 then
    return jsonb_build_object('ok', false, 'error', 'A valid mobile phone number is required.');
  end if;

  -- Ensure division satisfies vip_members_division_check
  v_div := initcap(trim(coalesce(p_division, 'Dhaka')));
  if v_div not in ('Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet') then
    v_div := 'Dhaka';
  end if;

  v_dist := trim(coalesce(nullif(trim(p_district), ''), 'Dhaka'));
  if length(v_dist) < 2 then
    v_dist := 'Dhaka';
  end if;

  v_addr := left(coalesce(nullif(trim(p_full_address), ''), 'Dhaka'), 300);

  -- Ensure gender satisfies vip_members_gender_check
  v_gen := lower(trim(coalesce(p_gender, 'prefer_not_to_say')));
  if v_gen not in ('male', 'female', 'other', 'prefer_not_to_say') then
    v_gen := 'prefer_not_to_say';
  end if;

  if v_clean_ref ~ '^[A-Z0-9_-]{4,20}$' then
    v_valid_ref := v_clean_ref;
  end if;

  if p_password_hash is not null and trim(p_password_hash) <> '' then
    v_final_hash := lower(trim(p_password_hash));
  elsif p_plain_password is not null and trim(p_plain_password) <> '' then
    v_final_hash := encode(pg_catalog.sha256(convert_to(trim(p_plain_password) || ':annr_vip_salt', 'UTF8')), 'hex');
  else
    v_final_hash := null;
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;
  v_welcome_pts := coalesce(nullif(v_settings.welcome_bonus_points, 0), 200);
  v_ref_bonus_pts := coalesce(nullif(v_settings.referral_signup_bonus_points, 0), v_settings.points_per_referral, 100);

  -- Match existing account by EMAIL or authenticated user_id only
  select * into v_member
  from public.vip_members
  where (v_uid is not null and user_id = v_uid)
     or lower(email) = v_clean_email
  order by (lower(email) = v_clean_email) desc
  limit 1;

  if v_member.id is not null then
    -- Existing email found: update profile and password (if provided) so the user is never stuck or locked out
    update public.vip_members
    set
      user_id = coalesce(user_id, v_uid),
      full_name = left(coalesce(nullif(trim(p_full_name), ''), full_name), 120),
      phone = left(coalesce(nullif(trim(p_phone), ''), phone), 30),
      division = v_div,
      district = left(v_dist, 50),
      upazila = left(nullif(trim(coalesce(p_upazila, '')), ''), 60),
      full_address = v_addr,
      date_of_birth = coalesce(v_birth_date, date_of_birth),
      gender = v_gen,
      is_whatsapp = coalesce(v_consent, is_whatsapp),
      password_hash = coalesce(v_final_hash, password_hash),
      plain_password_hint = case
        when p_plain_password is not null and length(trim(p_plain_password)) >= 2
        then left(trim(p_plain_password), 1) || repeat('*', greatest(length(trim(p_plain_password)) - 2, 1)) || right(trim(p_plain_password), 1)
        else plain_password_hint
      end,
      last_login_at = now(),
      updated_at = now()
    where id = v_member.id;

    return public.get_vip_member_wallet(v_member.id::text) || jsonb_build_object('existing', true);
  end if;

  -- Check if referred_by code belongs to an active VIP referrer
  if v_valid_ref is not null then
    select * into v_referrer_coupon
    from public.referral_coupons
    where upper(code) = v_valid_ref and active = true
    limit 1;

    if v_referrer_coupon.code is not null then
      select * into v_referrer_member
      from public.vip_members
      where id = v_referrer_coupon.vip_member_id and status = 'active'
      limit 1;
    else
      select * into v_referrer_member
      from public.vip_members
      where upper(referral_code) = v_valid_ref and status = 'active'
      limit 1;
    end if;

    -- Prevent self-referral
    if v_referrer_member.id is not null and lower(v_referrer_member.email) = v_clean_email then
      v_referrer_member := null;
      v_referrer_coupon := null;
    end if;
  end if;

  -- Generate unique referral code BEFORE inserting into vip_members (referral_code is NOT NULL)
  v_code := public.generate_vip_referral_code(p_full_name);

  -- Insert new VIP member with welcome bonus points
  insert into public.vip_members (
    user_id,
    full_name,
    email,
    phone,
    is_whatsapp,
    division,
    district,
    upazila,
    full_address,
    date_of_birth,
    gender,
    referral_code,
    referred_by_code,
    available_points,
    pending_points,
    total_earned_points,
    withdrawn_points,
    redeemed_points,
    friends_referred,
    password_hash,
    plain_password_hint,
    last_login_at
  )
  values (
    v_uid,
    left(trim(p_full_name), 120),
    v_clean_email,
    left(trim(p_phone), 30),
    v_consent,
    v_div,
    left(v_dist, 50),
    left(nullif(trim(coalesce(p_upazila, '')), ''), 60),
    v_addr,
    v_birth_date,
    v_gen,
    v_code,
    v_valid_ref,
    v_welcome_pts,
    0,
    v_welcome_pts,
    0,
    0,
    0,
    v_final_hash,
    case
      when p_plain_password is not null and length(trim(p_plain_password)) >= 2
      then left(trim(p_plain_password), 1) || repeat('*', greatest(length(trim(p_plain_password)) - 2, 1)) || right(trim(p_plain_password), 1)
      else null
    end,
    now()
  )
  returning * into v_member;

  -- Create corresponding referral coupon for new member
  insert into public.referral_coupons (
    code,
    vip_member_id,
    discount_type,
    discount_value,
    min_order_bdt,
    active
  )
  values (
    v_code,
    v_member.id,
    case when v_settings.friend_discount_type = 'fixed' then 'fixed' else 'percent' end,
    coalesce(v_settings.friend_discount_value, 10),
    coalesce(v_settings.min_order_for_coupon, 500),
    true
  )
  returning * into v_coupon;

  -- Log welcome bonus in points_ledger
  if v_welcome_pts > 0 then
    insert into public.points_ledger (
      vip_member_id,
      amount,
      balance_after,
      transaction_type,
      reference_id,
      note,
      created_by
    )
    values (
      v_member.id,
      v_welcome_pts,
      v_member.available_points,
      'welcome_bonus',
      v_member.id::text,
      'VIP Vault Welcome Bonus (' || v_welcome_pts || ' pts)',
      v_uid
    );
  end if;

  -- Credit referrer immediately when a friend signs up with their referral code/link
  if v_referrer_member.id is not null then
    update public.referral_coupons
    set
      times_used = coalesce(times_used, 0) + 1,
      total_points_generated = coalesce(total_points_generated, 0) + v_ref_bonus_pts,
      updated_at = now()
    where vip_member_id = v_referrer_member.id;

    update public.vip_members
    set
      available_points = available_points + v_ref_bonus_pts,
      total_earned_points = total_earned_points + v_ref_bonus_pts,
      friends_referred = coalesce(friends_referred, 0) + 1,
      tier = case
        when (total_earned_points + v_ref_bonus_pts) >= 25000 then 'Black'
        when (total_earned_points + v_ref_bonus_pts) >= 10000 then 'Diamond'
        when (total_earned_points + v_ref_bonus_pts) >= 5000 then 'Platinum'
        when (total_earned_points + v_ref_bonus_pts) >= 1000 then 'Gold'
        else 'Silver'
      end,
      updated_at = now()
    where id = v_referrer_member.id
    returning * into v_referrer_member;

    insert into public.points_ledger (
      vip_member_id,
      amount,
      balance_after,
      transaction_type,
      reference_id,
      note,
      created_by
    )
    values (
      v_referrer_member.id,
      v_ref_bonus_pts,
      v_referrer_member.available_points,
      'referral_signup_bonus',
      v_member.id::text,
      left('Friend referral signup bonus (' || v_member.full_name || ' joined via ' || coalesce(v_valid_ref, v_referrer_member.referral_code) || ')', 300),
      v_uid
    );
  end if;

  return public.get_vip_member_wallet(v_member.id::text) || jsonb_build_object('existing', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. LOGIN VIP MEMBER (BY EMAIL OR PHONE + PASSWORD)
-- -----------------------------------------------------------------------------
create or replace function public.login_vip_member(
  p_identifier text,
  p_password_hash text default null,
  p_plain_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_id text := lower(trim(coalesce(p_identifier, '')));
  v_clean_phone text := regexp_replace(coalesce(p_identifier, ''), '\D', '', 'g');
  v_phone_last10 text;
  v_hash_client text;
  v_hash_alt1 text;
  v_hash_alt2 text;
  v_member public.vip_members;
begin
  if v_clean_id = '' then
    return jsonb_build_object('ok', false, 'error', 'Please enter your registered email or mobile number.');
  end if;

  if length(v_clean_phone) >= 10 then
    v_phone_last10 := right(v_clean_phone, 10);
  else
    v_phone_last10 := null;
  end if;

  if p_password_hash is not null and trim(p_password_hash) <> '' then
    v_hash_client := lower(trim(p_password_hash));
  end if;
  if p_plain_password is not null and trim(p_plain_password) <> '' then
    v_hash_alt1 := encode(pg_catalog.sha256(convert_to(trim(p_plain_password) || ':annr_vip_salt', 'UTF8')), 'hex');
    v_hash_alt2 := encode(pg_catalog.sha256(convert_to('annr_vip_salt_2026:' || trim(p_plain_password), 'UTF8')), 'hex');
  end if;

  -- If logging in by phone where multiple rows exist, prefer the row whose password matches or most recently updated
  select * into v_member
  from public.vip_members
  where lower(email) = v_clean_id
     or (
       v_phone_last10 is not null
       and right(regexp_replace(phone, '\D', '', 'g'), 10) = v_phone_last10
     )
  order by
    (lower(email) = v_clean_id) desc,
    (
      password_hash is not null
      and lower(password_hash) in (
        coalesce(v_hash_client, ''),
        coalesce(v_hash_alt1, ''),
        coalesce(v_hash_alt2, ''),
        'plain:' || lower(trim(coalesce(p_plain_password, '')))
      )
    ) desc,
    updated_at desc nulls last,
    created_at desc
  limit 1;

  if v_member.id is null then
    return jsonb_build_object(
      'ok', false,
      'not_found', true,
      'error', 'No VIP account found with this email or mobile number. Please click Create Account below to join!'
    );
  end if;

  if v_member.status = 'suspended' then
    return jsonb_build_object(
      'ok', false,
      'error', 'This VIP account is currently suspended. Please contact AnnR support.'
    );
  end if;

  if v_member.password_hash is not null
     and v_member.password_hash <> ''
     and lower(v_member.password_hash) <> 'annr_migration_reset'
  then
    if lower(v_member.password_hash) not in (
      coalesce(v_hash_client, ''),
      coalesce(v_hash_alt1, ''),
      coalesce(v_hash_alt2, ''),
      'plain:' || lower(trim(coalesce(p_plain_password, ''))),
      lower(trim(coalesce(p_plain_password, '')))
    ) then
      return jsonb_build_object(
        'ok', false,
        'wrong_password', true,
        'error', 'Incorrect password for this VIP account. Please try again.'
      );
    end if;
  elsif coalesce(v_hash_client, v_hash_alt1) is not null then
    -- Legacy / migrated account: save their password on first sign-in
    update public.vip_members
    set
      password_hash = coalesce(v_hash_client, v_hash_alt1),
      plain_password_hint = case
        when p_plain_password is not null and length(trim(p_plain_password)) >= 2
        then left(trim(p_plain_password), 1) || repeat('*', greatest(length(trim(p_plain_password)) - 2, 1)) || right(trim(p_plain_password), 1)
        else plain_password_hint
      end
    where id = v_member.id;
  end if;

  update public.vip_members
  set last_login_at = now(), updated_at = now()
  where id = v_member.id;

  return public.get_vip_member_wallet(v_member.id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. VALIDATE REFERRAL COUPON AT CHECKOUT
-- -----------------------------------------------------------------------------
create or replace function public.validate_referral_coupon(
  p_code text,
  p_order_total numeric,
  p_buyer_email text default null,
  p_buyer_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_clean_email text := lower(trim(coalesce(p_buyer_email, '')));
  v_clean_phone text := regexp_replace(coalesce(p_buyer_phone, ''), '\D', '', 'g');
  v_coupon public.referral_coupons;
  v_owner public.vip_members;
  v_settings public.loyalty_settings;
  v_discount numeric(12,2) := 0;
  v_reward_pts int := 100;
begin
  if v_clean_code = '' then
    return jsonb_build_object('valid', false, 'error', 'Please enter a coupon code.');
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;
  if not coalesce(v_settings.program_enabled, true) then
    return jsonb_build_object('valid', false, 'error', 'The VIP referral program is currently paused.');
  end if;

  select * into v_coupon
  from public.referral_coupons
  where upper(code) = v_clean_code and active = true
  limit 1;

  if v_coupon.code is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code.');
  end if;

  select * into v_owner
  from public.vip_members
  where id = v_coupon.vip_member_id
  limit 1;

  if v_owner.id is null or v_owner.status <> 'active' then
    return jsonb_build_object('valid', false, 'error', 'This referral coupon is currently unavailable.');
  end if;

  -- Anti-self-referral check
  if (v_clean_email <> '' and lower(v_owner.email) = v_clean_email)
     or (length(v_clean_phone) >= 10 and right(regexp_replace(v_owner.phone, '\D', '', 'g'), 10) = right(v_clean_phone, 10))
     or (auth.uid() is not null and v_owner.user_id = auth.uid())
  then
    return jsonb_build_object('valid', false, 'error', 'Self-referral is strictly prohibited. You cannot use your own referral coupon.');
  end if;

  if coalesce(p_order_total, 0) < coalesce(v_coupon.min_order_bdt, 500) then
    return jsonb_build_object(
      'valid', false,
      'error', 'Minimum order amount for this coupon is ৳' || coalesce(v_coupon.min_order_bdt, 500)::text
    );
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round((p_order_total * (v_coupon.discount_value / 100.0)), 2);
  else
    v_discount := least(v_coupon.discount_value, p_order_total);
  end if;

  v_reward_pts := round(coalesce(v_settings.points_per_referral, 100) * coalesce(v_owner.tier_multiplier, 1.0));

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'points_reward', v_reward_pts,
    'referrer_name', v_owner.full_name
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. REQUEST VIP WITHDRAWAL (WORKS FOR BOTH CUSTOM VIP AUTH & SUPABASE AUTH)
-- -----------------------------------------------------------------------------
create or replace function public.request_vip_withdrawal(
  p_points_amount int,
  p_payout_method text,
  p_account_number text,
  p_account_name text default null,
  p_bank_details jsonb default null,
  p_member_id uuid default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.vip_members;
  v_settings public.loyalty_settings;
  v_bdt numeric(12,2);
  v_min_pts int;
  v_req public.withdrawal_requests;
  v_method text := lower(trim(coalesce(p_payout_method, 'bkash')));
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  if not coalesce(v_settings.program_enabled, true) then
    return jsonb_build_object('ok', false, 'error', 'The loyalty program is currently paused.');
  end if;

  -- Locate VIP member by p_member_id, p_email, or auth.uid()
  select * into v_member
  from public.vip_members
  where (p_member_id is not null and id = p_member_id)
     or (p_email is not null and trim(p_email) <> '' and lower(email) = lower(trim(p_email)))
     or (v_uid is not null and user_id = v_uid)
  order by (p_member_id is not null and id = p_member_id) desc
  limit 1
  for update;

  if v_member.id is null then
    return jsonb_build_object('ok', false, 'error', 'VIP member profile not found.');
  end if;

  if v_member.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Your VIP account is not eligible for withdrawals.');
  end if;

  v_bdt := round(coalesce(p_points_amount, 0) * coalesce(v_settings.point_value_bdt, 1.0), 2);
  v_min_pts := ceil(coalesce(v_settings.min_withdrawal_bdt, 100) / greatest(coalesce(v_settings.point_value_bdt, 1.0), 0.01))::int;

  if coalesce(p_points_amount, 0) <= 0 or v_bdt < coalesce(v_settings.min_withdrawal_bdt, 100) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Minimum withdrawal is %s points (৳%s).', v_min_pts, coalesce(v_settings.min_withdrawal_bdt, 100))
    );
  end if;

  if v_bdt > coalesce(v_settings.max_withdrawal_bdt, 25000) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Maximum withdrawal per request is ৳%s.', coalesce(v_settings.max_withdrawal_bdt, 25000))
    );
  end if;

  if v_member.available_points < p_points_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available points balance.');
  end if;

  if trim(coalesce(p_account_number, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'Payout account/mobile number is required.');
  end if;

  update public.vip_members
  set
    available_points = available_points - p_points_amount,
    withdrawn_points = withdrawn_points + p_points_amount,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.withdrawal_requests (
    vip_member_id,
    points_amount,
    money_amount_bdt,
    payout_method,
    account_number,
    account_name,
    bank_details,
    status
  )
  values (
    v_member.id,
    p_points_amount,
    v_bdt,
    v_method,
    left(trim(p_account_number), 50),
    left(nullif(trim(coalesce(p_account_name, v_member.full_name)), ''), 100),
    p_bank_details,
    'pending'
  )
  returning * into v_req;

  insert into public.points_ledger (
    vip_member_id,
    amount,
    balance_after,
    transaction_type,
    reference_id,
    note,
    created_by
  )
  values (
    v_member.id,
    -p_points_amount,
    v_member.available_points,
    'withdrawal_locked',
    v_req.id::text,
    left(format('Withdrawal request #%s of %s pts (৳%s) via %s (%s)', v_req.request_number, p_points_amount, v_bdt, upper(v_method), trim(p_account_number)), 300),
    v_uid
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_req.id,
    'request_number', v_req.request_number,
    'points_deducted', p_points_amount,
    'bdt_amount', v_bdt,
    'money_amount_bdt', v_bdt,
    'new_available_points', v_member.available_points,
    'remaining_points', v_member.available_points,
    'withdrawal', row_to_json(v_req)::jsonb
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. PLACE STORE ORDER (CREDITS REFERRER IMMEDIATELY + EARNS VIP POINTS)
-- -----------------------------------------------------------------------------
create or replace function public.place_store_order(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_division text,
  p_district text,
  p_full_address text,
  p_items jsonb,
  p_payment_method text,
  p_trx_id text default null,
  p_coupon_code text default null,
  p_customer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_settings public.loyalty_settings;
  v_order_id uuid;
  v_order_num bigint;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := 130;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_ref_coupon public.referral_coupons;
  v_regular_coupon record;
  v_ref_member public.vip_members;
  v_buyer_member public.vip_members;
  v_is_referral boolean := false;
  v_instant_credit boolean := true;
  v_points int := 0;
  v_earn_pts int := 0;
  v_uid uuid := auth.uid();
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_clean_code text := upper(trim(coalesce(p_coupon_code, '')));
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_instant_credit := coalesce(v_settings.qualifying_order_status, 'placed') <> 'fulfilled';

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Shopping bag is empty');
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (coalesce((v_item->>'price')::numeric, 0) * greatest(coalesce((v_item->>'quantity')::int, 1), 1));
  end loop;

  if lower(trim(coalesce(p_district, ''))) = 'dhaka' then
    v_shipping := 70.00;
  elsif lower(trim(coalesce(p_district, ''))) in ('gazipur', 'narayanganj') then
    v_shipping := 100.00;
  else
    v_shipping := 130.00;
  end if;

  if v_clean_code <> '' then
    select * into v_ref_coupon
    from public.referral_coupons
    where upper(code) = v_clean_code and active = true
    limit 1;

    if v_ref_coupon.code is not null then
      select * into v_ref_member
      from public.vip_members
      where id = v_ref_coupon.vip_member_id and status = 'active'
      limit 1;

      if v_ref_member.id is not null then
        if lower(v_ref_member.email) = v_clean_email
           or (v_uid is not null and v_ref_member.user_id = v_uid)
           or (length(v_clean_phone) >= 10 and right(regexp_replace(v_ref_member.phone, '\D', '', 'g'), 10) = right(v_clean_phone, 10))
        then
          return jsonb_build_object('ok', false, 'error', 'You cannot use your own referral coupon.');
        end if;

        if v_subtotal >= coalesce(v_ref_coupon.min_order_bdt, 500) then
          v_is_referral := true;
          if v_ref_coupon.discount_type = 'percent' then
            v_discount := round(v_subtotal * (v_ref_coupon.discount_value / 100.0), 2);
          else
            v_discount := least(v_ref_coupon.discount_value, v_subtotal);
          end if;
        end if;
      end if;
    else
      select * into v_regular_coupon from public.discounts where upper(code) = v_clean_code and active = true limit 1;
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

  insert into public.orders (
    user_id, email, status, payment_status, subtotal, discount_total, shipping_total, total,
    currency, payment_provider_ref, shipping_address
  ) values (
    v_uid,
    v_clean_email,
    'pending',
    case when p_payment_method = 'cod' then 'unpaid' else 'paid' end,
    v_subtotal,
    v_discount,
    v_shipping,
    v_total,
    'BDT',
    coalesce(p_payment_method, 'cod') || case when p_trx_id is not null and char_length(trim(p_trx_id)) > 0 then ':' || trim(p_trx_id) else '' end,
    jsonb_build_object(
      'full_name', trim(p_customer_name),
      'phone', trim(p_phone),
      'division', p_division,
      'district', p_district,
      'full_address', p_full_address,
      'notes', p_customer_notes
    )
  )
  returning id, order_number into v_order_id, v_order_num;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (
      order_id, title, unit_price, quantity
    ) values (
      v_order_id,
      coalesce(v_item->>'title', 'AnnR Apparel'),
      coalesce((v_item->>'price')::numeric, 0),
      greatest(coalesce((v_item->>'quantity')::int, 1), 1)
    );
  end loop;

  -- Credit buyer purchase points if buyer has a VIP account
  select * into v_buyer_member
  from public.vip_members
  where (v_uid is not null and user_id = v_uid)
     or (v_clean_email <> '' and lower(email) = v_clean_email)
  order by (lower(email) = v_clean_email) desc
  limit 1;

  if v_buyer_member.id is not null and coalesce(v_settings.order_earn_enabled, true) then
    v_earn_pts := floor(((v_subtotal - v_discount) / 100.0) * coalesce(v_settings.points_per_100_bdt, 2) * coalesce(v_buyer_member.tier_multiplier, 1.0))::int;
    if v_earn_pts > 0 then
      update public.vip_members
      set
        available_points = available_points + v_earn_pts,
        total_earned_points = total_earned_points + v_earn_pts,
        lifetime_spend_bdt = coalesce(lifetime_spend_bdt, 0) + v_total,
        lifetime_orders = coalesce(lifetime_orders, 0) + 1,
        updated_at = now()
      where id = v_buyer_member.id
      returning * into v_buyer_member;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_buyer_member.id,
        v_earn_pts,
        v_buyer_member.available_points,
        'order_earn',
        v_order_id::text,
        left('Earned +' || v_earn_pts::text || ' pts from Order #' || v_order_num::text, 300),
        v_uid
      );
    end if;
  end if;

  -- Credit referrer when VIP referral coupon is used
  if v_is_referral and v_ref_member.id is not null then
    if v_settings.reward_mode = 'fixed_points' then
      v_points := round(coalesce(v_settings.points_per_referral, 100) * coalesce(v_ref_member.tier_multiplier, 1.0));
    else
      v_points := round((v_total * (coalesce(v_settings.percent_order_points, 5.0) / 100.0)) * coalesce(v_ref_member.tier_multiplier, 1.0));
    end if;

    insert into public.referral_uses (
      order_id, coupon_code, referrer_member_id, buyer_email, buyer_user_id,
      order_total_bdt, discount_given_bdt, points_awarded, points_status,
      maturation_date
    ) values (
      v_order_id,
      v_ref_coupon.code,
      v_ref_member.id,
      v_clean_email,
      v_uid,
      v_total,
      v_discount,
      v_points,
      case when v_instant_credit then 'available' else 'pending' end,
      now() + (coalesce(v_settings.pending_days_return_window, 0) || ' days')::interval
    );

    update public.referral_coupons
    set
      times_used = coalesce(times_used, 0) + 1,
      total_points_generated = coalesce(total_points_generated, 0) + v_points,
      updated_at = now()
    where id = v_ref_coupon.id;

    if v_instant_credit then
      update public.vip_members
      set
        available_points = available_points + v_points,
        total_earned_points = total_earned_points + v_points,
        friends_referred = coalesce(friends_referred, 0) + 1,
        tier = case
          when (total_earned_points + v_points) >= 25000 then 'Black'
          when (total_earned_points + v_points) >= 10000 then 'Diamond'
          when (total_earned_points + v_points) >= 5000 then 'Platinum'
          when (total_earned_points + v_points) >= 1000 then 'Gold'
          else 'Silver'
        end,
        updated_at = now()
      where id = v_ref_member.id
      returning * into v_ref_member;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_ref_member.id,
        v_points,
        v_ref_member.available_points,
        'referral_matured',
        v_order_id::text,
        left('Earned +' || v_points::text || ' pts from referral order #' || v_order_num::text || ' (' || v_ref_coupon.code || ')', 300),
        v_uid
      );
    else
      update public.vip_members
      set
        pending_points = pending_points + v_points,
        total_earned_points = total_earned_points + v_points,
        friends_referred = coalesce(friends_referred, 0) + 1,
        updated_at = now()
      where id = v_ref_member.id
      returning * into v_ref_member;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_ref_member.id,
        v_points,
        v_ref_member.available_points,
        'referral_pending',
        v_order_id::text,
        left('Pending ' || v_points::text || ' pts from order #' || v_order_num::text, 300),
        v_uid
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_num,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'discount', v_discount,
    'points_earned', v_earn_pts,
    'total', v_total
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. ADMIN LOYALTY SYNCHRONIZATION RPCS
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_loyalty_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_settings public.loyalty_settings;
  v_members jsonb := '[]'::jsonb;
  v_coupons jsonb := '[]'::jsonb;
  v_withdrawals jsonb := '[]'::jsonb;
  v_ledger jsonb := '[]'::jsonb;
  v_conversions jsonb := '[]'::jsonb;
begin
  select * into v_settings from public.loyalty_settings where id = 1;

  select coalesce(jsonb_agg(row_to_json(m)::jsonb order by m.created_at desc), '[]'::jsonb)
  into v_members
  from (
    select
      vm.id,
      vm.user_id,
      vm.full_name,
      vm.email,
      vm.phone,
      vm.is_whatsapp,
      vm.is_whatsapp as marketing_consent,
      vm.division,
      vm.district,
      vm.upazila,
      vm.full_address,
      vm.date_of_birth,
      vm.gender,
      vm.tier,
      vm.tier_multiplier,
      vm.available_points,
      vm.pending_points,
      vm.total_earned_points,
      vm.total_earned_points as lifetime_points_earned,
      vm.withdrawn_points,
      vm.withdrawn_points as lifetime_points_withdrawn,
      coalesce(vm.redeemed_points, 0) as redeemed_points,
      greatest(coalesce(vm.friends_referred, 0), coalesce(rc.times_used, 0)) as friends_referred,
      coalesce(rc.code, vm.referral_code) as referral_code,
      vm.referred_by_code,
      vm.status,
      vm.created_at,
      vm.updated_at,
      coalesce(rc.times_used, 0) as coupon_times_used
    from public.vip_members vm
    left join public.referral_coupons rc on rc.vip_member_id = vm.id
    order by vm.created_at desc
  ) m;

  select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.created_at desc), '[]'::jsonb)
  into v_coupons
  from public.referral_coupons c;

  select coalesce(jsonb_agg(row_to_json(w)::jsonb order by w.requested_at desc), '[]'::jsonb)
  into v_withdrawals
  from (
    select
      wr.*,
      wr.vip_member_id as member_id,
      wr.money_amount_bdt as bdt_amount,
      wr.admin_notes as admin_note,
      wr.requested_at as created_at,
      jsonb_build_object(
        'full_name', vm.full_name,
        'email', vm.email,
        'phone', vm.phone,
        'tier', vm.tier
      ) as vip_members
    from public.withdrawal_requests wr
    left join public.vip_members vm on vm.id = wr.vip_member_id
    order by wr.requested_at desc
    limit 200
  ) w;

  select coalesce(jsonb_agg(row_to_json(l)::jsonb order by l.created_at desc), '[]'::jsonb)
  into v_ledger
  from (
    select
      pl.*,
      pl.vip_member_id as member_id,
      pl.amount as points_delta
    from public.points_ledger pl
    order by pl.created_at desc
    limit 300
  ) l;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc), '[]'::jsonb)
  into v_conversions
  from (
    select * from public.referral_uses
    order by created_at desc
    limit 200
  ) r;

  return jsonb_build_object(
    'ok', true,
    'settings', to_jsonb(v_settings),
    'members', v_members,
    'coupons', v_coupons,
    'withdrawals', v_withdrawals,
    'ledger', v_ledger,
    'conversions', v_conversions
  );
end;
$$;

create or replace function public.admin_save_loyalty_settings(
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_settings public.loyalty_settings;
  v_disc_type text;
begin
  v_disc_type := lower(trim(coalesce(p_settings->>'friend_discount_type', p_settings->>'referral_discount_type', '')));
  if v_disc_type = 'fixed' then
    v_disc_type := 'fixed';
  else
    v_disc_type := 'percent';
  end if;

  update public.loyalty_settings
  set
    program_enabled = coalesce((p_settings->>'program_enabled')::boolean, (p_settings->>'is_program_enabled')::boolean, program_enabled),
    welcome_bonus_points = coalesce((p_settings->>'welcome_bonus_points')::int, (p_settings->>'welcome_points')::int, welcome_bonus_points),
    friend_discount_type = v_disc_type,
    friend_discount_value = coalesce((p_settings->>'friend_discount_value')::numeric, (p_settings->>'referral_discount_value')::numeric, friend_discount_value),
    min_order_for_coupon = coalesce((p_settings->>'min_order_for_coupon')::numeric, (p_settings->>'referral_min_order_amount')::numeric, min_order_for_coupon),
    points_per_referral = coalesce((p_settings->>'points_per_referral')::int, points_per_referral),
    referral_signup_bonus_points = coalesce((p_settings->>'referral_signup_bonus_points')::int, (p_settings->>'points_per_referral')::int, referral_signup_bonus_points),
    point_value_bdt = coalesce((p_settings->>'point_value_bdt')::numeric, (p_settings->>'redemption_rate_bdt_per_point')::numeric, point_value_bdt),
    min_withdrawal_bdt = coalesce((p_settings->>'min_withdrawal_bdt')::numeric, (p_settings->>'min_withdrawal_points')::numeric, min_withdrawal_bdt),
    max_withdrawal_bdt = greatest(
      coalesce((p_settings->>'max_withdrawal_bdt')::numeric, (p_settings->>'max_withdrawal_points_per_day')::numeric, max_withdrawal_bdt),
      coalesce((p_settings->>'min_withdrawal_bdt')::numeric, (p_settings->>'min_withdrawal_points')::numeric, min_withdrawal_bdt)
    ),
    pending_days_return_window = coalesce((p_settings->>'pending_days_return_window')::int, (p_settings->>'holding_period_days')::int, pending_days_return_window),
    updated_at = now()
  where id = 1
  returning * into v_settings;

  -- Also keep existing referral_coupons in sync with updated discount rules
  update public.referral_coupons
  set
    discount_type = v_settings.friend_discount_type,
    discount_value = v_settings.friend_discount_value,
    min_order_bdt = v_settings.min_order_for_coupon,
    updated_at = now();

  return jsonb_build_object('ok', true, 'settings', to_jsonb(v_settings));
end;
$$;

create or replace function public.admin_adjust_member_points(
  p_member_id uuid default null,
  p_email text default null,
  p_points_delta int default 0,
  p_note text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.vip_members;
  v_new_avail int;
  v_new_lifetime int;
  v_final_note text := left(coalesce(nullif(trim(p_note), ''), nullif(trim(p_reason), ''), 'Admin manual adjustment'), 300);
begin
  select * into v_member
  from public.vip_members
  where (p_member_id is not null and id = p_member_id)
     or (p_email is not null and lower(email) = lower(trim(p_email)))
  limit 1
  for update;

  if v_member.id is null then
    return jsonb_build_object('ok', false, 'error', 'VIP member not found.');
  end if;

  v_new_avail := greatest(0, v_member.available_points + coalesce(p_points_delta, 0));
  v_new_lifetime := case
    when coalesce(p_points_delta, 0) > 0 then v_member.total_earned_points + p_points_delta
    else v_member.total_earned_points
  end;

  update public.vip_members
  set
    available_points = v_new_avail,
    total_earned_points = v_new_lifetime,
    tier = case
      when v_new_lifetime >= 25000 then 'Black'
      when v_new_lifetime >= 10000 then 'Diamond'
      when v_new_lifetime >= 5000 then 'Platinum'
      when v_new_lifetime >= 1000 then 'Gold'
      else 'Silver'
    end,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.points_ledger (
    vip_member_id,
    amount,
    balance_after,
    transaction_type,
    reference_id,
    note,
    created_by
  )
  values (
    v_member.id,
    coalesce(p_points_delta, 0),
    v_member.available_points,
    'admin_adjustment',
    v_member.id::text,
    v_final_note,
    auth.uid()
  );

  return jsonb_build_object('ok', true, 'member', row_to_json(v_member)::jsonb);
end;
$$;

create or replace function public.admin_update_vip_member(
  p_member_id uuid default null,
  p_email text default null,
  p_tier text default null,
  p_available_points int default null,
  p_status text default null,
  p_coupon_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.vip_members;
  v_delta int := 0;
begin
  select * into v_member
  from public.vip_members
  where (p_member_id is not null and id = p_member_id)
     or (p_email is not null and lower(email) = lower(trim(p_email)))
  limit 1
  for update;

  if v_member.id is null then
    return jsonb_build_object('ok', false, 'error', 'VIP member not found.');
  end if;

  if p_available_points is not null then
    v_delta := p_available_points - v_member.available_points;
  end if;

  update public.vip_members
  set
    tier = coalesce(nullif(trim(p_tier), ''), tier),
    available_points = coalesce(p_available_points, available_points),
    total_earned_points = case
      when v_delta > 0 then total_earned_points + v_delta
      else total_earned_points
    end,
    status = coalesce(nullif(trim(p_status), ''), status),
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  if v_delta <> 0 then
    insert into public.points_ledger (
      vip_member_id,
      amount,
      balance_after,
      transaction_type,
      reference_id,
      note,
      created_by
    )
    values (
      v_member.id,
      v_delta,
      v_member.available_points,
      'admin_adjustment',
      v_member.id::text,
      'Admin member points update',
      auth.uid()
    );
  end if;

  if p_coupon_active is not null then
    update public.referral_coupons
    set active = p_coupon_active, updated_at = now()
    where vip_member_id = v_member.id;
  end if;

  return jsonb_build_object('ok', true, 'member', row_to_json(v_member)::jsonb);
end;
$$;

create or replace function public.admin_process_withdrawal(
  p_request_id uuid,
  p_new_status text default null,
  p_transaction_ref text default null,
  p_admin_note text default null,
  p_action text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_req public.withdrawal_requests;
  v_member public.vip_members;
  v_status text := lower(trim(coalesce(nullif(p_new_status, ''), nullif(p_action, ''), '')));
  v_note text := left(coalesce(nullif(trim(p_admin_note), ''), nullif(trim(p_admin_notes), '')), 500);
begin
  select * into v_req
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request not found.');
  end if;

  if v_req.status in ('paid', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request has already been finalized.');
  end if;

  if v_status not in ('approved', 'paid', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status transition.');
  end if;

  update public.withdrawal_requests
  set
    status = v_status,
    transaction_ref = left(coalesce(nullif(trim(p_transaction_ref), ''), transaction_ref), 100),
    admin_notes = coalesce(v_note, admin_notes),
    processed_at = now(),
    processed_by = auth.uid()
  where id = p_request_id
  returning * into v_req;

  select * into v_member from public.vip_members where id = v_req.vip_member_id for update;

  if v_status = 'paid' and v_member.id is not null then
    insert into public.points_ledger (
      vip_member_id,
      amount,
      balance_after,
      transaction_type,
      reference_id,
      note,
      created_by
    )
    values (
      v_req.vip_member_id,
      0,
      coalesce(v_member.available_points, 0),
      'withdrawal_paid',
      v_req.id::text,
      left(format('Withdrawal #%s paid (৳%s via %s). Ref: %s', v_req.request_number, v_req.money_amount_bdt, upper(v_req.payout_method), coalesce(p_transaction_ref, 'N/A')), 300),
      auth.uid()
    );
  elsif v_status = 'rejected' and v_member.id is not null then
    update public.vip_members
    set
      available_points = available_points + v_req.points_amount,
      withdrawn_points = greatest(0, withdrawn_points - v_req.points_amount),
      updated_at = now()
    where id = v_req.vip_member_id
    returning * into v_member;

    insert into public.points_ledger (
      vip_member_id,
      amount,
      balance_after,
      transaction_type,
      reference_id,
      note,
      created_by
    )
    values (
      v_req.vip_member_id,
      v_req.points_amount,
      v_member.available_points,
      'withdrawal_refunded',
      v_req.id::text,
      left(format('Withdrawal #%s rejected & %s points refunded. %s', v_req.request_number, v_req.points_amount, coalesce(v_note, '')), 300),
      auth.uid()
    );
  end if;

  return jsonb_build_object('ok', true, 'request', row_to_json(v_req)::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. GRANT EXECUTE PERMISSIONS TO ANON & AUTHENTICATED
-- -----------------------------------------------------------------------------
grant execute on function public.generate_vip_referral_code(text) to anon, authenticated;
grant execute on function public.get_vip_member_wallet(text) to anon, authenticated;
grant execute on function public.register_vip_member(text, text, text, text, text, text, text, boolean, date, text, text, text, text, boolean, date) to anon, authenticated;
grant execute on function public.login_vip_member(text, text, text) to anon, authenticated;
grant execute on function public.validate_referral_coupon(text, numeric, text, text) to anon, authenticated;
grant execute on function public.request_vip_withdrawal(int, text, text, text, jsonb, uuid, text) to anon, authenticated;
grant execute on function public.place_store_order(text, text, text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_get_loyalty_overview() to anon, authenticated;
grant execute on function public.admin_save_loyalty_settings(jsonb) to anon, authenticated;
grant execute on function public.admin_adjust_member_points(uuid, text, int, text, text) to anon, authenticated;
grant execute on function public.admin_update_vip_member(uuid, text, text, int, text, boolean) to anon, authenticated;
grant execute on function public.admin_process_withdrawal(uuid, text, text, text, text, text) to anon, authenticated;

commit;
