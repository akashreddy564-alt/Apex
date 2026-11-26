-- 028: ranking-first social.
--
-- 1. A post remembers where the trail landed on the poster's list ("#2 of 14,
--    just above Angels Landing"). Like the score, it's a snapshot.
-- 2. person_rankings: someone's whole list, for whoever already sees their
--    posts (yourself, friends, people you follow; never across a block).
-- 3. Trail boards for friends, groups and schools/companies. Friends need 2
--    rankers on a trail; groups and orgs need 3 besides you, so no one can
--    work out a single co-member's score.
-- 4. Taste match: how often two people order their shared trails the same
--    way, and trails loved by people with your taste.
--
-- List order everywhere is score desc, position (byte order), trail id: the
-- same as overallByScore in lib/ranking.ts. Only the 'hike' type.

-- ---------------------------------------------------------------------------
-- Placement on posts.
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists list_rank integer check (list_rank is null or list_rank >= 1),
  add column if not exists list_size integer check (list_size is null or list_size >= 1),
  add column if not exists above_trail_id uuid references public.trails (id) on delete set null,
  add column if not exists below_trail_id uuid references public.trails (id) on delete set null;

create index if not exists trail_rankings_trail_type_idx on public.trail_rankings (trail_id, hike_type);
create index if not exists trail_rankings_user_type_score_idx on public.trail_rankings (user_id, hike_type, score desc);

-- A neighbour's name, or null when the viewer can't read that trail.
create or replace function apex_private.trail_name_for_viewer(trail uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.name from public.trails t where t.id = trail and public.can_read_trail(trail);
$$;

drop function if exists public.feed_posts(timestamptz, integer, uuid);
create function public.feed_posts(
  before timestamptz default null,
  max_rows integer default 20,
  only_post uuid default null
)
returns table (
  post_id uuid, author_id uuid, username text, display_name text, trail_id uuid, trail_name text,
  region text, bucket text, score numeric, bucket_size integer, hiked_at timestamptz, posted_at timestamptz,
  duration_seconds integer, distance_km numeric, elevation_gain_m integer, notes text, photos text[],
  route jsonb, like_count integer, comment_count integer, liked boolean, is_mine boolean,
  terrain text[], conditions text[], gear text[], companions jsonb,
  list_rank integer, list_size integer, above_trail_name text, below_trail_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id, p.user_id, pr.username, pr.display_name, p.trail_id, t.name, t.region,
    p.bucket, p.score, p.bucket_size, p.hiked_at, p.created_at,
    l.duration_seconds, l.distance_km, l.elevation_gain_m, l.notes,
    array(select ph from unnest(l.photos) ph where ph like 'sb:%'),
    case
      when l.recorded_path is not null then public.trim_route(l.recorded_path)
      when t.source = 'user' then public.trim_route(t.path)
      when t.path is not null then st_asgeojson(t.path)::jsonb
    end,
    (select count(*)::integer from public.post_likes k where k.post_id = p.id),
    (select count(*)::integer from public.post_comments c
      where c.post_id = p.id and not public.is_blocked_between(auth.uid(), c.user_id)),
    exists (select 1 from public.post_likes k where k.post_id = p.id and k.user_id = auth.uid()),
    p.user_id = auth.uid(),
    coalesce(l.terrain, '{}'), coalesce(l.conditions, '{}'), l.gear, public.post_companions(l.companions),
    p.list_rank, p.list_size,
    apex_private.trail_name_for_viewer(p.above_trail_id),
    apex_private.trail_name_for_viewer(p.below_trail_id)
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  join public.hike_logs l on l.id = p.id
  join public.trails t on t.id = p.trail_id
  where auth.uid() is not null
    and public.sees_posts(auth.uid(), p.user_id)
    and (only_post is null or p.id = only_post)
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

drop function if exists public.person_posts(uuid, timestamptz, integer);
create function public.person_posts(
  person uuid,
  before timestamptz default null,
  max_rows integer default 20
)
returns table (
  post_id uuid, author_id uuid, username text, display_name text, trail_id uuid, trail_name text,
  region text, bucket text, score numeric, bucket_size integer, hiked_at timestamptz, posted_at timestamptz,
  duration_seconds integer, distance_km numeric, elevation_gain_m integer, notes text, photos text[],
  route jsonb, like_count integer, comment_count integer, liked boolean, is_mine boolean,
  terrain text[], conditions text[], gear text[], companions jsonb,
  list_rank integer, list_size integer, above_trail_name text, below_trail_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id, p.user_id, pr.username, pr.display_name, p.trail_id, t.name, t.region,
    p.bucket, p.score, p.bucket_size, p.hiked_at, p.created_at,
    l.duration_seconds, l.distance_km, l.elevation_gain_m, l.notes,
    array(select ph from unnest(l.photos) ph where ph like 'sb:%'),
    case
      when l.recorded_path is not null then public.trim_route(l.recorded_path)
      when t.source = 'user' then public.trim_route(t.path)
      when t.path is not null then st_asgeojson(t.path)::jsonb
    end,
    (select count(*)::integer from public.post_likes k where k.post_id = p.id),
    (select count(*)::integer from public.post_comments c
      where c.post_id = p.id and not public.is_blocked_between(auth.uid(), c.user_id)),
    exists (select 1 from public.post_likes k where k.post_id = p.id and k.user_id = auth.uid()),
    p.user_id = auth.uid(),
    coalesce(l.terrain, '{}'), coalesce(l.conditions, '{}'), l.gear, public.post_companions(l.companions),
    p.list_rank, p.list_size,
    apex_private.trail_name_for_viewer(p.above_trail_id),
    apex_private.trail_name_for_viewer(p.below_trail_id)
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  join public.hike_logs l on l.id = p.id
  join public.trails t on t.id = p.trail_id
  where auth.uid() is not null
    and p.user_id = person
    and public.sees_posts(auth.uid(), person)
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- person_rankings: someone's whole list, best first. A trail the viewer
-- can't read comes back as a row with no id, name, region or route, so the
-- numbering stays honest. Routes only for the top ten.
-- ---------------------------------------------------------------------------
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
      and public.sees_posts(auth.uid(), person)
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

-- ---------------------------------------------------------------------------
-- Trail boards. All-time, top 20, no names. Only trails the viewer can read.
-- ---------------------------------------------------------------------------
create or replace function apex_private.trail_board(people uuid[], min_others integer)
returns table (trail_id uuid, trail_name text, region text, avg_score numeric, rankers integer, place integer)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select r.trail_id,
           round(avg(r.score), 2) as avg_score,
           count(*)::integer as rankers,
           count(*) filter (where r.user_id <> auth.uid())::integer as others
    from public.trail_rankings r
    where r.user_id = any (people)
      and r.hike_type = 'hike'
      and (r.user_id = auth.uid() or not public.is_blocked_between(auth.uid(), r.user_id))
    group by r.trail_id
  )
  select t.id, t.name, t.region, ranked.avg_score, ranked.rankers,
         (row_number() over (order by ranked.avg_score desc, ranked.rankers desc, t.name))::integer
  from ranked
  join public.trails t on t.id = ranked.trail_id
  where ranked.others >= min_others
    and public.can_read_trail(t.id)
  order by ranked.avg_score desc, ranked.rankers desc, t.name
  limit 20;
$$;

-- You and your friends. A trail needs 2 rankers (friends already see each other's rankings).
create or replace function public.friends_trail_board()
returns table (trail_id uuid, trail_name text, region text, avg_score numeric, rankers integer, place integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.* from apex_private.trail_board(
    array(
      select auth.uid() where auth.uid() is not null
      union
      select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
      from public.friendships f
      where f.status = 'accepted'
        and auth.uid() in (f.requester_id, f.addressee_id)
        and not public.is_blocked_between(f.requester_id, f.addressee_id)
    ),
    1
  ) b
  where auth.uid() is not null
    and b.rankers >= 2;
$$;

-- Group members. A trail needs 3 rankers besides you.
create or replace function public.group_trail_board(g uuid)
returns table (trail_id uuid, trail_name text, region text, avg_score numeric, rankers integer, place integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.* from apex_private.trail_board(
    array(select m.user_id from public.group_members m where m.group_id = g),
    3
  ) b
  where public.is_group_member(g);
$$;

-- Verified members of a school or company (verified in the last year). 3 besides you.
create or replace function public.organization_trail_board(o uuid)
returns table (trail_id uuid, trail_name text, region text, avg_score numeric, rankers integer, place integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.* from apex_private.trail_board(
    array(
      select m.user_id from public.organization_members m
      where m.organization_id = o and m.verified_at > now() - interval '1 year'
    ),
    3
  ) b
  where public.is_org_member(o);
$$;

-- ---------------------------------------------------------------------------
-- Taste match. Mirrors lib/taste.ts: of every pair of shared trails, the
-- percentage both people ordered the same way (pairs either tied are
-- skipped). Null below 4 shared trails.
-- ---------------------------------------------------------------------------
create or replace function apex_private.agreement(a uuid, b uuid)
returns table (shared integer, agreement integer)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select ra.trail_id, ra.score as sa, rb.score as sb
    from public.trail_rankings ra
    join public.trail_rankings rb
      on rb.trail_id = ra.trail_id and rb.user_id = b and rb.hike_type = 'hike'
    where ra.user_id = a and ra.hike_type = 'hike'
  ),
  pairs as (
    select sign(x.sa - y.sa) * sign(x.sb - y.sb) as v
    from s x join s y on x.trail_id < y.trail_id
  )
  select
    (select count(*)::integer from s),
    case
      when (select count(*) from s) < 4 then null
      when (select count(*) from pairs where v <> 0) = 0 then null
      else round(100.0 * (select count(*) from pairs where v > 0) / (select count(*) from pairs where v <> 0))::integer
    end;
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
    and public.sees_posts(auth.uid(), person);
$$;

-- Trails you haven't ranked that people with your taste (agreement >= 70,
-- 4+ shared trails, people whose posts you already see) put in Loved.
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
      and public.sees_posts(auth.uid(), x.id)
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

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------
revoke all on function apex_private.trail_name_for_viewer(uuid) from public, anon, authenticated;
revoke all on function apex_private.trail_board(uuid[], integer) from public, anon, authenticated;
revoke all on function apex_private.agreement(uuid, uuid) from public, anon, authenticated;
revoke all on function public.feed_posts(timestamptz, integer, uuid) from public, anon;
revoke all on function public.person_posts(uuid, timestamptz, integer) from public, anon;
revoke all on function public.person_rankings(uuid) from public, anon;
revoke all on function public.friends_trail_board() from public, anon;
revoke all on function public.group_trail_board(uuid) from public, anon;
revoke all on function public.organization_trail_board(uuid) from public, anon;
revoke all on function public.taste_match(uuid) from public, anon;
revoke all on function public.taste_picks(integer) from public, anon;
grant execute on function public.feed_posts(timestamptz, integer, uuid) to authenticated;
grant execute on function public.person_posts(uuid, timestamptz, integer) to authenticated;
grant execute on function public.person_rankings(uuid) to authenticated;
grant execute on function public.friends_trail_board() to authenticated;
grant execute on function public.group_trail_board(uuid) to authenticated;
grant execute on function public.organization_trail_board(uuid) to authenticated;
grant execute on function public.taste_match(uuid) to authenticated;
grant execute on function public.taste_picks(integer) to authenticated;
