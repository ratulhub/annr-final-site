-- =====================================================================================
-- 03 ROLES & PERMISSIONS (RBAC) — run after 02.
-- Roles live in their own table, never on profiles. Mirrors src/admin/security/permissions.ts.
-- Nobody can write roles through the Data API (no write grants, no write policies). The only path is
-- public.grant_role()/revoke_role(): super admins only, never on themselves, always audited.
-- The FIRST super admin is created manually by the database owner (README §4).
-- =====================================================================================

do $$ begin
  create type public.app_role as enum ('super_admin','admin','content_manager','product_manager',
    'order_manager','marketing_manager','analytics_viewer','support_agent');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.role_permissions (
  role       public.app_role not null,
  permission text not null check (permission ~ '^[a-z]+\.[a-z]+$'),
  primary key (role, permission)
);

insert into public.role_permissions(role, permission)
select v.r::public.app_role, p from (values
  ('super_admin', array['catalog.read','catalog.write','inventory.write','pricing.write','content.read','content.write','site.publish','orders.read','orders.write','refunds.issue','customers.read','customers.write','marketing.write','analytics.read','data.export','media.write','settings.write','integrations.write','users.manage','roles.manage','security.read','security.write','audit.read']),
  ('admin',       array['catalog.read','catalog.write','inventory.write','pricing.write','content.read','content.write','site.publish','orders.read','orders.write','refunds.issue','customers.read','customers.write','marketing.write','analytics.read','data.export','media.write','settings.write','integrations.write','users.manage','security.read','audit.read']),
  ('content_manager',  array['catalog.read','content.read','content.write','site.publish','media.write']),
  ('product_manager',  array['catalog.read','catalog.write','inventory.write','pricing.write','media.write','content.read']),
  ('order_manager',    array['orders.read','orders.write','customers.read','catalog.read']),
  ('marketing_manager',array['marketing.write','content.read','content.write','analytics.read','catalog.read']),
  ('analytics_viewer', array['analytics.read']),
  ('support_agent',    array['orders.read','customers.read','catalog.read'])
) v(r, perms), unnest(v.perms) p
on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['user_roles','role_permissions'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
  end loop;
end $$;

-- Permission checks used by every policy. SECURITY DEFINER avoids recursive RLS on user_roles;
-- they only answer about the CALLER (auth.uid()) and take no user id, so they cannot probe others.
create or replace function public.has_permission(_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = _perm)
$$;

create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role)
$$;

revoke all on function public.has_permission(text), public.has_role(public.app_role) from public;
grant execute on function public.has_permission(text), public.has_role(public.app_role) to anon, authenticated;

create or replace function public.grant_role(_user uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('roles.manage') then
    perform security.audit('role.grant', 'user_roles', _user::text, 'denied', jsonb_build_object('role', _role));
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _user = auth.uid() then raise exception 'cannot change your own roles' using errcode = '42501'; end if;
  insert into public.user_roles(user_id, role, granted_by) values (_user, _role, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.revoke_role(_user uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('roles.manage') then
    perform security.audit('role.revoke', 'user_roles', _user::text, 'denied', jsonb_build_object('role', _role));
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _user = auth.uid() then raise exception 'cannot change your own roles' using errcode = '42501'; end if;
  delete from public.user_roles where user_id = _user and role = _role;
end $$;

revoke all on function public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role) from public, anon;
grant execute on function public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role) to authenticated;

create or replace function public.read_audit_log(_limit int default 100, _before bigint default null)
returns setof security.audit_log language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('audit.read') then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select * from security.audit_log
    where _before is null or id < _before order by id desc limit least(greatest(_limit, 1), 500);
end $$;
revoke all on function public.read_audit_log(int, bigint) from public, anon;
grant execute on function public.read_audit_log(int, bigint) to authenticated;
