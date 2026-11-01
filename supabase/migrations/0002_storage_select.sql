-- Deleting a file in Supabase Storage also needs permission to see it.
-- Let people see the files in their own folder, so removed photos really get deleted.
drop policy if exists "jaale see own files" on storage.objects;
create policy "jaale see own files" on storage.objects for select to authenticated
  using (bucket_id in ('listing-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
