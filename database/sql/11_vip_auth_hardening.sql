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

