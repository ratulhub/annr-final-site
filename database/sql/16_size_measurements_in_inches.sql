-- =====================================================================================
-- 16 SIZE MEASUREMENTS IN INCHES & SIZE VISIBILITY TOGGLE — run after 15.
-- Adds show_size (boolean) and measurement_unit (text default 'in') to products.
-- Ensures hand-measured flat dimensions in inches (e.g. 24.5 chest, 29 length).
-- Idempotent: safe to run repeatedly.
-- =====================================================================================

alter table public.products add column if not exists show_size boolean not null default true;
alter table public.products add column if not exists measurement_unit text not null default 'in';

do $$ begin
  alter table public.products add constraint products_unit_check check (measurement_unit in ('in', 'cm'));
exception when duplicate_object then null; end $$;

comment on column public.products.show_size is 'Controls whether the standard S/M/L alpha size badge is shown or hidden (measurements only) on the storefront';
comment on column public.products.measurement_unit is 'Unit of flat garment measurements: in (inches) or cm';
