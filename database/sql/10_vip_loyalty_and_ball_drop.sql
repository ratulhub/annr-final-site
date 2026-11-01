-- =====================================================================================
-- 10 VIP LOYALTY, REFERRAL COUPONS, POINTS WALLET, WITHDRAWALS & BALL DROP ENGINE
-- Run after 09_refine_campaign_presentation.sql.
-- Includes:
-- 1. loyalty_settings: Singleton admin-controlled parameters (point value, friend discount, min withdraw, pending window, ball drop).
-- 2. vip_members: Extended VIP customer profiles with tier, balance, BD divisions/districts, and payout info.
-- 3. referral_coupons: Personal referral coupon codes per VIP member.
-- 4. referral_uses: Audit record of coupon use on orders.
-- 5. points_ledger: Append-only ledger for points credits, debits, withdrawals, and reversals.
-- 6. withdrawal_requests: Customer cash-out requests with approval/payout workflow.
-- 7. Secure SECURITY DEFINER RPCs with RLS, anti-fraud self-referral blocks, and atomic balance locking.
-- =====================================================================================

-- ---------- 1. Loyalty & Campaign Global Settings ----------
create table if not exists public.loyalty_settings (
  id                        int primary key check (id = 1),
  program_enabled           boolean not null default true,
  reward_mode               text not null default 'fixed_points' check (reward_mode in ('fixed_points','percent_order')),
  points_per_referral       int not null default 100 check (points_per_referral >= 0),
  percent_order_points      numeric(5,2) not null default 5.00 check (percent_order_points between 0 and 50),
  point_value_bdt           numeric(10,2) not null default 1.00 check (point_value_bdt > 0),
  friend_discount_type      text not null default 'percent' check (friend_discount_type in ('percent','fixed')),
  friend_discount_value     numeric(10,2) not null default 10.00 check (friend_discount_value > 0),
  min_order_for_coupon      numeric(12,2) not null default 1000.00 check (min_order_for_coupon >= 0),
  min_withdrawal_bdt        numeric(12,2) not null default 500.00 check (min_withdrawal_bdt > 0),
  max_withdrawal_bdt        numeric(12,2) not null default 25000.00 check (max_withdrawal_bdt >= min_withdrawal_bdt),
  pending_days_return_window int not null default 7 check (pending_days_return_window >= 0),
  coupon_prefix             text not null default 'VIP-' check (char_length(coupon_prefix) <= 10),
  allowed_payout_methods    text[] not null default array['bkash','nagad','rocket','bank'],
  ball_drop_enabled         boolean not null default false,
  ball_drop_config          jsonb not null default '{
    "title": "AnnR Vault Ball Drop",
    "subtitle": "Drop the sphere & claim instant store credits",
    "playsPerCustomer": 1,
    "prizes": [
      {"label": "৳500 OFF voucher", "code": "BALL500", "weight": 20},
      {"label": "10% OFF discount", "code": "DROP10", "weight": 40},
      {"label": "Free Socks Bundle", "code": "DROPGIFT", "weight": 25},
      {"label": "50 Bonus VIP Points", "points": 50, "weight": 15}
    ],
    "theme": "dark_cyberpunk"
  }'::jsonb,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references auth.users(id) on delete set null
);

-- Seed initial settings if empty
insert into public.loyalty_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------- 2. VIP Member Profiles ----------
create table if not exists public.vip_members (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users(id) on delete cascade,
  email               text not null unique check (email ~* '^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$'),
  full_name           text not null check (char_length(full_name) between 1 and 120),
  phone               text not null check (char_length(phone) between 8 and 30),
  is_whatsapp         boolean not null default true,
  division            text not null check (division in ('Barishal','Chattogram','Dhaka','Khulna','Mymensingh','Rajshahi','Rangpur','Sylhet')),
  district            text not null check (char_length(district) between 2 and 50),
  upazila             text check (char_length(upazila) <= 60),
  full_address        text not null check (char_length(full_address) <= 300),
  date_of_birth       date,
  gender              text check (gender in ('male','female','other','prefer_not_to_say')),
  tier                text not null default 'Silver' check (tier in ('Silver','Gold','Diamond','Black')),
  tier_multiplier     numeric(4,2) not null default 1.00 check (tier_multiplier >= 1.00),
  available_points    int not null default 0 check (available_points >= 0),
  pending_points      int not null default 0 check (pending_points >= 0),
  withdrawn_points    int not null default 0 check (withdrawn_points >= 0),
  total_earned_points int not null default 0 check (total_earned_points >= 0),
  referral_code       text unique not null check (referral_code ~ '^[A-Z0-9_-]{4,20}$'),
  referred_by_code    text check (referred_by_code ~ '^[A-Z0-9_-]{4,20}$'),
  default_payout_method text check (default_payout_method in ('bkash','nagad','rocket','bank')),
  default_payout_account text check (char_length(default_payout_account) <= 50),
  bank_details        jsonb,
  status              text not null default 'active' check (status in ('active','suspended','frozen')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists vip_members_refcode_idx on public.vip_members(referral_code);
create index if not exists vip_members_email_idx on public.vip_members(email);
create index if not exists vip_members_phone_idx on public.vip_members(phone);

-- ---------- 3. Personal Referral Coupons ----------
create table if not exists public.referral_coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null check (code ~ '^[A-Z0-9_-]{4,20}$'),
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  discount_type       text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value      numeric(10,2) not null check (discount_value > 0),
  min_order_bdt       numeric(12,2) not null default 1000.00 check (min_order_bdt >= 0),
  times_used          int not null default 0 check (times_used >= 0),
  total_points_generated int not null default 0 check (total_points_generated >= 0),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists referral_coupons_member_idx on public.referral_coupons(vip_member_id);

-- ---------- 4. Referral Coupon Uses (Order linking) ----------
create table if not exists public.referral_uses (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  coupon_code         text not null references public.referral_coupons(code) on delete restrict,
  referrer_member_id  uuid not null references public.vip_members(id) on delete restrict,
  buyer_email         text not null,
  buyer_user_id       uuid references auth.users(id) on delete set null,
  order_total_bdt     numeric(12,2) not null check (order_total_bdt >= 0),
  discount_given_bdt  numeric(12,2) not null check (discount_given_bdt >= 0),
  points_awarded      int not null default 0 check (points_awarded >= 0),
  points_status       text not null default 'pending' check (points_status in ('pending','available','cancelled','reversed')),
  maturation_date     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists referral_uses_order_idx on public.referral_uses(order_id);
create index if not exists referral_uses_referrer_idx on public.referral_uses(referrer_member_id);

-- ---------- 5. Append-Only Points Ledger ----------
create table if not exists public.points_ledger (
  id                  bigint generated always as identity primary key,
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  amount              int not null, -- positive = credit, negative = debit
  balance_after       int not null check (balance_after >= 0),
  transaction_type    text not null check (transaction_type in ('referral_pending','referral_matured','withdrawal_locked','withdrawal_paid','withdrawal_refunded','admin_adjustment','order_cancelled')),
  reference_id        text, -- order_id or withdrawal_id
  note                text not null check (char_length(note) <= 300),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists points_ledger_member_idx on public.points_ledger(vip_member_id, created_at desc);

-- ---------- 6. Withdrawal Requests ----------
create table if not exists public.withdrawal_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      bigint generated always as identity unique,
  vip_member_id       uuid not null references public.vip_members(id) on delete cascade,
  points_amount       int not null check (points_amount > 0),
  money_amount_bdt    numeric(12,2) not null check (money_amount_bdt > 0),
  payout_method       text not null check (payout_method in ('bkash','nagad','rocket','bank')),
  account_number      text not null check (char_length(account_number) <= 50),
  account_name        text check (char_length(account_name) <= 100),
  bank_details        jsonb,
  status              text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  admin_notes         text check (char_length(admin_notes) <= 500),
  transaction_ref     text check (char_length(transaction_ref) <= 100),
  requested_at        timestamptz not null default now(),
  processed_at        timestamptz,
  processed_by        uuid references auth.users(id) on delete set null
);

create index if not exists withdrawal_requests_member_idx on public.withdrawal_requests(vip_member_id);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);

-- Enable & Force Row Level Security on all new tables
alter table public.loyalty_settings enable row level security;
alter table public.loyalty_settings force row level security;

alter table public.vip_members enable row level security;
alter table public.vip_members force row level security;

alter table public.referral_coupons enable row level security;
alter table public.referral_coupons force row level security;

alter table public.referral_uses enable row level security;
alter table public.referral_uses force row level security;

alter table public.points_ledger enable row level security;
alter table public.points_ledger force row level security;

alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_requests force row level security;

-- ---------- 7. Grants ----------
grant select on public.loyalty_settings to anon, authenticated;
grant update on public.loyalty_settings to authenticated;

grant select, insert, update on public.vip_members to anon, authenticated;
grant select on public.referral_coupons to anon, authenticated;
grant insert, update on public.referral_coupons to authenticated;

grant select on public.referral_uses to authenticated;
grant select on public.points_ledger to authenticated;
grant select, insert on public.withdrawal_requests to anon, authenticated;
grant update on public.withdrawal_requests to authenticated;

-- ---------- 8. RLS Policies ----------

-- Loyalty Settings: anyone can read public settings, staff with marketing/admin can update
drop policy if exists loyalty_settings_read_public on public.loyalty_settings;
create policy loyalty_settings_read_public on public.loyalty_settings
  for select to anon, authenticated using (true);

drop policy if exists loyalty_settings_update_staff on public.loyalty_settings;
create policy loyalty_settings_update_staff on public.loyalty_settings
  for update to authenticated using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- VIP Members: users can read & update their own record; staff with loyalty/marketing/admin can read all
drop policy if exists vip_members_read_own_or_staff on public.vip_members;
create policy vip_members_read_own_or_staff on public.vip_members
  for select to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager','support_agent')
    )
  );

-- Anonymous customers can register as VIP
drop policy if exists vip_members_insert_any on public.vip_members;
create policy vip_members_insert_any on public.vip_members
  for insert to anon, authenticated with check (true);

drop policy if exists vip_members_update_own_or_staff on public.vip_members;
create policy vip_members_update_own_or_staff on public.vip_members
  for update to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- Referral Coupons: public can read active coupon codes for checkout validation; members read their own; staff read all
drop policy if exists referral_coupons_read_public on public.referral_coupons;
create policy referral_coupons_read_public on public.referral_coupons
  for select to anon, authenticated using (
    active = true or
    exists (
      select 1 from public.vip_members vm
      where vm.id = referral_coupons.vip_member_id and vm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- Withdrawal Requests: members read their own; staff read all
drop policy if exists withdrawal_requests_read_own_or_staff on public.withdrawal_requests;
create policy withdrawal_requests_read_own_or_staff on public.withdrawal_requests
  for select to authenticated using (
    exists (
      select 1 from public.vip_members vm
      where vm.id = withdrawal_requests.vip_member_id and vm.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager','order_manager')
    )
  );

drop policy if exists withdrawal_requests_insert_member on public.withdrawal_requests;
create policy withdrawal_requests_insert_member on public.withdrawal_requests
  for insert to authenticated with check (
    exists (
      select 1 from public.vip_members vm
      where vm.id = withdrawal_requests.vip_member_id and vm.user_id = auth.uid()
    )
  );

drop policy if exists withdrawal_requests_update_staff on public.withdrawal_requests;
create policy withdrawal_requests_update_staff on public.withdrawal_requests
  for update to authenticated using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
    )
  );

-- ---------- 9. Secure Business Logic RPC Functions ----------

-- A. Register or Login VIP Member and retrieve full wallet
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
  v_settings        record;
  v_member          record;
  v_ref_code        text;
  v_coupon          record;
  v_uid             uuid;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_uid := auth.uid();
  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);

  -- Check existing member
  select * into v_member from public.vip_members where email = p_email or (v_uid is not null and user_id = v_uid);
  if found then
    -- Return existing profile & coupon
    select * into v_coupon from public.referral_coupons where vip_member_id = v_member.id limit 1;
    return jsonb_build_object(
      'ok', true,
      'member', row_to_json(v_member),
      'coupon', row_to_json(v_coupon),
      'settings', row_to_json(v_settings)
    );
  end if;

  -- Generate unique referral coupon code: e.g. VIP-RATUL88 or ANNR-XXXX
  v_ref_code := coalesce(v_settings.coupon_prefix, 'VIP-') || upper(substring(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g') from 1 for 6)) || floor(random() * 899 + 100)::text;

  -- Ensure code uniqueness
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

  -- Insert VIP Member
  insert into public.vip_members (
    user_id, email, full_name, phone, is_whatsapp, division, district, upazila, full_address,
    date_of_birth, gender, referral_code, referred_by_code
  ) values (
    v_uid, p_email, p_full_name, p_phone, p_is_whatsapp, p_division, p_district, p_upazila, p_full_address,
    p_dob, p_gender, v_ref_code, p_referred_by
  )
  returning * into v_member;

  -- Create corresponding referral coupon
  insert into public.referral_coupons (
    code, vip_member_id, discount_type, discount_value, min_order_bdt
  ) values (
    v_ref_code, v_member.id, v_settings.friend_discount_type, v_settings.friend_discount_value, v_settings.min_order_for_coupon
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

-- B. Validate Referral Coupon at Checkout (with Anti-Self-Referral Enforcement)
create or replace function public.validate_referral_coupon(
  p_code        text,
  p_order_total numeric,
  p_buyer_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_coupon    record;
  v_owner     record;
  v_discount  numeric(12,2) := 0;
begin
  p_code := upper(trim(p_code));
  p_buyer_email := lower(trim(p_buyer_email));

  select * into v_coupon from public.referral_coupons where code = p_code and active = true;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Invalid or inactive coupon code');
  end if;

  select * into v_owner from public.vip_members where id = v_coupon.vip_member_id;
  if not found or v_owner.status <> 'active' then
    return jsonb_build_object('valid', false, 'error', 'Coupon is currently unavailable');
  end if;

  -- Anti-Fraud Rule: A coupon owner CANNOT use their own referral coupon
  if v_owner.email = p_buyer_email or (auth.uid() is not null and v_owner.user_id = auth.uid()) then
    return jsonb_build_object('valid', false, 'error', 'Self-referral is strictly prohibited. You cannot use your own referral code.');
  end if;

  -- Minimum spend check
  if p_order_total < v_coupon.min_order_bdt then
    return jsonb_build_object('valid', false, 'error', 'Minimum order amount for this coupon is ৳' || v_coupon.min_order_bdt::text);
  end if;

  -- Calculate discount amount
  if v_coupon.discount_type = 'percent' then
    v_discount := round((p_order_total * (v_coupon.discount_value / 100.0)), 2);
  else
    v_discount := least(v_coupon.discount_value, p_order_total);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'referrer_name', v_owner.full_name
  );
end;
$$;

-- C. Customer Withdrawal Request (Atomic lock from available balance)
create or replace function public.request_vip_withdrawal(
  p_points_amount   int,
  p_payout_method   text,
  p_account_number  text,
  p_account_name    text default null,
  p_bank_details    jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_member          record;
  v_money_bdt       numeric(12,2);
  v_req             record;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  if not v_settings.program_enabled then
    return jsonb_build_object('ok', false, 'error', 'Rewards program is currently paused');
  end if;

  -- Get member (must match authenticated user)
  select * into v_member from public.vip_members where user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'VIP member record not found');
  end if;

  if v_member.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Your VIP account is ' || v_member.status || '. Withdrawals are locked.');
  end if;

  if p_points_amount <= 0 or p_points_amount > v_member.available_points then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available points');
  end if;

  -- Calculate Taka value
  v_money_bdt := round(p_points_amount * v_settings.point_value_bdt, 2);

  if v_money_bdt < v_settings.min_withdrawal_bdt then
    return jsonb_build_object('ok', false, 'error', 'Minimum withdrawal amount is ৳' || v_settings.min_withdrawal_bdt::text || ' (' || ceil(v_settings.min_withdrawal_bdt / v_settings.point_value_bdt)::text || ' points)');
  end if;

  if v_money_bdt > v_settings.max_withdrawal_bdt then
    return jsonb_build_object('ok', false, 'error', 'Maximum withdrawal per request is ৳' || v_settings.max_withdrawal_bdt::text);
  end if;

  -- Deduct atomically from member's available points and add to withdrawn_points
  update public.vip_members
  set
    available_points = available_points - p_points_amount,
    withdrawn_points = withdrawn_points + p_points_amount,
    updated_at = now()
  where id = v_member.id;

  -- Insert withdrawal request
  insert into public.withdrawal_requests (
    vip_member_id, points_amount, money_amount_bdt, payout_method, account_number, account_name, bank_details, status
  ) values (
    v_member.id, p_points_amount, v_money_bdt, p_payout_method, trim(p_account_number), p_account_name, p_bank_details, 'pending'
  )
  returning * into v_req;

  -- Write to append-only points ledger
  insert into public.points_ledger (
    vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
  ) values (
    v_member.id, -p_points_amount, v_member.available_points - p_points_amount, 'withdrawal_locked', v_req.id::text,
    'Withdrawal request #' || v_req.request_number::text || ' to ' || p_payout_method || ' (' || trim(p_account_number) || ')',
    auth.uid()
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_req.id,
    'request_number', v_req.request_number,
    'money_amount_bdt', v_money_bdt,
    'remaining_points', v_member.available_points - p_points_amount
  );
end;
$$;

-- D. Staff Process Withdrawal (Approve, Pay, or Reject)
create or replace function public.admin_process_withdrawal(
  p_request_id        uuid,
  p_action            text, -- 'paid', 'approved', 'rejected'
  p_transaction_ref   text default null,
  p_admin_notes       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_req               record;
  v_member            record;
begin
  -- RBAC permission check
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','marketing_manager')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal request not found');
  end if;

  if v_req.status in ('paid', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Request has already been finalized as ' || v_req.status);
  end if;

  select * into v_member from public.vip_members where id = v_req.vip_member_id for update;

  if p_action = 'paid' then
    update public.withdrawal_requests
    set
      status = 'paid',
      transaction_ref = p_transaction_ref,
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;

    insert into public.points_ledger (
      vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
    ) values (
      v_member.id, 0, v_member.available_points, 'withdrawal_paid', v_req.id::text,
      'Paid ৳' || v_req.money_amount_bdt::text || ' via ' || v_req.payout_method || ' (Trx: ' || coalesce(p_transaction_ref, 'N/A') || ')',
      auth.uid()
    );

  elsif p_action = 'rejected' then
    -- Refund points back to member available points
    update public.vip_members
    set
      available_points = available_points + v_req.points_amount,
      withdrawn_points = withdrawn_points - v_req.points_amount,
      updated_at = now()
    where id = v_member.id;

    update public.withdrawal_requests
    set
      status = 'rejected',
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;

    insert into public.points_ledger (
      vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
    ) values (
      v_member.id, v_req.points_amount, v_member.available_points + v_req.points_amount, 'withdrawal_refunded', v_req.id::text,
      'Withdrawal #' || v_req.request_number::text || ' rejected: ' || coalesce(p_admin_notes, 'Cancelled by admin'),
      auth.uid()
    );

  elsif p_action = 'approved' then
    update public.withdrawal_requests
    set
      status = 'approved',
      admin_notes = p_admin_notes,
      processed_at = now(),
      processed_by = auth.uid()
    where id = v_req.id;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid action');
  end if;

  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$;

-- E. Public RPC to fetch published store configuration (fast cached JSON for site-config.js)
create or replace function public.get_published_site_config() returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conf jsonb;
begin
  select config into v_conf from public.site_config_versions where is_published = true order by id desc limit 1;
  return coalesce(v_conf, '{}'::jsonb);
end;
$$;

-- F. Place Store Order (Direct DB Checkout: Cash on Delivery or bKash/Nagad)
create or replace function public.place_store_order(
  p_customer_name   text,
  p_email           text,
  p_phone           text,
  p_division        text,
  p_district        text,
  p_full_address    text,
  p_items           jsonb,
  p_payment_method  text, -- 'cod', 'bkash', 'nagad', 'rocket'
  p_trx_id          text default null,
  p_coupon_code     text default null,
  p_customer_notes  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings        record;
  v_order_id        uuid;
  v_order_num       bigint;
  v_subtotal        numeric(12,2) := 0;
  v_shipping        numeric(12,2) := 130;
  v_discount        numeric(12,2) := 0;
  v_total           numeric(12,2) := 0;
  v_item            jsonb;
  v_ref_coupon      record;
  v_regular_coupon  record;
  v_ref_member      record;
  v_is_referral     boolean := false;
  v_uid             uuid;
begin
  select * into v_settings from public.loyalty_settings where id = 1;
  v_uid := auth.uid();
  p_email := lower(trim(p_email));
  p_phone := trim(p_phone);

  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Shopping bag is empty');
  end if;

  -- 1. Calculate items subtotal
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (coalesce((v_item->>'price')::numeric, 0) * coalesce((v_item->>'quantity')::int, 1));
  end loop;

  -- 2. Shipping calculation by district
  if lower(trim(p_district)) = 'dhaka' then
    v_shipping := 70.00;
  elsif lower(trim(p_district)) in ('gazipur', 'narayanganj') then
    v_shipping := 100.00;
  else
    v_shipping := 130.00;
  end if;

  -- 3. Coupon validation
  if p_coupon_code is not null and char_length(trim(p_coupon_code)) > 0 then
    p_coupon_code := upper(trim(p_coupon_code));

    -- Check if it's a VIP referral coupon
    select * into v_ref_coupon from public.referral_coupons where code = p_coupon_code and active = true;
    if found then
      select * into v_ref_member from public.vip_members where id = v_ref_coupon.vip_member_id;
      if found and v_ref_member.status = 'active' then
        -- Anti-self-referral check
        if v_ref_member.email = p_email or (v_uid is not null and v_ref_member.user_id = v_uid) then
          return jsonb_build_object('ok', false, 'error', 'Self-referral is strictly prohibited.');
        end if;

        if v_subtotal >= v_ref_coupon.min_order_bdt then
          v_is_referral := true;
          if v_ref_coupon.discount_type = 'percent' then
            v_discount := round(v_subtotal * (v_ref_coupon.discount_value / 100.0), 2);
          else
            v_discount := least(v_ref_coupon.discount_value, v_subtotal);
          end if;
        end if;
      end if;
    else
      -- Check if it's a standard promotional discount
      select * into v_regular_coupon from public.discounts where code = p_coupon_code and active = true;
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

  -- 4. Create Order
  insert into public.orders (
    user_id, email, status, payment_status, subtotal, discount_total, shipping_total, total,
    currency, payment_provider_ref, shipping_address
  ) values (
    v_uid, p_email, 'pending',
    case when p_payment_method = 'cod' then 'unpaid' else 'paid' end,
    v_subtotal, v_discount, v_shipping, v_total, 'BDT',
    p_payment_method || case when p_trx_id is not null and char_length(trim(p_trx_id)) > 0 then ':' || trim(p_trx_id) else '' end,
    jsonb_build_object(
      'full_name', p_customer_name,
      'phone', p_phone,
      'division', p_division,
      'district', p_district,
      'full_address', p_full_address,
      'notes', p_customer_notes
    )
  )
  returning id, order_number into v_order_id, v_order_num;

  -- 5. Insert order items
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (
      order_id, title, unit_price, quantity
    ) values (
      v_order_id,
      coalesce(v_item->>'title', 'AnnR Apparel'),
      coalesce((v_item->>'price')::numeric, 0),
      coalesce((v_item->>'quantity')::int, 1)
    );
  end loop;

  -- 6. Attach referral record if VIP coupon was used
  if v_is_referral then
    declare
      v_points int := 0;
    begin
      if v_settings.reward_mode = 'fixed_points' then
        v_points := round(v_settings.points_per_referral * v_ref_member.tier_multiplier);
      else
        v_points := round((v_total * (v_settings.percent_order_points / 100.0)) * v_ref_member.tier_multiplier);
      end if;

      insert into public.referral_uses (
        order_id, coupon_code, referrer_member_id, buyer_email, buyer_user_id,
        order_total_bdt, discount_given_bdt, points_awarded, points_status,
        maturation_date
      ) values (
        v_order_id, p_coupon_code, v_ref_member.id, p_email, v_uid,
        v_total, v_discount, v_points, 'pending',
        now() + (v_settings.pending_days_return_window || ' days')::interval
      );

      update public.referral_coupons
      set
        times_used = times_used + 1,
        total_points_generated = total_points_generated + v_points,
        updated_at = now()
      where id = v_ref_coupon.id;

      -- Add to member pending balance
      update public.vip_members
      set
        pending_points = pending_points + v_points,
        total_earned_points = total_earned_points + v_points,
        updated_at = now()
      where id = v_ref_member.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_ref_member.id, v_points, v_ref_member.available_points, 'referral_pending', v_order_id::text,
        'Pending ' || v_points::text || ' pts from order #' || v_order_num::text || ' (Matures after return window)',
        v_uid
      );
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_num,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'discount', v_discount,
    'total', v_total
  );
end;
$$;

-- G. Order Lifecycle & Points Maturation RPC (Staff only)
create or replace function public.update_store_order_status(
  p_order_id        uuid,
  p_new_status      text, -- 'pending', 'paid', 'fulfilled', 'cancelled', 'refunded'
  p_payment_status  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_ref_use         record;
  v_member          record;
begin
  -- RBAC permission check
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','order_manager')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  update public.orders
  set
    status = p_new_status,
    payment_status = coalesce(p_payment_status, payment_status),
    updated_at = now()
  where id = p_order_id;

  -- Check if order has a referral use
  select * into v_ref_use from public.referral_uses where order_id = p_order_id for update;
  if found then
    select * into v_member from public.vip_members where id = v_ref_use.referrer_member_id for update;

    -- If order is fulfilled/delivered, mature points into available_points
    if p_new_status = 'fulfilled' and v_ref_use.points_status = 'pending' then
      update public.referral_uses
      set points_status = 'available', updated_at = now()
      where id = v_ref_use.id;

      update public.vip_members
      set
        pending_points = greatest(0, pending_points - v_ref_use.points_awarded),
        available_points = available_points + v_ref_use.points_awarded,
        updated_at = now()
      where id = v_member.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_member.id, v_ref_use.points_awarded, v_member.available_points + v_ref_use.points_awarded,
        'referral_matured', p_order_id::text,
        'Matured ' || v_ref_use.points_awarded::text || ' pts for order delivery',
        auth.uid()
      );

    -- If order cancelled/refunded, reverse points
    elsif p_new_status in ('cancelled', 'refunded') and v_ref_use.points_status in ('pending', 'available') then
      if v_ref_use.points_status = 'pending' then
        update public.vip_members
        set
          pending_points = greatest(0, pending_points - v_ref_use.points_awarded),
          total_earned_points = greatest(0, total_earned_points - v_ref_use.points_awarded),
          updated_at = now()
        where id = v_member.id;
      elsif v_ref_use.points_status = 'available' then
        update public.vip_members
        set
          available_points = greatest(0, available_points - v_ref_use.points_awarded),
          total_earned_points = greatest(0, total_earned_points - v_ref_use.points_awarded),
          updated_at = now()
        where id = v_member.id;
      end if;

      update public.referral_uses
      set points_status = 'reversed', updated_at = now()
      where id = v_ref_use.id;

      insert into public.points_ledger (
        vip_member_id, amount, balance_after, transaction_type, reference_id, note, created_by
      ) values (
        v_member.id, -v_ref_use.points_awarded, v_member.available_points,
        'order_cancelled', p_order_id::text,
        'Reversed ' || v_ref_use.points_awarded::text || ' pts due to order ' || p_new_status,
        auth.uid()
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'status', p_new_status);
end;
$$;



grant execute on function public.get_published_site_config() to anon, authenticated;
grant execute on function public.register_vip_member to anon, authenticated;
grant execute on function public.validate_referral_coupon to anon, authenticated;
grant execute on function public.request_vip_withdrawal to authenticated;
grant execute on function public.admin_process_withdrawal to authenticated;
grant execute on function public.place_store_order to anon, authenticated;
grant execute on function public.update_store_order_status to authenticated;

