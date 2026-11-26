-- 026: who you hiked with, gear, and what hikers report on a trail. Spec:
-- docs/superpowers/specs/2026-11-25-hike-details-tags-gear-design.md
--
-- Safe to run more than once.

alter table public.hike_logs add column if not exists companions uuid[] not null default '{}';
alter table public.hike_logs add column if not exists gear text[] not null default '{}';
alter table public.hike_logs drop constraint if exists hike_logs_companions_check;
alter table public.hike_logs add constraint hike_logs_companions_check check (cardinality(companions) <= 10);
alter table public.hike_logs drop constraint if exists hike_logs_gear_check;
alter table public.hike_logs add constraint hike_logs_gear_check check (cardinality(gear) <= 12);

-- Companions: only people you're friends with or follow, never yourself, never
-- across a block. Gear: trimmed, 60 characters at most, no empties, no repeats.
create or replace function apex_private.clean_hike_details()
returns trigger
language plpgsql
security definer
set search_path = public, apex_private
as $$
begin
  new.companions := coalesce(array(
    select distinct c
    from unnest(coalesce(new.companions, '{}')) as c
    where c <> new.user_id
      and (
        public.are_friends(new.user_id, c)
        or exists (select 1 from public.follows f where f.follower_id = new.user_id and f.followee_id = c)
      )
      and not public.is_blocked_between(new.user_id, c)
    limit 10
  ), '{}');
  new.gear := coalesce(array(
    select distinct left(btrim(g), 60)
    from unnest(coalesce(new.gear, '{}')) as g
    where btrim(g) <> ''
    limit 12
  ), '{}');
  return new;
end;
$$;

drop trigger if exists hike_logs_clean_details on public.hike_logs;
create trigger hike_logs_clean_details
  before insert or update of companions, gear on public.hike_logs
  for each row execute function apex_private.clean_hike_details();

-- "tagged you on a hike", once per person per post.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['friend_request', 'friend_accepted', 'group_join', 'like', 'comment', 'passed', 'follow', 'tagged']));

create or replace function apex_private.notify_tagged(author uuid, post uuid, people uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  person uuid;
begin
  foreach person in array coalesce(people, '{}') loop
    perform public.notify(person, 'tagged', author, post, null, null, 'tagged:' || post || ':' || person);
  end loop;
end;
$$;

create or replace function apex_private.on_post_tag()
returns trigger
language plpgsql
security definer
set search_path = public, apex_private
as $$
begin
  perform apex_private.notify_tagged(
    new.user_id, new.id, (select l.companions from public.hike_logs l where l.id = new.id)
  );
  return new;
end;
$$;

drop trigger if exists posts_notify_tagged on public.posts;
create trigger posts_notify_tagged after insert on public.posts
  for each row execute function apex_private.on_post_tag();

create or replace function apex_private.on_companions_change()
returns trigger
language plpgsql
security definer
set search_path = public, apex_private
as $$
begin
  if exists (select 1 from public.posts p where p.id = new.id) then
    perform apex_private.notify_tagged(
      new.user_id, new.id,
      array(select c from unnest(new.companions) c where not (c = any (coalesce(old.companions, '{}'))))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists hike_logs_notify_tagged on public.hike_logs;
create trigger hike_logs_notify_tagged after update of companions on public.hike_logs
  for each row execute function apex_private.on_companions_change();

-- ---------------------------------------------------------------------------
-- Posts carry terrain, conditions, gear and who you hiked with. The return
-- type changes, so the functions are dropped and made again.
-- ---------------------------------------------------------------------------
create or replace function public.post_companions(people uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'username', pr.username, 'display_name', pr.display_name)
                            order by pr.display_name), '[]'::jsonb)
  from public.profiles pr
  where pr.id = any (coalesce(people, '{}'))
    and not public.is_blocked_between(auth.uid(), pr.id);
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
  terrain text[], conditions text[], gear text[], companions jsonb
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
    coalesce(l.terrain, '{}'), coalesce(l.conditions, '{}'), l.gear, public.post_companions(l.companions)
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
  terrain text[], conditions text[], gear text[], companions jsonb
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
    coalesce(l.terrain, '{}'), coalesce(l.conditions, '{}'), l.gear, public.post_companions(l.companions)
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

-- What hikers reported on a trail in the last year: chip, kind, how many hikers. Never who.
create or replace function public.trail_conditions(trail uuid)
returns table (chip text, kind text, hikers integer)
language sql
stable
security definer
set search_path = public
as $$
  select chip, kind, count(distinct user_id)::integer
  from (
    select l.user_id, unnest(coalesce(l.terrain, '{}')) as chip, 'terrain' as kind
    from public.hike_logs l
    where l.trail_id = trail and l.created_at > now() - interval '365 days'
    union all
    select l.user_id, unnest(coalesce(l.conditions, '{}')), 'conditions'
    from public.hike_logs l
    where l.trail_id = trail and l.created_at > now() - interval '365 days'
  ) reports
  where auth.uid() is not null and length(chip) between 1 and 20
  group by chip, kind
  order by count(distinct user_id) desc, chip
  limit 12;
$$;

revoke all on function public.post_companions(uuid[]) from public, anon;
revoke all on function public.feed_posts(timestamptz, integer, uuid) from public, anon;
revoke all on function public.person_posts(uuid, timestamptz, integer) from public, anon;
revoke all on function public.trail_conditions(uuid) from public, anon;
revoke all on function apex_private.notify_tagged(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.post_companions(uuid[]) to authenticated;
grant execute on function public.feed_posts(timestamptz, integer, uuid) to authenticated;
grant execute on function public.person_posts(uuid, timestamptz, integer) to authenticated;
grant execute on function public.trail_conditions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Review fixes (2026-11-25) for 010 / 024.
-- ---------------------------------------------------------------------------

-- are_friends answered for any pair (granted to authenticated in 010), so anyone
-- could map who is friends with whom, even across a block. Every caller passes
-- auth.uid() as one side; now it answers only then.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() in (a, b)
    and exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
    );
$$;

-- Counts and lists stop at a block, both ways.
create or replace function public.follow_counts(person uuid)
returns table (followers integer, following integer, i_follow boolean, follows_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.follows f where f.followee_id = person
       and not public.is_blocked_between(auth.uid(), f.follower_id)),
    (select count(*)::integer from public.follows f where f.follower_id = person
       and not public.is_blocked_between(auth.uid(), f.followee_id)),
    public.follows_person(auth.uid(), person),
    public.follows_person(person, auth.uid())
  where auth.uid() is not null and not public.is_blocked_between(auth.uid(), person);
$$;

create or replace function public.follow_list(person uuid, kind text, max_rows integer default 100)
returns table (id uuid, username text, display_name text, i_follow boolean, followed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select pr.id, pr.username, pr.display_name, public.follows_person(auth.uid(), pr.id), f.created_at
  from public.follows f
  join public.profiles pr
    on pr.id = case when kind = 'followers' then f.follower_id else f.followee_id end
  where auth.uid() is not null
    and kind in ('followers', 'following')
    and not public.is_blocked_between(auth.uid(), person)
    and (case when kind = 'followers' then f.followee_id else f.follower_id end) = person
    and not public.is_blocked_between(auth.uid(), pr.id)
  order by f.created_at desc
  limit least(greatest(coalesce(max_rows, 100), 1), 200);
$$;

-- One row per person: the standard hike type only.
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
  select r.user_id, pr.username, pr.display_name, r.bucket, r.score, r.difficulty,
         public.are_friends(auth.uid(), r.user_id), r.updated_at
  from public.trail_rankings r
  join public.profiles pr on pr.id = r.user_id
  where auth.uid() is not null
    and r.trail_id = trail
    and r.hike_type = 'hike'
    and r.user_id <> auth.uid()
    and (public.are_friends(auth.uid(), r.user_id) or public.follows_person(auth.uid(), r.user_id))
    and not public.is_blocked_between(auth.uid(), r.user_id)
  order by r.score desc, r.updated_at desc
  limit 50;
$$;
