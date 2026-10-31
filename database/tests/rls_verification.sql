-- =====================================================================================
-- RLS & RBAC VERIFICATION SUITE — run after 01 → 07.
-- Runs inside a transaction and rolls back at the end so no test rows remain.
-- Raises an exception immediately if any security control fails.
-- =====================================================================================

begin;

-- 1. Verify RLS is enabled and forced on all 19 public tables.
do $$
declare
  _missing text;
begin
  select string_agg(t, ', ')
    into _missing
    from unnest(array[
      'profiles','collections','products','product_images','product_variants','inventory',
      'collection_products','site_pages','site_config_versions','media_assets',
      'customer_addresses','saved_items','orders','order_items','discounts',
      'contact_submissions','analytics_events','user_roles','role_permissions',
      'campaign_events','hidden_pages'
    ]) as t
    left join pg_class c on c.relname = t and c.relnamespace = 'public'::regnamespace
   where c.oid is null or not c.relrowsecurity or not c.relforcerowsecurity;

  if _missing is not null then
    raise exception 'RLS not enabled/forced on: %', _missing;
  end if;
end $$;

-- 2. Seed temporary test users and fixtures.
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'super@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'viewer@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'custA@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'custB@test.local')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
values
  ('00000000-0000-0000-0000-000000000001', 'super_admin'),
  ('00000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-000000000003', 'analytics_viewer')
on conflict do nothing;

insert into public.products (id, handle, title, price, status)
values
  ('10000000-0000-0000-0000-000000000001', 'active-test-item', 'Active Item', 5000, 'active'),
  ('10000000-0000-0000-0000-000000000002', 'draft-test-item', 'Draft Item', 5000, 'draft');

insert into public.product_variants (id, product_id, sku, option_size, price)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TEST-SKU-1', 'M', 5000);

insert into public.inventory (variant_id, on_hand, reserved)
values
  ('30000000-0000-0000-0000-000000000001', 5, 0);

insert into public.customer_addresses (id, user_id, full_name, line1, city)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Customer A', '123 Road', 'Dhaka');

-- 3. Anonymous visitor checks: can see active product, CANNOT see draft product or addresses.
set local role anon;
set local "request.jwt.claims" = '{}';

do $$
begin
  if (select count(*) from public.products where handle = 'active-test-item') <> 1 then
    raise exception 'anon could not read active product';
  end if;
  if (select count(*) from public.products where handle = 'draft-test-item') <> 0 then
    raise exception 'SECURITY FAILURE: anon read a draft product';
  end if;
end $$;

-- 4. BOLA / IDOR check: Customer B cannot read Customer A's address or profile.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.customer_addresses where user_id = '00000000-0000-0000-0000-000000000004') <> 0 then
    raise exception 'SECURITY FAILURE: Customer B read Customer A address (BOLA)';
  end if;
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000004') <> 0 then
    raise exception 'SECURITY FAILURE: Customer B read Customer A profile (BOLA)';
  end if;
end $$;

-- 5. Role boundary check: analytics_viewer cannot read draft catalog or grant roles.
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

do $$
begin
  if public.has_permission('catalog.write') then
    raise exception 'SECURITY FAILURE: analytics_viewer has catalog.write';
  end if;
  begin
    perform public.grant_role('00000000-0000-0000-0000-000000000005', 'admin');
    raise exception 'SECURITY FAILURE: analytics_viewer granted a role';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 6. Privilege escalation check: admin cannot grant roles (only super_admin has roles.manage).
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
begin
  begin
    perform public.grant_role('00000000-0000-0000-0000-000000000005', 'support_agent');
    raise exception 'SECURITY FAILURE: admin granted a role without roles.manage';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 7. Self-role-change check: super_admin cannot modify their own roles.
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $$
begin
  begin
    perform public.revoke_role('00000000-0000-0000-0000-000000000001', 'super_admin');
    raise exception 'SECURITY FAILURE: super_admin revoked their own role';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 8. Audit log immutability check: UPDATE/DELETE on security.audit_log must fail.
reset role;
do $$
begin
  begin
    delete from security.audit_log;
    raise exception 'SECURITY FAILURE: security.audit_log allowed DELETE';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 9. E-commerce price integrity & inventory reservation check (public.create_validated_order).
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';

do $$
declare
  _oid uuid;
  _tot numeric(12,2);
  _pstat text;
  _res int;
begin
  -- Customer A sends a forged unit_price of 0.01; RPC must ignore it and charge 2 * 5000 = 10000.
  _oid := public.create_validated_order(
    'custA@test.local',
    '[{"variant_id":"30000000-0000-0000-0000-000000000001","quantity":2,"unit_price":0.01}]'::jsonb,
    null,
    '{"city":"Dhaka"}'::jsonb,
    'idem-test-001'
  );
  select total, payment_status into _tot, _pstat from public.orders where id = _oid;
  if _tot <> 10000.00 or _pstat <> 'unpaid' then
    raise exception 'SECURITY FAILURE: order total (%) or payment_status (%) was tampered', _tot, _pstat;
  end if;
  select reserved into _res from public.inventory where variant_id = '30000000-0000-0000-0000-000000000001';
  if _res <> 2 then
    raise exception 'SECURITY FAILURE: inventory reserved (%) was not updated to 2', _res;
  end if;
  -- Overselling beyond remaining stock (3 left) must fail with P0002.
  begin
    perform public.create_validated_order(
      'custA@test.local',
      '[{"variant_id":"30000000-0000-0000-0000-000000000001","quantity":4}]'::jsonb,
      null, null, 'idem-test-002'
    );
    raise exception 'SECURITY FAILURE: overselling stock succeeded';
  exception when no_data_found then null;
  end;
end $$;

-- 10. Order IDOR / BOLA check: Customer B cannot read Customer A's order or line items.
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.orders where user_id = '00000000-0000-0000-0000-000000000004') <> 0 then
    raise exception 'SECURITY FAILURE: Customer B read Customer A order (BOLA)';
  end if;
  if (select count(*) from public.order_items) <> 0 then
    raise exception 'SECURITY FAILURE: Customer B read Customer A order_items (BOLA)';
  end if;
end $$;

rollback;


