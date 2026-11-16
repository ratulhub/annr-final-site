-- =====================================================================================
-- 17 SECURITY HARDENING, EXACT SUPER ADMIN MATCH & CATEGORY IMAGE SUPPORT — run after 16.
-- Idempotent migration to harden deployments that previously ran migration 15:
-- 1. Replaces wildcard email matches in is_super_admin() and handle_auto_admin_assignment()
--    with exact owner match 'arahimratul2004@gmail.com'.
-- 2. Enforces users.manage / is_super_admin() inside admin_list_staff() so customers
--    cannot enumerate staff accounts.
-- 3. Adds image_url column on public.categories and allows image URLs starting with https:// or /.
-- 4. Ensures site_config_versions insert/update work cleanly for site.publish / super_admin.
-- =====================================================================================

-- 1. Exact owner match for is_super_admin()
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'super_admin'::public.app_role
    ) or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(trim(u.email)) = 'arahimratul2004@gmail.com'
    )
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, anon;

-- 2. Auto-promotion trigger restricted strictly to arahimratul2004@gmail.com
create or replace function public.handle_auto_admin_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(trim(coalesce(new.email, ''))) = 'arahimratul2004@gmail.com' then
    insert into public.user_roles (user_id, role, granted_at)
    values (new.id, 'super_admin'::public.app_role, now())
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_auto_super_admin on auth.users;
create trigger tr_auto_super_admin
  after insert or update of email on auth.users
  for each row execute function public.handle_auto_admin_assignment();

-- Guarantee exact owner role row exists
insert into public.user_roles (user_id, role, granted_at)
select id, 'super_admin'::public.app_role, now()
from auth.users
where lower(trim(email)) = 'arahimratul2004@gmail.com'
on conflict (user_id, role) do nothing;

-- 3. Harden admin_list_staff() against unauthorized caller enumeration
drop function if exists public.admin_list_staff();
create or replace function public.admin_list_staff()
returns table (
  user_id uuid,
  email text,
  role public.app_role,
  granted_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not (public.has_permission('users.manage') or public.is_super_admin()) then
    raise exception 'Unauthorized: users.manage permission required' using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    ur.role,
    ur.granted_at
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  order by ur.granted_at desc;
end;
$$;

revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

-- 4. Add image_url column on categories for dynamic storefront category banners
alter table public.categories add column if not exists image_url text
  check (image_url is null or image_url ~ '^(https://|/)[^\s"''<>]{1,1000}$');

-- 5. Update search_products RPC to expose show_size and measurement_unit
drop function if exists public.search_products(text, int);
create or replace function public.search_products(p_q text, p_limit int default 10)
returns table (
  id uuid,
  handle text,
  code text,
  title text,
  price numeric,
  compare_at_price numeric,
  size text,
  show_size boolean,
  measurement_unit text,
  status text,
  images text[]
)
language sql stable security invoker set search_path = '' as $$
  select
    p.id,
    p.handle,
    p.code,
    p.title,
    p.price,
    p.compare_at_price,
    p.size,
    coalesce(p.show_size, true) as show_size,
    coalesce(p.measurement_unit, 'in') as measurement_unit,
    p.status,
    p.images
  from public.products p
  where p.status in ('active','reserved','sold')
    and char_length(trim(coalesce(p_q, ''))) between 1 and 80
    and lower(coalesce(p.code, '') || ' ' || p.title)
        like '%' || replace(replace(replace(lower(trim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by (upper(p.code) = upper(trim(p_q))) desc, (p.status = 'active') desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

revoke all on function public.search_products(text, int) from public;
grant execute on function public.search_products(text, int) to anon, authenticated;

-- 6. Ensure site_config_versions policy works smoothly with site.publish / super_admin
drop policy if exists site_config_insert_draft on public.site_config_versions;
create policy site_config_insert_draft on public.site_config_versions
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (is_published = false and public.has_permission('content.write'))
    or (is_published = true and public.has_permission('site.publish'))
  );

drop policy if exists site_config_update_publish on public.site_config_versions;
create policy site_config_update_publish on public.site_config_versions
  for update to authenticated
  using (public.has_permission('site.publish') or public.is_super_admin())
  with check (public.has_permission('site.publish') or public.is_super_admin());
