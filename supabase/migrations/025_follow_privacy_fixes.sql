-- 025: privacy fixes for 024 (security review, 2026-11-25).
--
-- 1. Hike photos. 024 let anyone who follows you read every photo in your
--    storage folder, including photos on hikes you never posted. Friends keep
--    folder-wide access (as before 024); a follower may read only a photo that
--    appears on a post they can see.
-- 2. follows_person and sees_posts answered for any pair of people, so anyone
--    could probe who follows or is friends with whom, even across a block.
--    They now answer only when the caller is one of the two (every real use
--    passes auth.uid() already).
--
-- Safe to run more than once.

create or replace function public.follows_person(viewer uuid, person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() in (viewer, person)
    and exists (select 1 from public.follows f where f.follower_id = viewer and f.followee_id = person);
$$;

create or replace function public.sees_posts(viewer uuid, author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select viewer is not null and author is not null and viewer = auth.uid() and (
    viewer = author
    or (
      (public.are_friends(viewer, author) or public.follows_person(viewer, author))
      and not public.is_blocked_between(viewer, author)
    )
  );
$$;

create or replace function public.photo_owner_is_friend(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folder text := split_part(object_name, '/', 1);
  owner uuid;
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  owner := folder::uuid;
  if auth.uid() is null then return false; end if;
  -- You, and friends: the whole folder (unchanged from 011).
  if owner = auth.uid() or public.are_friends(auth.uid(), owner) then
    return true;
  end if;
  -- Followers: only a photo that's on a post they can see.
  return exists (
    select 1
    from public.posts p
    join public.hike_logs l on l.id = p.id
    where p.user_id = owner
      and ('sb:' || object_name) = any (l.photos)
      and public.sees_posts(auth.uid(), owner)
  );
end;
$$;
