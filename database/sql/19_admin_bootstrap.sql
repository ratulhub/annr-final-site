-- ONE-TIME PRODUCTION ADMIN BOOTSTRAP
-- Run only after migrations 01 through 18.
--
-- 1. Create this person in Supabase Dashboard > Authentication > Users first.
-- 2. Replace the placeholder below with that exact email address.
-- 3. Run this file once in the Supabase SQL Editor.
--
-- This script deliberately does NOT grant a role based only on an email at
-- login time. It assigns one explicit database role to one existing Auth user.

begin;

do $$
declare
  owner_email constant text := 'arahimratul2004@gmail.com';
  owner_id uuid;
begin
  if owner_email = 'arahimratul2004@gmail.com' then
    raise exception 'Set owner_email to the exact email of an existing Supabase Auth user before running this script';
  end if;

  select id
    into owner_id
    from auth.users
   where lower(email) = lower(owner_email)
   limit 1;

  if owner_id is null then
    raise exception 'No Supabase Auth user exists for %; create the user in Authentication first', owner_email;
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (owner_id, 'super_admin'::public.app_role, owner_id)
  on conflict (user_id, role) do nothing;
end;
$$;

commit;

-- Verify the result. It must return exactly one explicit super_admin role.
select u.email, ur.role, ur.granted_at
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where ur.role = 'super_admin'::public.app_role;
