-- =============================================================================
-- 13_vip_auth_and_login.sql
-- Complete VIP Vault Authentication, Registration, Wallet Sync, Referral Rewards,
-- Withdrawal Processing, Order Points Sync & Admin Loyalty Synchronization
-- =============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard).
-- Safe to run multiple times (100% idempotent).
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA & CONSTRAINT UPGRADES
-- -----------------------------------------------------------------------------
alter table public.vip_members
  add column if not exists password_hash text,
  add column if not exists plain_password_hint text,
  add column if not exists friends_referred int not null default 0,
  add column if not exists redeemed_points int not null default 0,
  add column if not exists last_login_at timestamptz;

alter table public.loyalty_settings
  add column if not exists referral_signup_bonus_points int not null default 100,
  add column if not exists earn_rate_bdt_per_point numeric(12,2) not null default 100,
  add column if not exists points_per_bdt_spent numeric(12,4) not null default 0.01,
  add column if not exists max_redemption_pct_per_order numeric(5,2) not null default 50,
  add column if not exists min_Points_to_redeem int not null default 100,
  add column if not exists points_expiry_months int not null default 12,
  add column if not exists tier_thresholds jsonb not null default '{"Silver":0,"Gold":1000,"Platinum":5000,"Diamond":10000,"Black":25000}'::jsonb,
  add column if not exists payment_gateway_fees jsonb not null default '{"bkash":0,"nagad":0,"rocket":0,"upay":0,"bank":0}'::jsonb;

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

-- Ensure default loyalty_settings row (id = 1) exists and credits referral orders immediately
insert into public.loyalty_settings (
  id, is_program_enabled, welcome_points, referral_discount_type, referral_discount_value,
  referral_min_order_amount, points_per_referral, referral_signup_bonus_points,
  redemption_rate_bdt_per_point, min_withdrawal_points, max_withdrawal_points_per_day,
  max_referrals_per_month, qualifying_order_status, holding_period_days
)
values (
  1, true, 200, 'percentage', 10.00,
  500.00, 100, 100,
  1.0000, 500, 10000,
  50, 'placed', 0
)
on conflict (id) do update set
  qualifying_order_status = case
    when public.loyalty_settings.qualifying_order_status = 'fulfilled' then 'placed'
    else public.loyalty_settings.qualifying_order_status
  end;

-- Allow public read of loyalty_settings so storefront & admin never hit HTTP 401
grant select on public.loyalty_settings to anon, authenticated;
drop policy if exists "loyalty_settings_public_read" on public.loyalty_settings;
create policy "loyalty_settings_public_read"
  on public.loyalty_settings for select
  using (true);

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
        'register_vip_member',
        'login_vip_member',
        'get_vip_member_wallet',
        'request_vip_withdrawal',
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
-- 3. HELPER: BUILD FULL WALLET PAYLOAD FOR ANY VIP MEMBER
-- -----------------------------------------------------------------------------
create or replace function public.get_vip_member_wallet(
  p_identifier text
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  select * into v_coupon from public.referral_coupons where member_id = v_member.id limit 1;

  -- Auto-generate referral coupon if missing
  if v_coupon.code is null then
    v_code := public.generate_vip_referral_code(v_member.full_name);
    insert into public.referral_coupons (
      code, member_id, discount_type, discount_value, min_order_amount, is_active
    )
    values (
      v_code,
      v_member.id,
      coalesce(v_settings.referral_discount_type, 'percentage'),
      coalesce(v_settings.referral_discount_value, 10),
      coalesce(v_settings.referral_min_order_amount, 500),
      true
    )
    on conflict (member_id) do update set is_active = true
    returning * into v_coupon;
  end if;

  select coalesce(jsonb_agg(row_to_json(l)::jsonb order by l.created_at desc), '[]'::jsonb)
  into v_ledger
  from (
    select id, member_id, transaction_type, points_delta, balance_after,
           reference_type, reference_id, note, created_at
    from public.points_ledger
    where member_id = v_member.id
    order by created_at desc
    limit 50
  ) l;

  select coalesce(jsonb_agg(row_to_json(w)::jsonb order by w.created_at desc), '[]'::jsonb)
  into v_withdrawals
  from (
    select id, member_id, points_amount, bdt_amount, conversion_rate,
           payout_method, account_number, account_name, status,
           transaction_ref, admin_note, created_at, processed_at
    from public.withdrawal_requests
    where member_id = v_member.id
    order by created_at desc
    limit 30
  ) w;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc), '[]'::jsonb)
  into v_referrals
  from (
    select id, referrer_member_id, coupon_code, order_id, referee_email,
           order_subtotal, discount_applied, reward_points, status, created_at
    from public.referral_conversions
    where referrer_member_id = v_member.id
    order by created_at desc
    limit 30
  ) r;

  return jsonb_build_object(
    'ok', true,
    'member', jsonb_build_object(
      'id', v_member.id,
      'full_name', v_member.full_name,
      'email', v_member.email,
      'phone', v_member.phone,
      'division', v_member.division,
      'district', v_member.district,
      'upazila', v_member.upazila,
      'full_address', v_member.full_address,
      'date_of_birth', v_member.date_of_birth,
      'gender', v_member.gender,
      'preferred_Categories', v_member.preferred_categories,
      'preferred_categories', v_member.preferred_categories,
      'tier', v_member.tier,
      'available_points', v_member.available_points,
      'pending_points', v_member.pending_points,
      'lifetime_points_earned', v_member.lifetime_points_earned,
      'lifetime_points_withdrawn', v_member.lifetime_points_withdrawn,
      'redeemed_points', coalesce(v_member.redeemed_points, 0),
      'friends_referred', greatest(coalesce(v_member.friends_referred, 0), coalesce(v_coupon.times_used, 0)),
      'referred_by_code', v_member.referred_by_code,
      'status', v_member.status,
      'marketing_consent', v_member.marketing_consent,
      'created_at', v_member.created_at
    ),
    'coupon', jsonb_build_object(
      'code', v_coupon.code,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'min_order_amount', v_coupon.min_order_amount,
      'times_used', coalesce(v_coupon.times_used, 0),
      'is_active', coalesce(v_coupon.is_active, true)
    ),
    'settings', to_jsonb(v_settings),
    'ledger', v_ledger,
    'withdrawals', v_withdrawals,
    'referrals', v_referrals
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. REGISTER VIP MEMBER (SUPPORTS SIGNUP, PASSWORD UPDATE & REFERRAL BONUS)
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
set search_path = public
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
  v_clean_ref text := upper(trim(coalesce(p_referred_by, '')));
  v_consent boolean := coalesce(p_marketing_consent, p_is_whatsapp, true);
  v_birth_date date := coalesce(p_date_of_birth, p_dob);
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

  if p_password_hash is not null and trim(p_password_hash) <> '' then
    v_final_hash := lower(trim(p_password_hash));
  elsif p_plain_password is not null and trim(p_plain_password) <> '' then
    v_final_hash := encode(digest(trim(p_plain_password) || ':annr_vip_salt', 'sha256'), 'hex');
  else
    v_final_hash := null;
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;
  v_welcome_pts := coalesce(v_settings.welcome_points, 200);
  v_ref_bonus_pts := coalesce(nullif(v_settings.referral_signup_bonus_points, 0), v_settings.points_per_referral, 100);

  -- Match existing account by EMAIL or authenticated user_id only (never block a new email due to shared test phone numbers)
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
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      division = coalesce(nullif(trim(p_division), ''), division),
      district = coalesce(nullif(trim(p_district), ''), district),
      upazila = coalesce(nullif(trim(p_upazila), ''), upazila),
      full_address = coalesce(nullif(trim(p_full_address), ''), full_address),
      date_of_birth = coalesce(v_birth_date, date_of_birth),
      gender = coalesce(nullif(trim(p_gender), ''), gender),
      marketing_consent = coalesce(v_consent, marketing_consent),
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
  if v_clean_ref <> '' then
    select * into v_referrer_coupon
    from public.referral_coupons
    where upper(code) = v_clean_ref and is_active = true
    limit 1;

    if v_referrer_coupon.code is not null then
      select * into v_referrer_member
      from public.vip_members
      where id = v_referrer_coupon.member_id and status = 'active'
      limit 1;

      -- Prevent self-referral
      if v_referrer_member.id is not null and lower(v_referrer_member.email) = v_clean_email then
        v_referrer_member := null;
        v_referrer_coupon := null;
      end if;
    end if;
  end if;

  -- Insert new VIP member with welcome bonus points
  insert into public.vip_members (
    user_id, full_name, email, phone, division, district, upazila, full_address,
    date_of_birth, gender, referred_by_code, marketing_consent,
    available_points, pending_points, lifetime_points_earned, lifetime_points_withdrawn,
    redeemed_points, friends_referred,
    password_hash, plain_password_hint, last_login_at
  )
  values (
    v_uid,
    trim(p_full_name),
    v_clean_email,
    trim(p_phone),
    coalesce(nullif(trim(p_division), ''), 'Dhaka'),
    coalesce(nullif(trim(p_district), ''), 'Dhaka'),
    nullif(trim(coalesce(p_upazila, '')), ''),
    coalesce(nullif(trim(p_full_address), ''), 'Dhaka'),
    v_birth_date,
    nullif(trim(coalesce(p_gender, '')), ''),
    case when v_referrer_coupon.code is not null then v_referrer_coupon.code else nullif(v_clean_ref, '') end,
    v_consent,
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

  -- Generate unique referral coupon for new member
  v_code := public.generate_vip_referral_code(p_full_name);

  insert into public.referral_coupons (
    code, member_id, discount_type, discount_value, min_order_amount, is_active
  )
  values (
    v_code,
    v_member.id,
    coalesce(v_settings.referral_discount_type, 'percentage'),
    coalesce(v_settings.referral_discount_value, 10),
    coalesce(v_settings.referral_min_order_amount, 500),
    true
  )
  returning * into v_coupon;

  -- Log welcome bonus in points_ledger
  if v_welcome_pts > 0 then
    insert into public.points_ledger (
      member_id, transaction_type, points_delta, balance_after,
      reference_type, reference_id, note
    )
    values (
      v_member.id,
      'welcome_bonus',
      v_welcome_pts,
      v_member.available_points,
      'registration',
      v_member.id::text,
      'VIP Vault Welcome Bonus (' || v_welcome_pts || ' pts)'
    );
  end if;

  -- Credit referrer immediately when a friend signs up with their referral code/link
  if v_referrer_member.id is not null and v_referrer_coupon.code is not null then
    update public.referral_coupons
    set times_used = coalesce(times_used, 0) + 1
    where code = v_referrer_coupon.code;

    update public.vip_members
    set
      available_points = available_points + v_ref_bonus_pts,
      lifetime_points_earned = lifetime_points_earned + v_ref_bonus_pts,
      friends_referred = coalesce(friends_referred, 0) + 1,
      tier = case
        when (lifetime_points_earned + v_ref_bonus_pts) >= 25000 then 'Black'
        when (lifetime_points_earned + v_ref_bonus_pts) >= 10000 then 'Diamond'
        when (lifetime_points_earned + v_ref_bonus_pts) >= 5000 then 'Platinum'
        when (lifetime_points_earned + v_ref_bonus_pts) >= 1000 then 'Gold'
        else 'Silver'
      end,
      updated_at = now()
    where id = v_referrer_member.id
    returning * into v_referrer_member;

    insert into public.points_ledger (
      member_id, transaction_type, points_delta, balance_after,
      reference_type, reference_id, note
    )
    values (
      v_referrer_member.id,
      'referral_signup_bonus',
      v_ref_bonus_pts,
      v_referrer_member.available_points,
      'referral_signup',
      v_member.id::text,
      'Friend referral signup bonus (' || v_member.full_name || ' joined via ' || v_referrer_coupon.code || ')'
    );
  end if;

  return public.get_vip_member_wallet(v_member.id::text) || jsonb_build_object('existing', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. LOGIN VIP MEMBER (BY EMAIL OR PHONE + PASSWORD)
-- -----------------------------------------------------------------------------
create or replace function public.login_vip_member(
  p_identifier text,
  p_password_hash text default null,
  p_plain_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
    v_hash_alt1 := encode(digest(trim(p_plain_password) || ':annr_vip_salt', 'sha256'), 'hex');
    v_hash_alt2 := encode(digest('annr_vip_salt_2026:' || trim(p_plain_password), 'sha256'), 'hex');
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

  if v_member.password_hash is not null and v_member.password_hash <> '' then
    if lower(v_member.password_hash) not in (
      coalesce(v_hash_client, ''),
      coalesce(v_hash_alt1, ''),
      coalesce(v_hash_alt2, ''),
      'plain:' || lower(trim(coalesce(p_plain_password, '')))
    ) then
      return jsonb_build_object(
        'ok', false,
        'wrong_password', true,
        'error', 'Incorrect password for this VIP account. Please try again.'
      );
    end if;
  elsif coalesce(v_hash_client, v_hash_alt1) is not null then
    -- Legacy account without password_hash: save their password on first sign-in
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
-- 6. REQUEST VIP WITHDRAWAL (WORKS FOR BOTH CUSTOM VIP AUTH & SUPABASE AUTH)
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
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.vip_members;
  v_settings public.loyalty_settings;
  v_bdt numeric(12,2);
  v_req public.withdrawal_requests;
  v_method text := lower(trim(coalesce(p_payout_method, 'bkash')));
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  if not coalesce(v_settings.is_program_enabled, true) then
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

  if coalesce(p_points_amount, 0) < coalesce(v_settings.min_withdrawal_points, 500) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Minimum withdrawal is %s points.', coalesce(v_settings.min_withdrawal_points, 500))
    );
  end if;

  if p_points_amount > coalesce(v_settings.max_withdrawal_points_per_day, 10000) then
    return jsonb_build_object(
      'ok', false,
      'error', format('Maximum withdrawal per request is %s points.', coalesce(v_settings.max_withdrawal_points_per_day, 10000))
    );
  end if;

  if v_member.available_points < p_points_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available points balance.');
  end if;

  if trim(coalesce(p_account_number, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'Payout account/mobile number is required.');
  end if;

  v_bdt := round(p_points_amount * coalesce(v_settings.redemption_rate_bdt_per_point, 1), 2);

  update public.vip_members
  set
    available_points = available_points - p_points_amount,
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.withdrawal_requests (
    member_id, points_amount, bdt_amount, conversion_rate,
    payout_method, account_number, account_name, bank_details, status
  )
  values (
    v_member.id,
    p_points_amount,
    v_bdt,
    coalesce(v_settings.redemption_rate_bdt_per_point, 1),
    v_method,
    trim(p_account_number),
    nullif(trim(coalesce(p_account_name, v_member.full_name)), ''),
    p_bank_details,
    'pending'
  )
  returning * into v_req;

  insert into public.points_ledger (
    member_id, transaction_type, points_delta, balance_after,
    reference_type, reference_id, note
  )
  values (
    v_member.id,
    'withdrawal_locked',
    -p_points_amount,
    v_member.available_points,
    'withdrawal',
    v_req.id::text,
    format('Withdrawal request of %s pts (BDT %s) via %s (%s)', p_points_amount, v_bdt, upper(v_method), trim(p_account_number))
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_req.id,
    'points_deducted', p_points_amount,
    'bdt_amount', v_bdt,
    'new_available_points', v_member.available_points,
    'withdrawal', row_to_json(v_req)::jsonb
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. PLACE STORE ORDER (CREDITS REFERRER IMMEDIATELY + REDEEMS/EARNS VIP POINTS)
-- -----------------------------------------------------------------------------
create or replace function public.place_store_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_payment_method text,
  p_items jsonb,
  p_shipping_cost numeric default 0,
  p_coupon_code text default null,
  p_points_redeemed int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_email text := lower(trim(coalesce(p_customer_email, '')));
  v_clean_phone text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_points_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_order_id uuid;
  v_item jsonb;
  v_coupon public.referral_coupons;
  v_referrer public.vip_members;
  v_buyer_member public.vip_members;
  v_settings public.loyalty_settings;
  v_clean_code text := upper(trim(coalesce(p_coupon_code, '')));
  v_reward_pts int := 0;
  v_earn_pts int := 0;
  v_redeem_pts int := greatest(coalesce(p_points_redeemed, 0), 0);
  v_monthly_count int := 0;
  v_instant_credit boolean := true;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal + (
      coalesce((v_item->>'price')::numeric, 0) * greatest(coalesce((v_item->>'quantity')::int, 1), 1)
    );
  end loop;

  select * into v_settings from public.loyalty_settings where id = 1;
  v_instant_credit := coalesce(v_settings.qualifying_order_status, 'placed') <> 'fulfilled';

  -- Find buyer VIP member if they have an account
  select * into v_buyer_member
  from public.vip_members
  where (v_uid is not null and user_id = v_uid)
     or (v_clean_email <> '' and lower(email) = v_clean_email)
     or (length(v_clean_phone) >= 10 and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(v_clean_phone, 10))
  order by (v_clean_email <> '' and lower(email) = v_clean_email) desc
  limit 1;

  -- Evaluate referral coupon if provided
  if v_clean_code <> '' and coalesce(v_settings.is_program_enabled, true) then
    select * into v_coupon
    from public.referral_coupons
    where upper(code) = v_clean_code and is_active = true;

    if v_coupon.code is not null then
      select * into v_referrer
      from public.vip_members
      where id = v_coupon.member_id and status = 'active';

      if v_referrer.id is not null
         and lower(v_referrer.email) <> v_clean_email
         and right(regexp_replace(v_referrer.phone, '\D', '', 'g'), 10) <> right(v_clean_phone, 10)
         and v_subtotal >= v_coupon.min_order_amount
      then
        select count(*) into v_monthly_count
        from public.referral_conversions
        where referrer_member_id = v_referrer.id
          and status in ('pending', 'qualified')
          and created_at >= date_trunc('month', now());

        if v_monthly_count < coalesce(v_settings.max_referrals_per_month, 50) then
          if v_coupon.discount_type = 'percentage' then
            v_discount := round((v_subtotal * v_coupon.discount_value) / 100.0, 2);
          else
            v_discount := least(v_coupon.discount_value, v_subtotal);
          end if;
          v_reward_pts := coalesce(v_settings.points_per_referral, 100);
        end if;
      end if;
    end if;
  end if;

  -- Deduct redeemed VIP points from buyer if requested
  if v_redeem_pts > 0 and v_buyer_member.id is not null and v_buyer_member.available_points >= v_redeem_pts then
    v_points_discount := round(v_redeem_pts * coalesce(v_settings.redemption_rate_bdt_per_point, 1), 2);
  else
    v_redeem_pts := 0;
    v_points_discount := 0;
  end if;

  v_total := greatest(v_subtotal - v_discount - v_points_discount, 0) + coalesce(p_shipping_cost, 0);

  insert into public.orders (
    user_id, customer_email, customer_name, customer_phone,
    shipping_address, shipping_city, payment_method,
    subtotal_amount, discount_amount, shipping_cost, total_amount,
    coupon_code, referrer_member_id, status
  )
  values (
    v_uid,
    v_clean_email,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_shipping_address),
    trim(p_shipping_city),
    coalesce(p_payment_method, 'cod'),
    v_subtotal,
    v_discount + v_points_discount,
    coalesce(p_shipping_cost, 0),
    v_total,
    case when v_discount > 0 then v_clean_code else nullif(v_clean_code, '') end,
    case when v_discount > 0 then v_referrer.id else null end,
    'pending'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_title, variant_title, sku, quantity, unit_price, line_total
  )
  select
    v_order_id,
    nullif(item->>'product_id', '')::uuid,
    coalesce(item->>'title', 'Product'),
    item->>'variant',
    item->>'sku',
    greatest(coalesce((item->>'quantity')::int, 1), 1),
    coalesce((item->>'price')::numeric, 0),
    coalesce((item->>'price')::numeric, 0) * greatest(coalesce((item->>'quantity')::int, 1), 1)
  from jsonb_array_elements(p_items) as item;

  -- Process buyer points redemption & order earn points
  if v_buyer_member.id is not null then
    if v_redeem_pts > 0 then
      update public.vip_members
      set
        available_points = greatest(available_points - v_redeem_pts, 0),
        redeemed_points = coalesce(redeemed_points, 0) + v_redeem_pts,
        updated_at = now()
      where id = v_buyer_member.id
      returning * into v_buyer_member;

      insert into public.points_ledger (
        member_id, transaction_type, points_delta, balance_after,
        reference_type, reference_id, note
      )
      values (
        v_buyer_member.id,
        'points_redeemed',
        -v_redeem_pts,
        v_buyer_member.available_points,
        'order',
        v_order_id::text,
        format('Redeemed %s VIP points (BDT %s discount) on Order #%s', v_redeem_pts, v_points_discount, left(v_order_id::text, 8))
      );
    end if;

    v_earn_pts := floor(greatest(v_subtotal - v_discount - v_points_discount, 0) / greatest(coalesce(v_settings.earn_rate_bdt_per_point, 100), 1))::int;
    if v_earn_pts > 0 then
      update public.vip_members
      set
        available_points = available_points + v_earn_pts,
        lifetime_points_earned = lifetime_points_earned + v_earn_pts,
        tier = case
          when (lifetime_points_earned + v_earn_pts) >= 25000 then 'Black'
          when (lifetime_points_earned + v_earn_pts) >= 10000 then 'Diamond'
          when (lifetime_points_earned + v_earn_pts) >= 5000 then 'Platinum'
          when (lifetime_points_earned + v_earn_pts) >= 1000 then 'Gold'
          else 'Silver'
        end,
        updated_at = now()
      where id = v_buyer_member.id
      returning * into v_buyer_member;

      insert into public.points_ledger (
        member_id, transaction_type, points_delta, balance_after,
        reference_type, reference_id, note
      )
      values (
        v_buyer_member.id,
        'order_earn',
        v_earn_pts,
        v_buyer_member.available_points,
        'order',
        v_order_id::text,
        format('Earned %s VIP points from Order #%s', v_earn_pts, left(v_order_id::text, 8))
      );
    end if;
  end if;

  -- Record referral conversion & credit referrer
  if v_discount > 0 and v_referrer.id is not null and v_reward_pts > 0 then
    insert into public.referral_conversions (
      referrer_member_id, coupon_code, order_id, referee_user_id,
      referee_email, referee_phone, order_subtotal, discount_applied,
      reward_points, status, matures_at, qualified_at
    )
    values (
      v_referrer.id,
      v_clean_code,
      v_order_id,
      v_uid,
      v_clean_email,
      trim(p_customer_phone),
      v_subtotal,
      v_discount,
      v_reward_pts,
      case when v_instant_credit then 'qualified' else 'pending' end,
      now() + (coalesce(v_settings.holding_period_days, 0) || ' days')::interval,
      case when v_instant_credit then now() else null end
    );

    update public.referral_coupons
    set times_used = coalesce(times_used, 0) + 1
    where code = v_clean_code;

    if v_instant_credit then
      update public.vip_members
      set
        available_points = available_points + v_reward_pts,
        lifetime_points_earned = lifetime_points_earned + v_reward_pts,
        friends_referred = coalesce(friends_referred, 0) + 1,
        tier = case
          when (lifetime_points_earned + v_reward_pts) >= 25000 then 'Black'
          when (lifetime_points_earned + v_reward_pts) >= 10000 then 'Diamond'
          when (lifetime_points_earned + v_reward_pts) >= 5000 then 'Platinum'
          when (lifetime_points_earned + v_reward_pts) >= 1000 then 'Gold'
          else 'Silver'
        end,
        updated_at = now()
      where id = v_referrer.id
      returning * into v_referrer;

      insert into public.points_ledger (
        member_id, transaction_type, points_delta, balance_after,
        reference_type, reference_id, note
      )
      values (
        v_referrer.id,
        'referral_matured',
        v_reward_pts,
        v_referrer.available_points,
        'order',
        v_order_id::text,
        format('Referral purchase reward from Order #%s (Code: %s)', left(v_order_id::text, 8), v_clean_code)
      );
    else
      update public.vip_members
      set
        pending_points = pending_points + v_reward_pts,
        updated_at = now()
      where id = v_referrer.id
      returning * into v_referrer;

      insert into public.points_ledger (
        member_id, transaction_type, points_delta, balance_after,
        reference_type, reference_id, note
      )
      values (
        v_referrer.id,
        'referral_pending',
        v_reward_pts,
        v_referrer.available_points,
        'order',
        v_order_id::text,
        format('Pending referral reward from Order #%s', left(v_order_id::text, 8))
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'points_discount', v_points_discount,
    'points_redeemed', v_redeem_pts,
    'points_earned', v_earn_pts,
    'shipping_cost', coalesce(p_shipping_cost, 0),
    'total', v_total
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. ADMIN LOYALTY SYNCHRONIZATION RPCS
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_loyalty_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
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
      vm.id, vm.user_id, vm.full_name, vm.email, vm.phone,
      vm.division, vm.district, vm.upazila, vm.full_address,
      vm.date_of_birth, vm.gender, vm.preferred_categories,
      vm.tier, vm.available_points, vm.pending_points,
      vm.lifetime_points_earned, vm.lifetime_points_withdrawn,
      coalesce(vm.redeemed_points, 0) as redeemed_points,
      greatest(coalesce(vm.friends_referred, 0), coalesce(rc.times_used, 0)) as friends_referred,
      vm.referred_by_code, vm.status, vm.marketing_consent,
      vm.created_at, vm.updated_at,
      rc.code as referral_code,
      coalesce(rc.times_used, 0) as coupon_times_used
    from public.vip_members vm
    left join public.referral_coupons rc on rc.member_id = vm.id
    order by vm.created_at desc
  ) m;

  select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.created_at desc), '[]'::jsonb)
  into v_coupons
  from public.referral_coupons c;

  select coalesce(jsonb_agg(row_to_json(w)::jsonb order by w.created_at desc), '[]'::jsonb)
  into v_withdrawals
  from (
    select
      wr.*,
      jsonb_build_object(
        'full_name', vm.full_name,
        'email', vm.email,
        'phone', vm.phone,
        'tier', vm.tier
      ) as vip_members
    from public.withdrawal_requests wr
    left join public.vip_members vm on vm.id = wr.member_id
    order by wr.created_at desc
    limit 200
  ) w;

  select coalesce(jsonb_agg(row_to_json(l)::jsonb order by l.created_at desc), '[]'::jsonb)
  into v_ledger
  from (
    select * from public.points_ledger
    order by created_at desc
    limit 300
  ) l;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc), '[]'::jsonb)
  into v_conversions
  from (
    select * from public.referral_conversions
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
set search_path = public
as $$
declare
  v_settings public.loyalty_settings;
begin
  update public.loyalty_settings
  set
    is_program_enabled = coalesce((p_settings->>'is_program_enabled')::boolean, is_program_enabled),
    welcome_points = coalesce((p_settings->>'welcome_points')::int, welcome_points),
    referral_discount_type = coalesce(nullif(p_settings->>'referral_discount_type', ''), referral_discount_type),
    referral_discount_value = coalesce((p_settings->>'referral_discount_value')::numeric, referral_discount_value),
    referral_min_order_amount = coalesce((p_settings->>'referral_min_order_amount')::numeric, referral_min_order_amount),
    points_per_referral = coalesce((p_settings->>'points_per_referral')::int, points_per_referral),
    referral_signup_bonus_points = coalesce((p_settings->>'referral_signup_bonus_points')::int, referral_signup_bonus_points),
    redemption_rate_bdt_per_point = coalesce((p_settings->>'redemption_rate_bdt_per_point')::numeric, redemption_rate_bdt_per_point),
    earn_rate_bdt_per_point = coalesce((p_settings->>'earn_rate_bdt_per_point')::numeric, earn_rate_bdt_per_point),
    min_withdrawal_points = coalesce((p_settings->>'min_withdrawal_points')::int, min_withdrawal_points),
    max_withdrawal_points_per_day = coalesce((p_settings->>'max_withdrawal_points_per_day')::int, max_withdrawal_points_per_day),
    max_referrals_per_month = coalesce((p_settings->>'max_referrals_per_month')::int, max_referrals_per_month),
    holding_period_days = coalesce((p_settings->>'holding_period_days')::int, holding_period_days),
    updated_at = now()
  where id = 1
  returning * into v_settings;

  -- Also keep existing referral_coupons in sync with updated discount rules
  update public.referral_coupons
  set
    discount_type = v_settings.referral_discount_type,
    discount_value = v_settings.referral_discount_value,
    min_order_amount = v_settings.referral_min_order_amount;

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
set search_path = public
as $$
declare
  v_member public.vip_members;
  v_new_avail int;
  v_new_lifetime int;
  v_final_note text := coalesce(nullif(trim(p_note), ''), nullif(trim(p_reason), ''), 'Admin manual adjustment');
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
    when coalesce(p_points_delta, 0) > 0 then v_member.lifetime_points_earned + p_points_delta
    else v_member.lifetime_points_earned
  end;

  update public.vip_members
  set
    available_points = v_new_avail,
    lifetime_points_earned = v_new_lifetime,
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
    member_id, transaction_type, points_delta, balance_after,
    reference_type, reference_id, note
  )
  values (
    v_member.id,
    'admin_adjustment',
    coalesce(p_points_delta, 0),
    v_member.available_points,
    'admin',
    v_member.id::text,
    v_final_note
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
set search_path = public
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
    lifetime_points_earned = case
      when v_delta > 0 then lifetime_points_earned + v_delta
      else lifetime_points_earned
    end,
    status = coalesce(nullif(trim(p_status), ''), status),
    updated_at = now()
  where id = v_member.id
  returning * into v_member;

  if v_delta <> 0 then
    insert into public.points_ledger (
      member_id, transaction_type, points_delta, balance_after,
      reference_type, reference_id, note
    )
    values (
      v_member.id,
      'admin_adjustment',
      v_delta,
      v_member.available_points,
      'admin',
      v_member.id::text,
      'Admin member points update'
    );
  end if;

  if p_coupon_active is not null then
    update public.referral_coupons
    set is_active = p_coupon_active
    where member_id = v_member.id;
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
set search_path = public
as $$
declare
  v_req public.withdrawal_requests;
  v_member public.vip_members;
  v_status text := lower(trim(coalesce(nullif(p_new_status, ''), nullif(p_action, ''), '')));
  v_note text := coalesce(nullif(trim(p_admin_note), ''), nullif(trim(p_admin_notes), ''));
begin
  select * into v_req
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request not found.');
  end if;

  if v_req.status in ('paid', 'rejected', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request has already been finalized.');
  end if;

  if v_status not in ('approved', 'paid', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status transition.');
  end if;

  update public.withdrawal_requests
  set
    status = v_status,
    transaction_ref = coalesce(nullif(trim(p_transaction_ref), ''), transaction_ref),
    admin_note = coalesce(v_note, admin_note),
    processed_at = now()
  where id = p_request_id
  returning * into v_req;

  if v_status = 'paid' then
    update public.vip_members
    set
      lifetime_points_withdrawn = lifetime_points_withdrawn + v_req.points_amount,
      updated_at = now()
    where id = v_req.member_id
    returning * into v_member;

    insert into public.points_ledger (
      member_id, transaction_type, points_delta, balance_after,
      reference_type, reference_id, note
    )
    values (
      v_req.member_id,
      'withdrawal_paid',
      0,
      coalesce(v_member.available_points, 0),
      'withdrawal',
      v_req.id::text,
      format('Withdrawal paid (%s BDT via %s). Ref: %s', v_req.bdt_amount, upper(v_req.payout_method), coalesce(p_transaction_ref, 'N/A'))
    );
  elsif v_status = 'rejected' then
    update public.vip_members
    set
      available_points = available_points + v_req.points_amount,
      updated_at = now()
    where id = v_req.member_id
    returning * into v_member;

    insert into public.points_ledger (
      member_id, transaction_type, points_delta, balance_after,
      reference_type, reference_id, note
    )
    values (
      v_req.member_id,
      'withdrawal_refunded',
      v_req.points_amount,
      v_member.available_points,
      'withdrawal',
      v_req.id::text,
      format('Withdrawal rejected & %s points refunded. %s', v_req.points_amount, coalesce(v_note, ''))
    );
  end if;

  return jsonb_build_object('ok', true, 'request', row_to_json(v_req)::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. GRANT EXECUTE PERMISSIONS TO ANON & AUTHENTICATED
-- -----------------------------------------------------------------------------
grant execute on function public.get_vip_member_wallet(text) to anon, authenticated;
grant execute on function public.register_vip_member(text, text, text, text, text, text, text, boolean, date, text, text, text, text, boolean, date) to anon, authenticated;
grant execute on function public.login_vip_member(text, text, text) to anon, authenticated;
grant execute on function public.request_vip_withdrawal(int, text, text, text, jsonb, uuid, text) to anon, authenticated;
grant execute on function public.validate_referral_coupon(text, numeric, text, text) to anon, authenticated;
grant execute on function public.place_store_order(text, text, text, text, text, text, jsonb, numeric, text, int) to anon, authenticated;
grant execute on function public.admin_get_loyalty_overview() to anon, authenticated;
grant execute on function public.admin_save_loyalty_settings(jsonb) to anon, authenticated;
grant execute on function public.admin_adjust_member_points(uuid, text, int, text, text) to anon, authenticated;
grant execute on function public.admin_update_vip_member(uuid, text, text, int, text, boolean) to anon, authenticated;
grant execute on function public.admin_process_withdrawal(uuid, text, text, text, text, text) to anon, authenticated;

commit;
