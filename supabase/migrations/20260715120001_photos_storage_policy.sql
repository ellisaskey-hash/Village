-- 20260715120001 — storage RLS for the public `photos` bucket (spec 09). Any authenticated
-- member can upload; everyone can read (the bucket is public, this makes the SELECT explicit);
-- uploaders can remove their own files. Paths are namespaced by uploader in the app.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'photos upload') then
    create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'photos read') then
    create policy "photos read" on storage.objects for select using (bucket_id = 'photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'photos delete own') then
    create policy "photos delete own" on storage.objects for delete to authenticated using (bucket_id = 'photos' and owner = auth.uid());
  end if;
end $$;
