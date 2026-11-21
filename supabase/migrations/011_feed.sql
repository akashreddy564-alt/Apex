-- Feed (plan 3, step 4): posts, likes, comments, and what friends may see.
-- Safe to run more than once. Needs 010 (friends).
--
-- A post is made when a hike is ranked. It keeps the score from that moment;
-- your Rankings keep moving. Only you and your friends can see a post, its
-- likes and its comments. Friends never read hike_logs directly: the feed
-- function returns just what a post shows, with the route's first and last
-- 300 m removed so nobody learns where you live.

-- ---------------------------------------------------------------------------
-- posts: one per hike log (the log id is the post id).
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key references public.hike_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trail_id uuid not null references public.trails (id) on delete cascade,
  bucket text not null check (bucket in ('loved', 'fine', 'disliked')),
  -- Score and bucket size when posted. The score shows only once the bucket
  -- had 3 or more hikes, as in Rankings.
  score numeric(4, 1),
  bucket_size integer not null default 1 check (bucket_size >= 1),
  hiked_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts_select_friends" on public.posts;
create policy "posts_select_friends"
  on public.posts for select
  to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

-- You post only your own hikes.
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.hike_logs l where l.id = posts.id and l.user_id = auth.uid())
  );

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.posts to authenticated;

-- Whether the signed-in person may see a post. Used by likes and comments.
create or replace function public.can_see_post(post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p
    where p.id = post
      and (p.user_id = auth.uid() or public.are_friends(auth.uid(), p.user_id))
  );
$$;

-- ---------------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "post_likes_select_visible" on public.post_likes;
create policy "post_likes_select_visible"
  on public.post_likes for select
  to authenticated
  using (public.can_see_post(post_id));

drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own"
  on public.post_likes for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_see_post(post_id));

drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own"
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.post_likes to authenticated;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments_select_visible" on public.post_comments;
create policy "post_comments_select_visible"
  on public.post_comments for select
  to authenticated
  using (public.can_see_post(post_id));

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own"
  on public.post_comments for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_see_post(post_id));

-- You can delete your own comments, and any comment on your own post.
drop policy if exists "post_comments_delete_own_or_post_owner" on public.post_comments;
create policy "post_comments_delete_own_or_post_owner"
  on public.post_comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

grant select, insert, delete on public.post_comments to authenticated;

-- ---------------------------------------------------------------------------
-- trim_route: a line without its first and last `meters`, as GeoJSON.
-- Lines too short to trim come back null, so no route is shown at all.
-- ---------------------------------------------------------------------------
create or replace function public.trim_route(path geography, meters double precision default 300)
returns jsonb
language sql
immutable
set search_path = public, extensions
as $$
  select case
    when path is null then null
    when st_length(path) <= meters * 2 + 100 then null
    else st_asgeojson(
      st_linesubstring(
        path::geometry,
        meters / st_length(path),
        1 - meters / st_length(path)
      )
    )::jsonb
  end;
$$;

-- ---------------------------------------------------------------------------
-- feed_posts: your posts and your friends' posts, newest first, with exactly
-- what a post card shows. `only_post` returns one post (the full hike view).
-- ---------------------------------------------------------------------------
create or replace function public.feed_posts(
  before timestamptz default null,
  max_rows integer default 20,
  only_post uuid default null
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
    -- Your own route and catalog lines are public anyway; the trim protects
    -- recordings and self-named trails, which start where you started.
    case
      when l.recorded_path is not null then public.trim_route(l.recorded_path)
      when t.source = 'user' then public.trim_route(t.path)
      when t.path is not null then st_asgeojson(t.path)::jsonb
    end,
    (select count(*)::integer from public.post_likes k where k.post_id = p.id),
    (select count(*)::integer from public.post_comments c where c.post_id = p.id),
    exists (select 1 from public.post_likes k where k.post_id = p.id and k.user_id = auth.uid()),
    p.user_id = auth.uid()
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  join public.hike_logs l on l.id = p.id
  join public.trails t on t.id = p.trail_id
  where auth.uid() is not null
    and (p.user_id = auth.uid() or public.are_friends(auth.uid(), p.user_id))
    and (only_post is null or p.id = only_post)
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

revoke all on function public.can_see_post(uuid) from public, anon;
revoke all on function public.trim_route(geography, double precision) from public, anon;
revoke all on function public.feed_posts(timestamptz, integer, uuid) from public, anon;
grant execute on function public.can_see_post(uuid) to authenticated;
grant execute on function public.trim_route(geography, double precision) to authenticated;
grant execute on function public.feed_posts(timestamptz, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Photos: friends may read the photos in a friend's folder. The bucket stays
-- private; the app asks for short-lived signed links as it does for your own.
-- ---------------------------------------------------------------------------
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
  return public.are_friends(auth.uid(), folder::uuid);
end;
$$;

revoke all on function public.photo_owner_is_friend(text) from public, anon;
grant execute on function public.photo_owner_is_friend(text) to authenticated;

drop policy if exists "hike_photos_friends_select" on storage.objects;
create policy "hike_photos_friends_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'hike-photos' and public.photo_owner_is_friend(name));
