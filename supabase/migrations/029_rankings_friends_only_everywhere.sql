-- 029: rankings are friends only, everywhere (owner, 2026-11-26).
--
-- 028_rankings_friends_only limited a trail's Rankings to friends (mutual
-- follows or accepted requests). 028_ranking_social, merged alongside it, let
-- anyone whose posts you see (one-way followers too) read your whole ranked
-- list, your taste match, and use your Loved trails in taste picks. Those
-- three now use is_mutual_friend as well. Your own list stays yours.
--
-- Safe to run more than once.

create or replace function public.person_rankings(person uuid)
returns table (
  trail_id uuid, trail_name text, region text, bucket text, score numeric, list_rank integer,
  difficulty smallint, ranked_at timestamptz, readable boolean, route jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with list as (
    select r.trail_id, r.bucket, r.score, r.difficulty, r.updated_at,
           row_number() over (order by r.score desc, r.position collate "C", r.trail_id)::integer as n
    from public.trail_rankings r
    where auth.uid() is not null
      and r.user_id = person
      and r.hike_type = 'hike'
      and (person = auth.uid() or public.is_mutual_friend(person))
  )
  select
    case when ok then t.id end,
    case when ok then t.name end,
    case when ok then t.region end,
    list.bucket, list.score, list.n, list.difficulty, list.updated_at, ok,
    case
      when not ok or list.n > 10 or t.path is null then null
      when t.source = 'user' then public.trim_route(t.path)
      else st_asgeojson(st_simplify(t.path::geometry, 0.0002))::jsonb
    end
  from list
  join public.trails t on t.id = list.trail_id
  cross join lateral (select public.can_read_trail(t.id) as ok) v
  order by list.n
  limit 500;
$$;

create or replace function public.taste_match(person uuid)
returns table (shared integer, agreement integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.shared, m.agreement
  from apex_private.agreement(auth.uid(), person) m
  where auth.uid() is not null
    and person <> auth.uid()
    and public.is_mutual_friend(person);
$$;

create or replace function public.taste_picks(max_rows integer default 10)
returns table (trail_id uuid, trail_name text, region text, lovers integer, names text[])
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select distinct x.id
    from (
      select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as id
      from public.friendships f
      where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
      union
      select fo.followee_id from public.follows fo where fo.follower_id = auth.uid()
    ) x
    where auth.uid() is not null
      and x.id <> auth.uid()
      and public.is_mutual_friend(x.id)
  ),
  kindred as (
    select c.id
    from candidates c
    cross join lateral apex_private.agreement(auth.uid(), c.id) m
    where m.shared >= 4 and m.agreement >= 70
  ),
  loved as (
    select r.trail_id, pr.display_name, r.score
    from public.trail_rankings r
    join kindred k on k.id = r.user_id
    join public.profiles pr on pr.id = r.user_id
    where r.hike_type = 'hike'
      and r.bucket = 'loved'
      and not exists (
        select 1 from public.trail_rankings mine
        where mine.user_id = auth.uid() and mine.trail_id = r.trail_id and mine.hike_type = 'hike'
      )
  )
  select t.id, t.name, t.region, count(*)::integer,
         (array_agg(loved.display_name order by loved.score desc))[1:2]
  from loved
  join public.trails t on t.id = loved.trail_id
  where public.can_read_trail(t.id)
  group by t.id, t.name, t.region
  order by count(*) desc, max(loved.score) desc, t.name
  limit least(greatest(coalesce(max_rows, 10), 1), 50);
$$;
