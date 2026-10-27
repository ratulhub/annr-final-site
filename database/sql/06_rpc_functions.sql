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

