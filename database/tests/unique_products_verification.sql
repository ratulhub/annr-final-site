-- =====================================================================================
-- ONE-OF-ONE PRODUCTS VERIFICATION — run after 14_unique_products.sql.
-- Runs inside BEGIN ... ROLLBACK; raises 'SECURITY FAILURE' if any check fails.
-- =====================================================================================
begin;

do $$ declare _missing text; begin
  select string_agg(t, ', ') into _missing
  from unnest(array['categories','campaigns','product_reservations','products']) t
  left join pg_class c on c.relname = t and c.relnamespace = 'public'::regnamespace
  where c.oid is null or not c.relrowsecurity or not c.relforcerowsecurity;
  if _missing is not null then raise exception 'SECURITY FAILURE: RLS not forced on %', _missing; end if;
  if (select count(*) from public.categories where slug in
      ('hoodies','sweatshirts','trousers','sweaters','t-shirts','jackets','knitwear','accessories')) <> 8 then
    raise exception 'FAILURE: default categories missing';
  end if;
  if not exists (select 1 from public.campaigns where slug = 'unique-campaign') then
    raise exception 'FAILURE: unique-campaign seed missing';
  end if;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'uq-admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'uq-cust@test.local')
on conflict (id) do nothing;
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin') on conflict do nothing;

insert into public.products (id, handle, title, price, status, code, size, measurements, category_id, campaign_id)
values
  ('00000000-0000-0000-0000-00000000b001', 'uq-test-live',  'UQ Live',  1000, 'active', 'UQT001', 'M',
   '{"chest":56,"length":70}', (select id from public.categories where slug='hoodies'), (select id from public.campaigns where slug='unique-campaign')),
  ('00000000-0000-0000-0000-00000000b002', 'uq-test-draft', 'UQ Draft', 1000, 'draft',  'UQT002', 'L', '{}', null, null);

-- Invalid measurement key / bad image URL must be rejected.
do $$ begin
  begin
    insert into public.products(handle, title, price, measurements) values ('uq-bad-m', 'x', 1, '{"hips":3}');
    raise exception 'SECURITY FAILURE: invalid measurement accepted';
  exception when check_violation then null; end;
  begin
    insert into public.products(handle, title, price, images) values ('uq-bad-i', 'x', 1, array['javascript:alert(1)']);
    raise exception 'SECURITY FAILURE: javascript: image accepted';
  exception when sqlstate '22023' then null; end;
end $$;

-- Anonymous: reads live, never drafts; cannot write; cannot read reservation tokens.
set local role anon;
set local "request.jwt.claims" = '{}';
do $$ declare r jsonb; r2 jsonb; begin
  if exists (select 1 from public.products where handle = 'uq-test-draft') then
    raise exception 'SECURITY FAILURE: anon can read draft product';
  end if;
  if not exists (select 1 from public.products where handle = 'uq-test-live') then
    raise exception 'FAILURE: anon cannot read live product';
  end if;
  begin
    insert into public.categories(slug, name) values ('hack', 'Hack');
    raise exception 'SECURITY FAILURE: anon inserted category';
  exception when insufficient_privilege then null; end;
  begin
    update public.products set price = 1 where handle = 'uq-test-live';
    if found then raise exception 'SECURITY FAILURE: anon updated product'; end if;
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.product_reservations;
    raise exception 'SECURITY FAILURE: anon can read reservations';
  exception when insufficient_privilege then null; end;
  begin
    perform public.mark_product_sold('00000000-0000-0000-0000-00000000b001');
    raise exception 'SECURITY FAILURE: anon marked product sold';
  exception when insufficient_privilege then null; end;

  -- First reservation succeeds; a second buyer of the same piece fails.
  r := public.reserve_product('00000000-0000-0000-0000-00000000b001');
  if not (r->>'ok')::boolean then raise exception 'FAILURE: first reservation failed: %', r; end if;
  r2 := public.reserve_product('00000000-0000-0000-0000-00000000b001');
  if (r2->>'ok')::boolean then raise exception 'SECURITY FAILURE: double reservation allowed'; end if;
  -- Wrong token cannot release.
  if (public.release_reservation('00000000-0000-0000-0000-00000000b001', gen_random_uuid())->>'ok')::boolean then
    raise exception 'SECURITY FAILURE: release with wrong token';
  end if;
  if not (public.release_reservation('00000000-0000-0000-0000-00000000b001', (r->>'token')::uuid)->>'ok')::boolean then
    raise exception 'FAILURE: release with correct token failed';
  end if;
  -- Drafts cannot be reserved.
  if (public.reserve_product('00000000-0000-0000-0000-00000000b002')->>'ok')::boolean then
    raise exception 'SECURITY FAILURE: draft reserved';
  end if;
end $$;

-- Customer (no staff role) cannot mark sold.
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ begin
  begin
    perform public.mark_product_sold('00000000-0000-0000-0000-00000000b001');
    raise exception 'SECURITY FAILURE: customer marked product sold';
  exception when insufficient_privilege then null; end;
end $$;

-- Admin marks sold; reserving afterwards fails.
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  perform public.mark_product_sold('00000000-0000-0000-0000-00000000b001');
  if (select status from public.products where id = '00000000-0000-0000-0000-00000000b001') <> 'sold' then
    raise exception 'FAILURE: mark sold failed';
  end if;
  if (public.reserve_product('00000000-0000-0000-0000-00000000b001')->>'ok')::boolean then
    raise exception 'SECURITY FAILURE: sold piece reserved';
  end if;
end $$;

reset role;
-- Expired holds are released.
update public.products set status = 'active' where id = '00000000-0000-0000-0000-00000000b002';
select public.reserve_product('00000000-0000-0000-0000-00000000b002');
update public.product_reservations set expires_at = now() - interval '1 minute' where product_id = '00000000-0000-0000-0000-00000000b002';
do $$ begin
  perform public.release_expired_reservations();
  if (select status from public.products where id = '00000000-0000-0000-0000-00000000b002') <> 'active' then
    raise exception 'FAILURE: expired reservation not released';
  end if;
end $$;

select 'unique products verification passed' as result;
rollback;
