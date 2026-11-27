-- Profile photos.
--
-- A public bucket: names and usernames are already visible to signed-in
-- people, and a public URL lets the app cache the image without signing.
-- Each person writes only inside their own folder: avatars/{user_id}/{file}.
-- A new upload gets a new random file name, which busts every cache; the
-- app deletes the old file after the profile row points at the new one.
-- Small on purpose (the app sends a 512 px JPEG), which also keeps egress low.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Listing your own folder (to clean up on account deletion). Public reads of
-- a known path go through the public URL and need no policy.
drop policy if exists "avatars_own_select" on storage.objects;
create policy "avatars_own_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The profile points at its current photo. Null means initials, and no request.
alter table public.profiles
  add column if not exists avatar_path text
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.jpg$');

-- Only your own folder can be set as your photo.
create or replace function public.avatar_path_is_own()
returns trigger
language plpgsql
as $$
begin
  if new.avatar_path is not null and split_part(new.avatar_path, '/', 1) <> new.id::text then
    raise exception 'avatar_path must be in your own folder';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_avatar_path_is_own on public.profiles;
create trigger profiles_avatar_path_is_own
  before insert or update of avatar_path on public.profiles
  for each row execute function public.avatar_path_is_own();
