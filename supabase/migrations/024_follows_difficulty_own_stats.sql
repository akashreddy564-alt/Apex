-- 024: following, friends' rankings and difficulty on a trail, and posts that
-- show the hike's own numbers. Spec:
-- docs/superpowers/specs/2026-11-25-own-stats-friend-rankings-follow-design.md
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Follows: anyone can follow anyone (not across a block). Friends stay for the
-- friends board, groups and friends' trails; following only opens posts.
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id, created_at desc);

alter table public.follows enable row level security;
-- You see the rows you're part of; counts and lists for others go through functions.
drop policy if exists "follows_select_own" on public.follows;
create policy "follows_select_own" on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());
revoke all on public.follows from anon, authenticated;
grant select on public.follows to authenticated;

insert into apex_private.rate_limits (action, max_count, per)
values ('follow', 60, interval '1 hour')
on conflict (action) do nothing;

drop trigger if exists follows_rate on public.follows;
create trigger follows_rate before insert on public.follows
  for each row execute function apex_private.limit_insert('follow');

-- Notifications learn "follow".
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array['friend_request', 'friend_accepted', 'group_join', 'like', 'comment', 'passed', 'follow']));

create or replace function public.follows_person(viewer uuid, person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.follows f where f.follower_id = viewer and f.followee_id = person);
$$;

-- The one rule for posts (and their likes, comments and photos): yours, a
-- friend's, or someone you follow, never across a block.
create or replace function public.sees_posts(viewer uuid, author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select viewer is not null and author is not null and (
    viewer = author
    or (
      (public.are_friends(viewer, author) or public.follows_person(viewer, author))
      and not public.is_blocked_between(viewer, author)
    )
  );
$$;

create or replace function public.follow_person(person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if person is null or person = uid then raise exception 'You can''t follow yourself'; end if;
  if not exists (select 1 from public.profiles where id = person) then raise exception 'No such person'; end if;
  if public.is_blocked_between(uid, person) then raise exception 'You can''t follow this person'; end if;
  insert into public.follows (follower_id, followee_id) values (uid, person) on conflict do nothing;
  if found then
    perform public.notify(person, 'follow', uid, null, null, null, 'follow:' || uid || ':' || person);
  end if;
end;
$$;

create or replace function public.unfollow_person(person uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.follows where follower_id = auth.uid() and followee_id = person;
$$;

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
    public.follows_person(person, auth.uid());
$$;

-- People who follow `person` (kind 'followers') or whom `person` follows
-- ('following'), newest first, without anyone blocked either way.
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
    and (case when kind = 'followers' then f.followee_id else f.follower_id end) = person
    and not public.is_blocked_between(auth.uid(), pr.id)
  order by f.created_at desc
  limit least(greatest(coalesce(max_rows, 100), 1), 200);
$$;

-- Blocking ends follows both ways (block_user already ends friendships).
create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if target = uid then raise exception 'You can''t block yourself'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
  delete from public.friendships
  where (requester_id = uid and addressee_id = target) or (requester_id = target and addressee_id = uid);
  delete from public.follows
  where (follower_id = uid and followee_id = target) or (follower_id = target and followee_id = uid);
  delete from public.notifications
  where (user_id = uid and actor_id = target) or (user_id = target and actor_id = uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- Posts, likes, comments and photos follow sees_posts.
-- ---------------------------------------------------------------------------
drop policy if exists "posts_select_friends" on public.posts;
drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible" on public.posts for select to authenticated
  using (public.sees_posts(auth.uid(), user_id));

create or replace function public.can_see_post(post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.posts p where p.id = post and public.sees_posts(auth.uid(), p.user_id));
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
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.sees_posts(auth.uid(), folder::uuid);
end;
$$;

-- The feed: yours, friends' and followed people's posts, with the hike's own
-- distance and climb (catalog numbers are guesses; never borrowed).
create or replace function public.feed_posts(
  before timestamptz default null,
  max_rows integer default 20,
  only_post uuid default null
)
returns table (
  post_id uuid, author_id uuid, username text, display_name text, trail_id uuid, trail_name text,
  region text, bucket text, score numeric, bucket_size integer, hiked_at timestamptz, posted_at timestamptz,
  duration_seconds integer, distance_km numeric, elevation_gain_m integer, notes text, photos text[],
  route jsonb, like_count integer, comment_count integer, liked boolean, is_mine boolean
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
    p.user_id = auth.uid()
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

create or replace function public.person_posts(
  person uuid,
  before timestamptz default null,
  max_rows integer default 20
)
returns table (
  post_id uuid, author_id uuid, username text, display_name text, trail_id uuid, trail_name text,
  region text, bucket text, score numeric, bucket_size integer, hiked_at timestamptz, posted_at timestamptz,
  duration_seconds integer, distance_km numeric, elevation_gain_m integer, notes text, photos text[],
  route jsonb, like_count integer, comment_count integer, liked boolean, is_mine boolean
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
    p.user_id = auth.uid()
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
-- Difficulty: the hiker's own rating, 1 Easy … 5 Very strenuous.
-- ---------------------------------------------------------------------------
alter table public.trail_rankings add column if not exists difficulty smallint;
alter table public.trail_rankings drop constraint if exists trail_rankings_difficulty_check;
alter table public.trail_rankings add constraint trail_rankings_difficulty_check
  check (difficulty is null or difficulty between 1 and 5);

-- Friends and people you follow who ranked this trail, best first. Rankings
-- stay private otherwise.
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
    and r.user_id <> auth.uid()
    and (public.are_friends(auth.uid(), r.user_id) or public.follows_person(auth.uid(), r.user_id))
    and not public.is_blocked_between(auth.uid(), r.user_id)
  order by r.score desc, r.updated_at desc
  limit 50;
$$;

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------
revoke all on function public.follows_person(uuid, uuid) from public, anon;
revoke all on function public.sees_posts(uuid, uuid) from public, anon;
revoke all on function public.follow_person(uuid) from public, anon;
revoke all on function public.unfollow_person(uuid) from public, anon;
revoke all on function public.follow_counts(uuid) from public, anon;
revoke all on function public.follow_list(uuid, text, integer) from public, anon;
revoke all on function public.trail_people_rankings(uuid) from public, anon;
grant execute on function public.follows_person(uuid, uuid) to authenticated;
grant execute on function public.sees_posts(uuid, uuid) to authenticated;
grant execute on function public.follow_person(uuid) to authenticated;
grant execute on function public.unfollow_person(uuid) to authenticated;
grant execute on function public.follow_counts(uuid) to authenticated;
grant execute on function public.follow_list(uuid, text, integer) to authenticated;
grant execute on function public.trail_people_rankings(uuid) to authenticated;
