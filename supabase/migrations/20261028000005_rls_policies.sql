-- =====================================================================================
-- 05 ROW LEVEL SECURITY POLICIES — run after 04.
-- Deny-by-default: every table has RLS enabled and forced in 04.
-- Policies below grant the minimum access needed for visitors, signed-in customers,
-- and staff roles (checked via public.has_permission() from 03).
-- Safe to re-run: drops each named policy before creating it.
-- =====================================================================================

-- ---------- Profiles ----------
drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.has_permission('customers.read') or public.has_permission('users.manage'));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.has_permission('customers.write'))
  with check (id = (select auth.uid()) or public.has_permission('customers.write'));

-- ---------- Collections ----------
drop policy if exists collections_select_public on public.collections;
create policy collections_select_public on public.collections
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('catalog.read'));

drop policy if exists collections_write_staff on public.collections;
create policy collections_write_staff on public.collections
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Products ----------
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select to anon, authenticated
  using (status = 'active' or public.has_permission('catalog.read'));

drop policy if exists products_write_staff on public.products;
create policy products_write_staff on public.products
  for all to authenticated
  using (public.has_permission('catalog.write') and public.has_permission('pricing.write'))
  with check (public.has_permission('catalog.write') and public.has_permission('pricing.write'));

-- ---------- Product Images ----------
drop policy if exists product_images_select_public on public.product_images;
create policy product_images_select_public on public.product_images
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists product_images_write_staff on public.product_images;
create policy product_images_write_staff on public.product_images
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Product Variants ----------
drop policy if exists product_variants_select_public on public.product_variants;
create policy product_variants_select_public on public.product_variants
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );

drop policy if exists product_variants_write_staff on public.product_variants;
create policy product_variants_write_staff on public.product_variants
  for all to authenticated
  using (public.has_permission('catalog.write') and public.has_permission('pricing.write'))
  with check (public.has_permission('catalog.write') and public.has_permission('pricing.write'));

-- ---------- Inventory ----------
drop policy if exists inventory_select_staff on public.inventory;
create policy inventory_select_staff on public.inventory
  for select to authenticated
  using (public.has_permission('catalog.read') or public.has_permission('inventory.write'));

drop policy if exists inventory_write_staff on public.inventory;
create policy inventory_write_staff on public.inventory
  for all to authenticated
  using (public.has_permission('inventory.write'))
  with check (public.has_permission('inventory.write'));

-- ---------- Collection Products ----------
drop policy if exists collection_products_select_public on public.collection_products;
create policy collection_products_select_public on public.collection_products
  for select to anon, authenticated
  using (
    public.has_permission('catalog.read')
    or exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')
  );

drop policy if exists collection_products_write_staff on public.collection_products;
create policy collection_products_write_staff on public.collection_products
  for all to authenticated
  using (public.has_permission('catalog.write'))
  with check (public.has_permission('catalog.write'));

-- ---------- Site Pages (/p/<slug>) ----------
drop policy if exists site_pages_select_public on public.site_pages;
create policy site_pages_select_public on public.site_pages
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('content.read'));

drop policy if exists site_pages_write_staff on public.site_pages;
create policy site_pages_write_staff on public.site_pages
  for all to authenticated
  using (public.has_permission('content.write'))
  with check (public.has_permission('content.write'));

-- ---------- Site Config Versions (draft vs published) ----------
drop policy if exists site_config_select_public on public.site_config_versions;
create policy site_config_select_public on public.site_config_versions
  for select to anon, authenticated
  using (is_published = true or public.has_permission('content.read'));

drop policy if exists site_config_insert_draft on public.site_config_versions;
create policy site_config_insert_draft on public.site_config_versions
  for insert to authenticated
  with check (
    (is_published = false and public.has_permission('content.write'))
    or (is_published = true and public.has_permission('site.publish'))
  );

drop policy if exists site_config_update_publish on public.site_config_versions;
create policy site_config_update_publish on public.site_config_versions
  for update to authenticated
  using (public.has_permission('site.publish'))
  with check (public.has_permission('site.publish'));

-- ---------- Media Assets ----------
drop policy if exists media_assets_select_public on public.media_assets;
create policy media_assets_select_public on public.media_assets
  for select to anon, authenticated
  using (bucket = 'public-media' or public.has_permission('media.write') or public.has_permission('orders.read'));

drop policy if exists media_assets_write_staff on public.media_assets;
create policy media_assets_write_staff on public.media_assets
  for all to authenticated
  using (public.has_permission('media.write'))
  with check (public.has_permission('media.write'));

-- ---------- Customer Addresses (strict BOLA isolation) ----------
drop policy if exists customer_addresses_select_own_or_staff on public.customer_addresses;
create policy customer_addresses_select_own_or_staff on public.customer_addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('customers.read'));

drop policy if exists customer_addresses_write_own on public.customer_addresses;
create policy customer_addresses_write_own on public.customer_addresses
  for all to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('customers.write'))
  with check (user_id = (select auth.uid()) or public.has_permission('customers.write'));

-- ---------- Saved Items / Wishlist (strict BOLA isolation) ----------
drop policy if exists saved_items_own on public.saved_items;
create policy saved_items_own on public.saved_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Orders & Order Items ----------
drop policy if exists orders_select_own_or_staff on public.orders;
create policy orders_select_own_or_staff on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('orders.read'));

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders
  for update to authenticated
  using (public.has_permission('orders.write'))
  with check (
    public.has_permission('orders.write')
    and (
      status not in ('refunded','partially_refunded')
      and payment_status <> 'refunded'
      or public.has_permission('refunds.issue')
    )
  );

drop policy if exists order_items_select_own_or_staff on public.order_items;
create policy order_items_select_own_or_staff on public.order_items
  for select to authenticated
  using (
    public.has_permission('orders.read')
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

-- ---------- Discounts (never public-listable; checked via 06 RPC) ----------
drop policy if exists discounts_staff on public.discounts;
create policy discounts_staff on public.discounts
  for all to authenticated
  using (public.has_permission('marketing.write'))
  with check (public.has_permission('marketing.write'));

-- ---------- Contact & Form Submissions ----------
drop policy if exists contact_submissions_insert_public on public.contact_submissions;
create policy contact_submissions_insert_public on public.contact_submissions
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = (select auth.uid())));

drop policy if exists contact_submissions_select_staff on public.contact_submissions;
create policy contact_submissions_select_staff on public.contact_submissions
  for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('customers.read'));

drop policy if exists contact_submissions_update_staff on public.contact_submissions;
create policy contact_submissions_update_staff on public.contact_submissions
  for update to authenticated
  using (public.has_permission('content.write') or public.has_permission('customers.write'))
  with check (public.has_permission('content.write') or public.has_permission('customers.write'));

-- ---------- Analytics Events ----------
drop policy if exists analytics_events_insert_public on public.analytics_events;
create policy analytics_events_insert_public on public.analytics_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists analytics_events_select_staff on public.analytics_events;
create policy analytics_events_select_staff on public.analytics_events
  for select to authenticated
  using (public.has_permission('analytics.read'));

-- ---------- RBAC Tables (read-only; writes only via grant_role/revoke_role in 03) ----------
drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('users.manage') or public.has_permission('security.read'));

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated on public.role_permissions
  for select to authenticated
  using (true);

