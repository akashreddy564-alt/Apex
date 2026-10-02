-- Private bucket for hike log photos.
-- Objects live at {user_id}/{filename}. Readable and writable by that user only.

insert into storage.buckets (id, name, public)
values ('hike-photos', 'hike-photos', false)
on conflict (id) do nothing;

create policy "hike_photos_own_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'hike-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "hike_photos_own_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hike-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "hike_photos_own_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hike-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
