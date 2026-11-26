-- 028: a trail's Rankings show friends only (owner, 2026-11-26).
--
-- A friend is someone you follow who follows you back (an accepted friend
-- request counts too). Someone you only follow one way no longer sees how you
-- ranked a trail, and you don't see theirs.
--
-- Safe to run more than once.

create or replace function public.is_mutual_friend(person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and person is not null and person <> auth.uid() and (
    public.are_friends(auth.uid(), person)
    or (
      exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = person)
      and exists (select 1 from public.follows f where f.follower_id = person and f.followee_id = auth.uid())
    )
  ) and not public.is_blocked_between(auth.uid(), person);
$$;

create or replace function public.trail_people_rankings(trail uuid)
returns table (
  person_id uuid, username text, display_name text, bucket text, score numeric,
  difficulty smallint, is_friend boolean, ranked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, pr.username, pr.display_name, r.bucket, r.score, r.difficulty, true, r.updated_at
  from public.trail_rankings r
  join public.profiles pr on pr.id = r.user_id
  where auth.uid() is not null
    and r.trail_id = trail
    and r.hike_type = 'hike'
    and r.user_id <> auth.uid()
    and public.is_mutual_friend(r.user_id)
  order by r.score desc, r.updated_at desc
  limit 50;
$$;

revoke all on function public.is_mutual_friend(uuid) from public, anon;
grant execute on function public.is_mutual_friend(uuid) to authenticated;
