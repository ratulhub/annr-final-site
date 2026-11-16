-- Run after 17 in the Supabase SQL Editor.
-- Require an explicit role row; an email address alone never grants admin access.
drop trigger if exists tr_auto_super_admin on auth.users;
drop function if exists public.handle_auto_admin_assignment();

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'super_admin'::public.app_role
  );
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.publish_site_config(_config jsonb, _note text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare _id bigint;
begin
  if auth.uid() is null or not public.has_permission('site.publish') then raise exception 'not authorized' using errcode = '42501'; end if;
  if jsonb_typeof(_config) <> 'object' or pg_column_size(_config) >= 2000000 then raise exception 'invalid site configuration' using errcode = '22023'; end if;
  update public.site_config_versions set is_published = false where is_published;
  insert into public.site_config_versions(config, is_published, note, created_by)
  values (_config, true, left(_note, 200), auth.uid()) returning id into _id;
  perform security.audit('site.publish', 'site_config_versions', _id::text, 'success', jsonb_build_object('note', left(coalesce(_note, ''), 80)));
  return _id;
end;
$$;

create or replace function public.unpublish_site_config()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('site.publish') then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.site_config_versions set is_published = false where is_published;
  perform security.audit('site.unpublish', 'site_config_versions', 'live', 'success', '{}'::jsonb);
end;
$$;
revoke all on function public.publish_site_config(jsonb, text) from public, anon;
revoke all on function public.unpublish_site_config() from public, anon;
grant execute on function public.publish_site_config(jsonb, text) to authenticated;
grant execute on function public.unpublish_site_config() to authenticated;
