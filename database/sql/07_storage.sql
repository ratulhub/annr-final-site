-- =====================================================================================
-- 07 STORAGE BUCKETS & POLICIES — run after 06.
-- Creates two buckets:
--   1. public-media (public read, 400 KB max, safe raster images only — SVG blocked)
--   2. private-documents (private, 10 MB max, PDF invoices/documents only)
-- Enforces path hygiene, MIME allowlists, and RBAC permissions on storage.objects.
-- Safe to re-run.
-- =====================================================================================

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('public-media', 'public-media', true, 409600, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
      ('private-documents', 'private-documents', false, 10485760, array['application/pdf'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists storage_public_media_read on storage.objects;
    create policy storage_public_media_read on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'public-media');

    drop policy if exists storage_public_media_write on storage.objects;
    create policy storage_public_media_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'public-media'
        and public.has_permission('media.write')
        and name ~ '^[a-zA-Z0-9/_.-]{1,200}\.(jpg|jpeg|png|webp|gif|avif)$'
        and name !~ '\.\.'
      );

    drop policy if exists storage_public_media_delete on storage.objects;
    create policy storage_public_media_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'public-media' and public.has_permission('media.write'));

    drop policy if exists storage_private_docs_read on storage.objects;
    create policy storage_private_docs_read on storage.objects
      for select to authenticated
      using (bucket_id = 'private-documents' and public.has_permission('orders.read'));

    drop policy if exists storage_private_docs_write on storage.objects;
    create policy storage_private_docs_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'private-documents'
        and public.has_permission('orders.write')
        and name ~ '^[a-zA-Z0-9/_.-]{1,200}\.pdf$'
        and name !~ '\.\.'
      );
  end if;
end $$;

