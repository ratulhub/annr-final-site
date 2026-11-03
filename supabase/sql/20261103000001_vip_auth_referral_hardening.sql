-- AnnR VIP auth and referral hardening
-- Run this script in Supabase SQL Editor after the VIP migration.
--
-- Guest coupon validation remains available for checkout. Creating or linking
-- a VIP profile requires a real Supabase Auth session.

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
  v_settings      record;
  v_member        record;
  v_coupon        record;
  v_uid           uuid := auth.uid();
  v_auth_email    text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_ref_code      text;
  v_referred_code text;
begin
  if v_uid is null or v_auth_email = '' then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);
  if p_email <> v_auth_email then
    raise exception 'VIP email must match the authenticated account' using errcode = '22023';
  end if;
  if p_full_name is null or char_length(trim(p_full_name)) not between 1 and 120 then
    raise exception 'invalid full name' using errcode = '22023';
  end if;
  if p_phone is null or char_length(p_phone) not between 8 and 30 then
    raise exception 'invalid phone number' using errcode = '22023';
  end if;

  select * into v_settings
  from public.loyalty_settings
  where id = 1;
  if not found or not v_settings.program_enabled then
    raise exception 'VIP program is currently unavailable' using errcode = '55000';
  end if;

  if p_referred_by is not null and char_length(trim(p_referred_by)) > 0 then
    v_referred_code := upper(trim(p_referred_by));
    if not exists (
      select 1
      from public.referral_coupons
      where code = v_referred_code
        and active = true
    ) then
      raise exception 'invalid or inactive referral code' using errcode = '22023';
    end if;
  else
    v_referred_code := null;
  end if;

  select * into v_member
  from public.vip_members
  where user_id = v_uid or email = p_email
  limit 1;

  if found then
    if v_member.user_id is not null and v_member.user_id <> v_uid then
      raise exception 'email is already linked to another VIP account' using errcode = '23505';
    end if;
    if v_member.user_id is null then
      update public.vip_members
      set user_id = v_uid, updated_at = now()
      where id = v_member.id
      returning * into v_member;
    end if;
    select * into v_coupon
    from public.referral_coupons
    where vip_member_id = v_member.id
    limit 1;
    return jsonb_build_object(
      'ok', true,
      'member', row_to_json(v_member),
      'coupon', row_to_json(v_coupon),
      'settings', row_to_json(v_settings)
    );
  end if;

  v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-')
    || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6))
    || floor(random() * 899 + 100)::text;

  while exists (select 1 from public.vip_members where referral_code = v_ref_code)
     or exists (select 1 from public.referral_coupons where code = v_ref_code) loop
    v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-')
      || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 4))
      || floor(random() * 8999 + 1000)::text;
  end loop;

  insert into public.vip_members (
    user_id, email, full_name, phone, is_whatsapp, division, district, upazila,
    full_address, date_of_birth, gender, referral_code, referred_by_code
  ) values (
    v_uid, p_email, trim(p_full_name), p_phone, p_is_whatsapp, p_division, p_district,
    p_upazila, p_full_address, p_dob, p_gender, v_ref_code, v_referred_code
  )
  returning * into v_member;

  insert into public.referral_coupons (
    code, vip_member_id, discount_type, discount_value, min_order_bdt
  ) values (
    v_ref_code, v_member.id, v_settings.friend_discount_type,
    v_settings.friend_discount_value, v_settings.min_order_for_coupon
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

revoke all on function public.register_vip_member(
  text, text, text, text, text, text, text, boolean, date, text, text
) from public, anon;
grant execute on function public.register_vip_member(
  text, text, text, text, text, text, text, boolean, date, text, text
) to authenticated;
