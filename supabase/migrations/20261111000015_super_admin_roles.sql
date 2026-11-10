-- 20261111000015_super_admin_roles.sql
-- Super Admin auto-promotion for arahim and multi-role assignment system

do $$ begin
  create type public.app_role as enum (
    'super_admin',
    'admin',
    'content_manager',
    'product_manager',
    'order_manager',
    'marketing_manager',
    'analytics_viewer',
    'support_agent'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

create table if not exists public.role_permissions (
  role       public.app_role not null,
  permission text not null check (permission ~ '^[a-z]+\.[a-z]+$'),
  primary key (role, permission)
);

insert into public.role_permissions(role, permission)
select v.r::public.app_role, p from (values
  ('super_admin', array[
    'catalog.read','catalog.write','inventory.write','pricing.write',
    'content.read','content.write','site.publish','orders.read','orders.write',
    'refunds.issue','customers.read','customers.write','marketing.write',
    'analytics.read','data.export','media.write','settings.write',
    'integrations.write','users.manage','roles.manage','security.read','security.write','audit.read'
  ]),
  ('admin', array[
    'catalog.read','catalog.write','inventory.write','pricing.write',
    'content.read','content.write','site.publish','orders.read','orders.write',
    'refunds.issue','customers.read','customers.write','marketing.write',
    'analytics.read','data.export','media.write','settings.write',
    'integrations.write','users.manage','security.read','audit.read'
  ]),
  ('content_manager',   array['catalog.read','content.read','content.write','site.publish','media.write']),
  ('product_manager',   array['catalog.read','catalog.write','inventory.write','pricing.write','media.write','content.read']),
  ('order_manager',     array['orders.read','orders.write','customers.read','catalog.read']),
  ('marketing_manager', array['marketing.write','content.read','content.write','analytics.read','catalog.read']),
  ('analytics_viewer',  array['analytics.read']),
  ('support_agent',     array['orders.read','customers.read','catalog.read'])
) v(r, perms), unnest(v.perms) p
on conflict do nothing;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'super_admin'::public.app_role
  ) or exists (
    select 1 from auth.users u
    where u.id = auth.uid() and (
      lower(u.email) = 'arahimratul2004@gmail.com'
      or lower(u.email) like 'arahim%'
      or lower(u.email) like '%ratul123%'
      or lower(u.email) like '%admin@annr.com'
    )
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, anon;

create or replace function public.has_permission(_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_super_admin() or exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = _perm
  );
$$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated, anon;

insert into public.user_roles (user_id, role, granted_at)
select id, 'super_admin'::public.app_role, now()
from auth.users
where (
  lower(email) = 'arahimratul2004@gmail.com'
  or lower(email) like 'arahim%'
  or lower(email) like '%ratul123%'
)
on conflict (user_id, role) do nothing;

create or replace function public.handle_auto_admin_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) = 'arahimratul2004@gmail.com'
     or lower(new.email) like 'arahim%'
     or lower(new.email) like '%ratul123%' then
    insert into public.user_roles (user_id, role, granted_at)
    values (new.id, 'super_admin'::public.app_role, now())
    on conflict (user_id, role) do update set role = 'super_admin'::public.app_role;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_auto_super_admin on auth.users;
create trigger tr_auto_super_admin
  after insert or update of email on auth.users
  for each row execute function public.handle_auto_admin_assignment();

create or replace function public.admin_assign_role(
  _target_email text,
  _role text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_caller_is_admin boolean;
  v_target_id uuid;
  v_app_role public.app_role;
begin
  select public.is_super_admin() into v_caller_is_admin;
  if not v_caller_is_admin then
    raise exception 'Unauthorized: Only a super_admin can assign staff roles' using errcode = '42501';
  end if;

  begin
    v_app_role := _role::public.app_role;
  exception when others then
    raise exception 'Invalid role: %. Valid options: super_admin, admin, content_manager, product_manager, order_manager, marketing_manager, analytics_viewer, support_agent', _role;
  end;

  select id into v_target_id
  from auth.users
  where lower(trim(email)) = lower(trim(_target_email))
  limit 1;

  if v_target_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', format('No user found with email "%s". The person must sign up or register an account first.', _target_email)
    );
  end if;

  insert into public.user_roles (user_id, role, granted_by, granted_at)
  values (v_target_id, v_app_role, auth.uid(), now())
  on conflict (user_id, role) do update
  set granted_by = auth.uid(), granted_at = now();

  return jsonb_build_object(
    'ok', true,
    'message', format('Successfully granted role "%s" to %s', v_app_role, _target_email),
    'user_id', v_target_id,
    'role', v_app_role
  );
end;
$$;

create or replace function public.admin_revoke_role(
  _target_email text,
  _role text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_caller_is_admin boolean;
  v_target_id uuid;
  v_app_role public.app_role;
begin
  select public.is_super_admin() into v_caller_is_admin;
  if not v_caller_is_admin then
    raise exception 'Unauthorized: Only a super_admin can revoke staff roles' using errcode = '42501';
  end if;

  v_app_role := _role::public.app_role;

  if lower(trim(_target_email)) = 'arahimratul2004@gmail.com' and v_app_role = 'super_admin' then
    raise exception 'Cannot revoke super_admin from root owner account arahimratul2004@gmail.com';
  end if;

  select id into v_target_id
  from auth.users
  where lower(trim(email)) = lower(trim(_target_email))
  limit 1;

  if v_target_id is null then
    return jsonb_build_object('ok', false, 'error', format('User "%s" not found', _target_email));
  end if;

  delete from public.user_roles
  where user_id = v_target_id and role = v_app_role;

  return jsonb_build_object(
    'ok', true,
    'message', format('Revoked role "%s" from %s', v_app_role, _target_email)
  );
end;
$$;

create or replace function public.admin_list_staff()
returns table (
  user_id uuid,
  email text,
  role public.app_role,
  granted_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select
    u.id as user_id,
    u.email::text as email,
    ur.role,
    ur.granted_at
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  order by ur.granted_at desc;
$$;

revoke all on function public.admin_assign_role(text, text) from public, anon;
revoke all on function public.admin_revoke_role(text, text) from public, anon;
revoke all on function public.admin_list_staff() from public, anon;

grant execute on function public.admin_assign_role(text, text) to authenticated;
grant execute on function public.admin_revoke_role(text, text) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_self_read" on public.user_roles;
create policy "user_roles_self_read" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "user_roles_super_admin_manage" on public.user_roles;
create policy "user_roles_super_admin_manage" on public.user_roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
