-- 04 Storage bucket for product photos + realtime for order status messages.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read product photos (the bucket is public anyway).
create policy "product images are readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- A seller (who is not hidden) may write only inside their own folder: <uid>/...
create policy "sellers upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.sellers s
      where s.id = (select auth.uid()) and s.status <> 'hidden'
    )
  );

create policy "sellers update their own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sellers delete their own files, admins delete any"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- Realtime: the buyer's page hears about status changes on their own orders
-- (RLS filters which rows each subscriber may receive).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
     ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

notify pgrst, 'reload schema';
