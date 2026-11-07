-- =====================================================================
-- 13_vip_auth_and_login.sql
-- Complete Supabase VIP Authentication & Registration RPC Functions
-- Safe, idempotent; can be run directly in the Supabase SQL Editor.
-- =====================================================================

-- 1. Ensure password_hash column exists on vip_members
alter table public.vip_members
  add column if not exists password_hash text;

-- 2. Ensure loyalty_settings has default rows & welcome bonus
alter table public.loyalty_settings
  add column if not exists welcome_bonus_points int not null default 100 check (welcome_bonus_points between 0 and 10000);

-- 3. Register VIP Member RPC (handles both anon storefront & authenticated users)
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
  p_referred_by     text default null,
  p_password_hash   text default null
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
  v_bonus           int := 100;
  v_norm_email      text;
  v_norm_phone      text;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  if found and v_settings.welcome_bonus_points is not null then
    v_bonus := v_settings.welcome_bonus_points;
  end if;

  v_uid := auth.uid();
  v_norm_email := lower(trim(p_email));
  v_norm_phone := trim(regexp_replace(p_phone, '[^0-9]', '', 'g'));
  if v_norm_phone like '880%' then
    v_norm_phone := substring(v_norm_phone from 4);
  end if;
  if length(v_norm_phone) = 10 and v_norm_phone ~ '^1[3-9]' then
    v_norm_phone := '0' || v_norm_phone;
  end if;

  -- 1. Check if member already exists by email or phone
  select * into v_member
  from public.vip_members
  where email = v_norm_email
     or (v_norm_phone <> '' and phone = v_norm_phone)
     or (v_uid is not null and user_id = v_uid)
  limit 1;

  if found then
    -- If existing member has no password hash and one was provided, update it
    if v_member.password_hash is null and p_password_hash is not null and p_password_hash <> '' then
      update public.vip_members set password_hash = p_password_hash where id = v_member.id;
      v_member.password_hash := p_password_hash;
    end if;

    select * into v_coupon from public.referral_coupons where vip_member_id = v_member.id order by created_at limit 1;
    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'member', jsonb_build_object(
        'id', v_member.id,
        'full_name', v_member.full_name,
        'email', v_member.email,
        'phone', v_member.phone,
        'division', v_member.division,
        'district', v_member.district,
        'upazila', v_member.upazila,
        'full_address', v_member.full_address,
        'tier', v_member.tier,
        'available_points', v_member.available_points,
        'pending_points', v_member.pending_points,
        'withdrawn_points', v_member.withdrawn_points,
        'total_earned_points', v_member.total_earned_points,
        'referral_code', v_member.referral_code,
        'status', v_member.status,
        'created_at', v_member.created_at
      ),
      'coupon', jsonb_build_object(
        'code', coalesce(v_coupon.code, v_member.referral_code),
        'discount_type', coalesce(v_coupon.discount_type, 'percent'),
        'discount_value', coalesce(v_coupon.discount_value, 10),
        'min_order_bdt', coalesce(v_coupon.min_order_bdt, 1000),
        'times_used', coalesce(v_coupon.times_used, 0),
        'total_points_generated', coalesce(v_coupon.total_points_generated, 0)
      ),
      'settings', to_jsonb(v_settings)
    );
  end if;

  -- 2. Generate unique referral coupon code
  v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-') || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6)) || floor(random() * 899 + 100)::text;
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

  -- 3. Insert VIP Member
  insert into public.vip_members (
    user_id, email, full_name, phone, is_whatsapp, division, district, upazila, full_address,
    date_of_birth, gender, referral_code, referred_by_code, available_points, total_earned_points, password_hash
  ) values (
    v_uid, v_norm_email, p_full_name, coalesce(nullif(v_norm_phone, ''), p_phone), p_is_whatsapp, p_division, p_district, p_upazila, p_full_address,
    p_dob, p_gender, v_ref_code, p_referred_by, v_bonus, v_bonus, p_password_hash
  )
  returning * into v_member;

  -- 4. Create Referral Coupon
  insert into public.referral_coupons (
    code, vip_member_id, discount_type, discount_value, min_order_bdt
  ) values (
    v_ref_code, v_member.id, coalesce(v_settings.friend_discount_type, 'percent'), coalesce(v_settings.friend_discount_value, 10), coalesce(v_settings.min_order_for_coupon, 1000)
  )
  returning * into v_coupon;

  -- 5. Record Welcome Bonus Ledger Entry if points_ledger exists
  begin
    insert into public.points_ledger (
      vip_member_id, amount, balance_after, transaction_type, note, created_by
    ) values (
      v_member.id, v_bonus, v_bonus, 'welcome_bonus', 'VIP Welcome Bonus credited', v_uid
    );
  exception when others then
    -- Ignore ledger error if table has different constraints
  end;

  return jsonb_build_object(
    'ok', true,
    'existing', false,
    'member', jsonb_build_object(
      'id', v_member.id,
      'full_name', v_member.full_name,
      'email', v_member.email,
      'phone', v_member.phone,
      'division', v_member.division,
      'district', v_member.district,
      'upazila', v_member.upazila,
      'full_address', v_member.full_address,
      'tier', v_member.tier,
      'available_points', v_member.available_points,
      'pending_points', v_member.pending_points,
      'withdrawn_points', v_member.withdrawn_points,
      'total_earned_points', v_member.total_earned_points,
      'referral_code', v_member.referral_code,
      'status', v_member.status,
      'created_at', v_member.created_at
    ),
    'coupon', jsonb_build_object(
      'code', v_coupon.code,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'min_order_bdt', v_coupon.min_order_bdt,
      'times_used', 0,
      'total_points_generated', 0
    ),
    'settings', to_jsonb(v_settings)
  );
end;
$$;

-- 4. Login VIP Member RPC
create or replace function public.login_vip_member(
  p_identifier      text,
  p_password_hash   text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_member          record;
  v_coupon          record;
  v_norm_id         text;
  v_norm_phone      text;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_norm_id := lower(trim(p_identifier));
  v_norm_phone := trim(regexp_replace(p_identifier, '[^0-9]', '', 'g'));
  if v_norm_phone like '880%' then
    v_norm_phone := substring(v_norm_phone from 4);
  end if;
  if length(v_norm_phone) = 10 and v_norm_phone ~ '^1[3-9]' then
    v_norm_phone := '0' || v_norm_phone;
  end if;

  -- Find member by email or phone
  select * into v_member
  from public.vip_members
  where email = v_norm_id
     or (v_norm_phone <> '' and phone = v_norm_phone)
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No VIP account found with this email or mobile number.');
  end if;

  -- Verify password
  if v_member.password_hash is not null and v_member.password_hash <> '' then
    if v_member.password_hash <> p_password_hash and v_member.password_hash <> ('plain:' || p_password_hash) then
      return jsonb_build_object('ok', false, 'error', 'Incorrect password. Please verify and try again.');
    end if;
  else
    -- If member had no password set yet, attach this password hash
    if p_password_hash is not null and p_password_hash <> '' then
      update public.vip_members set password_hash = p_password_hash where id = v_member.id;
      v_member.password_hash := p_password_hash;
    end if;
  end if;

  -- Retrieve coupon
  select * into v_coupon from public.referral_coupons where vip_member_id = v_member.id order by created_at limit 1;

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
      'tier', v_member.tier,
      'available_points', v_member.available_points,
      'pending_points', v_member.pending_points,
      'withdrawn_points', v_member.withdrawn_points,
      'total_earned_points', v_member.total_earned_points,
      'referral_code', v_member.referral_code,
      'status', v_member.status,
      'created_at', v_member.created_at
    ),
    'coupon', jsonb_build_object(
      'code', coalesce(v_coupon.code, v_member.referral_code),
      'discount_type', coalesce(v_coupon.discount_type, 'percent'),
      'discount_value', coalesce(v_coupon.discount_value, 10),
      'min_order_bdt', coalesce(v_coupon.min_order_bdt, 1000),
      'times_used', coalesce(v_coupon.times_used, 0),
      'total_points_generated', coalesce(v_coupon.total_points_generated, 0)
    ),
    'settings', to_jsonb(v_settings)
  );
end;
$$;

-- 5. Grant execute on functions to anon and authenticated
grant execute on function public.register_vip_member(text,text,text,text,text,text,text,boolean,date,text,text,text) to anon, authenticated;
grant execute on function public.login_vip_member(text,text) to anon, authenticated;
