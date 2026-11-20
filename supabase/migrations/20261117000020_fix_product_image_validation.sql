-- Keep migration history aligned with database/sql/20_fix_product_image_validation.sql.
create or replace function public.products_validate_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  u text;
begin
  if new.images is not null then
    foreach u in array new.images loop
      if u is null
         or char_length(u) > 1000
         or u !~ '^(https://|/)[^[:space:]"''<>]+$' then
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
end;
$$;

alter table public.categories drop constraint if exists categories_image_url_format;
alter table public.categories add constraint categories_image_url_format check (
  image_url is null or (
    char_length(image_url) <= 1000
    and image_url ~ '^(https://|/)[^[:space:]"''<>]+$'
  )
);
