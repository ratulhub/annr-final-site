-- =====================================================================================
-- 06 SERVER RPC FUNCTIONS — run after 05.
-- High-risk operations run inside SECURITY DEFINER functions with a fixed search_path,
-- explicit permission checks, and append-only audit logging via security.audit().
-- Safe to re-run.
-- =====================================================================================

-- 1. Publish a site configuration atomically (unpublishes previous live row, inserts new published row).
create or replace function public.publish_site_config(_config jsonb, _note text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare _id bigint;
begin
  if auth.uid() is null or not public.has_permission('site.publish') then
    perform security.audit('site.publish', 'site_config_versions', 'live', 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.site_config_versions set is_published = false where is_published = true;
  insert into public.site_config_versions(config, is_published, note, created_by)
  values (_config, true, left(_note, 200), auth.uid())
  returning id into _id;
  perform security.audit('site.publish', 'site_config_versions', _id::text, 'success', jsonb_build_object('note', left(coalesce(_note, ''), 80)));
  return _id;
end $$;
revoke all on function public.publish_site_config(jsonb, text) from public, anon;
grant execute on function public.publish_site_config(jsonb, text) to authenticated;

-- 2. Adjust variant inventory with audit logging.
create or replace function public.adjust_inventory(_variant_id uuid, _on_hand int, _reserved int default 0)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('inventory.write') then
    perform security.audit('inventory.adjust', 'inventory', _variant_id::text, 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _on_hand < 0 or _reserved < 0 or _reserved > _on_hand then
    raise exception 'invalid inventory counts' using errcode = '22023';
  end if;
  insert into public.inventory(variant_id, on_hand, reserved, updated_at)
  values (_variant_id, _on_hand, _reserved, now())
  on conflict (variant_id) do update
    set on_hand = excluded.on_hand, reserved = excluded.reserved, updated_at = now();
  perform security.audit('inventory.adjust', 'inventory', _variant_id::text, 'success',
    jsonb_build_object('on_hand', _on_hand, 'reserved', _reserved));
end $$;
revoke all on function public.adjust_inventory(uuid, int, int) from public, anon;
grant execute on function public.adjust_inventory(uuid, int, int) to authenticated;

-- 3. Update order fulfilment / payment status (refunds require refunds.issue permission).
create or replace function public.update_order_status(_order_id uuid, _status text, _payment_status text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('orders.write') then
    perform security.audit('order.status', 'orders', _order_id::text, 'denied', '{}'::jsonb);
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if (_status in ('refunded','partially_refunded') or _payment_status = 'refunded')
     and not public.has_permission('refunds.issue') then
    perform security.audit('order.refund', 'orders', _order_id::text, 'denied', '{}'::jsonb);
    raise exception 'refunds.issue permission required' using errcode = '42501';
  end if;
  update public.orders
     set status = _status,
         payment_status = coalesce(_payment_status, payment_status),
         updated_at = now()
   where id = _order_id;
  perform security.audit('order.status', 'orders', _order_id::text, 'success',
    jsonb_build_object('status', _status, 'payment_status', _payment_status));
end $$;
revoke all on function public.update_order_status(uuid, text, text) from public, anon;
grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- 4. Validate a single discount code without allowing callers to list all codes.
create or replace function public.check_discount_code(_code text)
returns table(code text, kind text, value numeric) language sql stable security definer set search_path = '' as $$
  select d.code, d.kind, d.value
    from public.discounts d
   where d.code = upper(trim(_code))
     and d.active = true
     and (d.starts_at is null or d.starts_at <= now())
     and (d.ends_at is null or d.ends_at > now())
     and (d.max_uses is null or d.used_count < d.max_uses)
   limit 1;
$$;
revoke all on function public.check_discount_code(text) from public;
grant execute on function public.check_discount_code(text) to anon, authenticated;

-- 5. Owner-only retention purge for security.audit_log (keep 400 days; see database/README.md §7).
-- Temporarily disables the append-only trigger inside the owner function to delete rows older than _keep_days.
create or replace function security.purge_old_audit_logs(_keep_days int default 400)
returns bigint language plpgsql security definer set search_path = '' as $$
declare _deleted bigint;
begin
  if _keep_days < 365 then
    raise exception 'retention must be at least 365 days' using errcode = '22023';
  end if;
  alter table security.audit_log disable trigger audit_no_update;
  delete from security.audit_log where at < now() - make_interval(days => _keep_days);
  get diagnostics _deleted = row_count;
  alter table security.audit_log enable trigger audit_no_update;
  return _deleted;
end $$;
revoke all on function security.purge_old_audit_logs(int) from public, anon, authenticated;

-- 6. Server-authoritative order creation & atomic inventory reservation (Phase 5 E-Commerce Security).
-- Never trusts client-supplied unit prices, subtotals, discounts, or payment status.
create or replace function public.create_validated_order(
  _email text,
  _items jsonb,
  _discount_code text default null,
  _shipping_address jsonb default null,
  _idempotency_key text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := auth.uid();
  _order_id uuid;
  _item jsonb;
  _vid uuid;
  _qty int;
  _unit_price numeric(12,2);
  _title text;
  _on_hand int;
  _reserved int;
  _subtotal numeric(12,2) := 0;
  _discount_total numeric(12,2) := 0;
  _disc record;
begin
  if _uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if _email is null or char_length(trim(_email)) = 0 or char_length(_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) < 1 or jsonb_array_length(_items) > 30 then
    raise exception 'order must contain between 1 and 30 line items' using errcode = '22023';
  end if;

  -- Idempotency guard: prevent duplicate order submission on network retry.
  if _idempotency_key is not null then
    select o.id into _order_id
      from public.orders o
     where o.idempotency_key = left(_idempotency_key, 100)
       and o.user_id = _uid;
    if _order_id is not null then
      return _order_id;
    end if;
  end if;

  -- First pass: validate every variant, check active product status, reserve inventory, and sum authoritative prices.
  for _item in select * from jsonb_array_elements(_items) loop
    _vid := (_item->>'variant_id')::uuid;
    _qty := (_item->>'quantity')::int;
    if _vid is null or _qty is null or _qty < 1 or _qty > 20 then
      raise exception 'invalid item quantity (must be 1..20)' using errcode = '22023';
    end if;

    select coalesce(pv.price, p.price), p.title
      into _unit_price, _title
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.id = _vid and p.status = 'active';
    if not found or _unit_price is null or _unit_price < 0 then
      raise exception 'product variant unavailable' using errcode = '22023';
    end if;

    select inv.on_hand, inv.reserved
      into _on_hand, _reserved
      from public.inventory inv
     where inv.variant_id = _vid
       for update;
    if not found or (_on_hand - _reserved) < _qty then
      raise exception 'insufficient stock for variant %', _vid using errcode = 'P0002';
    end if;

    update public.inventory
       set reserved = reserved + _qty, updated_at = now()
     where variant_id = _vid;

    _subtotal := _subtotal + (_unit_price * _qty);
  end loop;

  -- Optional server-side discount code calculation & usage counter increment.
  if _discount_code is not null and char_length(trim(_discount_code)) > 0 then
    select d.id, d.kind, d.value
      into _disc
      from public.discounts d
     where d.code = upper(trim(_discount_code))
       and d.active = true
       and (d.starts_at is null or d.starts_at <= now())
       and (d.ends_at is null or d.ends_at > now())
       and (d.max_uses is null or d.used_count < d.max_uses)
       for update;
    if not found then
      raise exception 'invalid or expired discount code' using errcode = '22023';
    end if;
    if _disc.kind = 'percent' then
      _discount_total := round(_subtotal * (_disc.value / 100.0), 2);
    else
      _discount_total := least(_subtotal, _disc.value);
    end if;
    update public.discounts set used_count = used_count + 1 where id = _disc.id;
  end if;

  insert into public.orders (
    user_id, email, status, payment_status,
    subtotal, discount_total, shipping_total, total,
    idempotency_key, shipping_address
  ) values (
    _uid, trim(_email), 'pending', 'unpaid',
    _subtotal, _discount_total, 0, greatest(0, _subtotal - _discount_total),
    case when _idempotency_key is not null then left(_idempotency_key, 100) else null end,
    _shipping_address
  ) returning id into _order_id;

  -- Insert order line items using authoritative DB prices.
  for _item in select * from jsonb_array_elements(_items) loop
    _vid := (_item->>'variant_id')::uuid;
    _qty := (_item->>'quantity')::int;
    select coalesce(pv.price, p.price), p.title
      into _unit_price, _title
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.id = _vid;
    insert into public.order_items (order_id, variant_id, title, unit_price, quantity)
    values (_order_id, _vid, left(_title, 200), _unit_price, _qty);
  end loop;

  perform security.audit('order.create', 'orders', _order_id::text, 'success',
    jsonb_build_object('subtotal', _subtotal, 'discount_total', _discount_total, 'total', greatest(0, _subtotal - _discount_total)));
  return _order_id;
end $$;
revoke all on function public.create_validated_order(text, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.create_validated_order(text, jsonb, text, jsonb, text) to authenticated;


