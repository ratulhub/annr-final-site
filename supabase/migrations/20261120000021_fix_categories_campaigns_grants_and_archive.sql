-- =====================================================================================
-- 21 FIX CATEGORIES & CAMPAIGNS GRANTS, ARCHIVED STOCK & SITE CONFIG PUBLISH
-- =====================================================================================

begin;

do $$ begin
  if to_regclass('public.categories') is not null then
    alter table public.categories enable row level security;
    alter table public.categories force row level security;
    grant select on public.categories to anon, authenticated;
    grant insert, update, delete on public.categories to authenticated;

    drop policy if exists categories_select_public on public.categories;
    create policy categories_select_public on public.categories for select to anon, authenticated
      using (is_visible or public.has_permission('catalog.read') or public.is_super_admin());

    drop policy if exists categories_write_staff on public.categories;
    create policy categories_write_staff on public.categories for all to authenticated
      using (public.has_permission('catalog.write') or public.is_super_admin())
      with check (public.has_permission('catalog.write') or public.is_super_admin());
  end if;

  if to_regclass('public.campaigns') is not null then
    alter table public.campaigns enable row level security;
    alter table public.campaigns force row level security;
    grant select on public.campaigns to anon, authenticated;
    grant insert, update, delete on public.campaigns to authenticated;

    drop policy if exists campaigns_select_public on public.campaigns;
    create policy campaigns_select_public on public.campaigns for select to anon, authenticated
      using (status in ('active','ended') or public.has_permission('catalog.read') or public.is_super_admin());

    drop policy if exists campaigns_write_staff on public.campaigns;
    create policy campaigns_write_staff on public.campaigns for all to authenticated
      using (public.has_permission('catalog.write') or public.is_super_admin())
      with check (public.has_permission('catalog.write') or public.is_super_admin());
  end if;

  if to_regclass('public.product_reservations') is not null then
    alter table public.product_reservations enable row level security;
    alter table public.product_reservations force row level security;
    grant select on public.product_reservations to authenticated;
  end if;
end $$;

create or replace function public.products_validate_row() returns trigger
language plpgsql set search_path = '' as $$
declare u text;
begin
  if new.images is not null then
    foreach u in array new.images loop
      if u is null
         or char_length(u) > 1000
         or (u !~ '^https://' and u !~ '^/[^/]')
         or u ~ '[[:space:]"''<>]' then
        raise exception 'invalid image url' using errcode = '22023';
      end if;
    end loop;
  end if;
  if new.code is not null then new.code := upper(new.code); end if;
  if new.status = 'sold' then
    new.stock := 0;
    new.sold_at := coalesce(new.sold_at, now());
    new.reserved_until := null;
  elsif new.status = 'archived' then
    new.stock := 0;
    new.reserved_until := null;
    new.sold_at := null;
  elsif new.status in ('active','draft') then
    new.stock := 1;
    new.reserved_until := null;
    new.sold_at := null;
  end if;
  if new.status = 'active' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;

drop trigger if exists products_validate_row on public.products;
create trigger products_validate_row before insert or update on public.products
  for each row execute function public.products_validate_row();

commit;
