-- Friends leaderboard and a person's hikes (launch gaps, 2026-11-23).
-- Safe to run more than once. Needs 015 (board_gain, blocks).
--
-- friend_board: you and your friends by recorded climb, the same math as a
-- group board (apex_private.board_gain), in the asking phone's time zone.
-- person_posts: one friend's posts for their page, with the same columns and
-- privacy as feed_posts (trimmed routes, friends only, blocks respected).

-- ---------------------------------------------------------------------------
-- friend_board: 'week', 'month' or 'year'. `tz` is the phone's IANA zone.
-- ---------------------------------------------------------------------------
create or replace function public.friend_board(period text default 'week', tz text default 'UTC')
returns table (
  user_id uuid,
  username text,
  display_name text,
  gain_m integer,
  hikes integer,
  km numeric,
  place integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with zone as (
    select case
      when exists (select 1 from pg_timezone_names where name = tz) then tz
      else 'UTC'
    end as name
  ),
  people as (
    select auth.uid() as id
    where auth.uid() is not null
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted'
      and auth.uid() in (f.requester_id, f.addressee_id)
      and not public.is_blocked_between(f.requester_id, f.addressee_id)
  ),
  hikes as (
    select
      l.user_id,
      l.id,
      apex_private.board_gain(l.trail_id, l.elevation_gain_m, l.recorded_path) as gain_m,
      round((st_length(l.recorded_path) / 1000)::numeric, 2) as km
    from public.hike_logs l, zone
    where l.user_id in (select id from people)
      and l.recorded_path is not null
      and l.created_at >= public.period_start(zone.name, period)
  ),
  totals as (
    select
      p.id as user_id,
      coalesce(sum(h.gain_m), 0)::integer as gain_m,
      count(h.id)::integer as hikes,
      coalesce(sum(h.km), 0) as km
    from people p
    left join hikes h on h.user_id = p.id
    group by p.id
  )
  select
    t.user_id,
    pr.username,
    pr.display_name,
    t.gain_m,
    t.hikes,
    t.km,
    (rank() over (order by t.gain_m desc))::integer,
    t.user_id = auth.uid()
  from totals t
  join public.profiles pr on pr.id = t.user_id
  order by 7, pr.display_name;
$$;

-- ---------------------------------------------------------------------------
-- person_posts: someone's posts, newest first. Only for yourself or a friend.
-- ---------------------------------------------------------------------------
create or replace function public.person_posts(
  person uuid,
  before timestamptz default null,
  max_rows integer default 20
)
returns table (
  post_id uuid,
  author_id uuid,
  username text,
  display_name text,
  trail_id uuid,
  trail_name text,
  region text,
  bucket text,
  score numeric,
  bucket_size integer,
  hiked_at timestamptz,
  posted_at timestamptz,
  duration_seconds integer,
  distance_km numeric,
  elevation_gain_m integer,
  notes text,
  photos text[],
  route jsonb,
  like_count integer,
  comment_count integer,
  liked boolean,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id,
    p.user_id,
    pr.username,
    pr.display_name,
    p.trail_id,
    t.name,
    t.region,
    p.bucket,
    p.score,
    p.bucket_size,
    p.hiked_at,
    p.created_at,
    l.duration_seconds,
    coalesce(l.distance_km, t.distance_km),
    t.elevation_gain_m,
    l.notes,
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
    p.user_id = auth.uid()
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  join public.hike_logs l on l.id = p.id
  join public.trails t on t.id = p.trail_id
  where auth.uid() is not null
    and p.user_id = person
    and (person = auth.uid()
      or (public.are_friends(auth.uid(), person) and not public.is_blocked_between(auth.uid(), person)))
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

revoke all on function public.friend_board(text, text) from public, anon;
revoke all on function public.person_posts(uuid, timestamptz, integer) from public, anon;
grant execute on function public.friend_board(text, text) to authenticated;
grant execute on function public.person_posts(uuid, timestamptz, integer) to authenticated;
