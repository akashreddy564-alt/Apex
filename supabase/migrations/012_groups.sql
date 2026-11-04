-- Groups and leaderboards (plan 3, step 5).
-- Safe to run more than once. Needs 011 (feed).
--
-- A group is joined with its 6-character code (also inside its invite link).
-- Members see each other's name, totals and place only: never hikes, routes,
-- photos, scores or rankings. Leaderboards count recorded hikes only, using
-- the climb the phone measured, capped at 1.5x a catalog trail's gain.
-- A group's week, month and year run in the group's time zone, set from the
-- creator's phone, so every member sees the same standings.
--
-- The app never writes these tables directly; every change goes through the
-- functions below, which check who is asking.

-- ---------------------------------------------------------------------------
-- The climb the phone measured on a recorded hike.
-- ---------------------------------------------------------------------------
alter table public.hike_logs
  add column if not exists elevation_gain_m integer
    check (elevation_gain_m is null or elevation_gain_m >= 0);

-- New columns go at the end so `create or replace view` keeps the old ones.
create or replace view public.hike_logs_api
with (security_invoker = true) as
select
  id,
  user_id,
  trail_id,
  duration_seconds,
  photos,
  notes,
  case
    when recorded_path is null then null
    else st_asgeojson(recorded_path)::jsonb
  end as recorded_path,
  created_at,
  distance_km,
  terrain,
  conditions,
  difficulty,
  hike_type,
  elevation_gain_m
from public.hike_logs;

grant select on public.hike_logs_api to authenticated;

-- ---------------------------------------------------------------------------
-- groups and group_members
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null default 'bone'
    check (color in ('bone', 'green', 'amber', 'red', 'blue', 'slate')),
  -- No 0/O or 1/I, so a code read aloud can't be misheard.
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  -- Null once the creator deletes their account and nobody took over.
  owner_id uuid references public.profiles (id) on delete set null,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists hike_logs_user_created_idx on public.hike_logs (user_id, created_at);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members where group_id = g and user_id = auth.uid()
  );
$$;

drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

drop policy if exists "group_members_select_members" on public.group_members;
create policy "group_members_select_members"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;

-- ---------------------------------------------------------------------------
-- period_start: the start of this week (Monday), month or year in `tz`.
-- ---------------------------------------------------------------------------
create or replace function public.period_start(tz text, period text, at timestamptz default now())
returns timestamptz
language sql
stable
set search_path = public
as $$
  select date_trunc(
    case period when 'month' then 'month' when 'year' then 'year' else 'week' end,
    at at time zone tz
  ) at time zone tz;
$$;

-- ---------------------------------------------------------------------------
-- group_hikes (internal): members' recorded hikes in a window, with the gain
-- and distance that count.
-- ---------------------------------------------------------------------------
create or replace function public.group_hikes(g uuid, since timestamptz, until timestamptz)
returns table (user_id uuid, log_id uuid, trail_id uuid, gain_m integer, km numeric, hiked_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.user_id,
    l.id,
    l.trail_id,
    case
      when t.source = 'catalog' and t.elevation_gain_m is not null
        then least(coalesce(l.elevation_gain_m, 0), round(t.elevation_gain_m * 1.5)::integer)
      else coalesce(l.elevation_gain_m, 0)
    end,
    coalesce(l.distance_km, round((st_length(l.recorded_path) / 1000)::numeric, 2)),
    l.created_at
  from public.group_members m
  join public.hike_logs l on l.user_id = m.user_id
  join public.trails t on t.id = l.trail_id
  where m.group_id = g
    and l.recorded_path is not null
    and l.created_at >= since
    and l.created_at < until;
$$;

-- ---------------------------------------------------------------------------
-- group_places (internal): every member's place by gain in a window.
-- ---------------------------------------------------------------------------
create or replace function public.group_places(g uuid, since timestamptz, until timestamptz)
returns table (user_id uuid, gain_m integer, hikes integer, km numeric, place integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    coalesce(sum(h.gain_m), 0)::integer,
    count(h.log_id)::integer,
    coalesce(sum(h.km), 0),
    rank() over (order by coalesce(sum(h.gain_m), 0) desc)::integer
  from public.group_members m
  left join public.group_hikes(g, since, until) h on h.user_id = m.user_id
  where m.group_id = g
  group by m.user_id;
$$;

-- ---------------------------------------------------------------------------
-- new_group_code (internal)
-- ---------------------------------------------------------------------------
create or replace function public.new_group_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * 32)::integer, 1), '')
      into candidate
      from generate_series(1, 6);
    exit when not exists (select 1 from public.groups where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_group: you become its owner and first member. Returns its id.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(group_name text, group_color text default 'bone', tz text default 'UTC')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  zone text := coalesce(nullif(btrim(tz), ''), 'UTC');
  new_id uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Pick a username first';
  end if;
  if not exists (select 1 from pg_timezone_names where name = zone) then zone := 'UTC'; end if;
  if (select count(*) from public.group_members where user_id = uid) >= 20 then
    raise exception 'You''re in 20 groups already. Leave one first.';
  end if;

  insert into public.groups (name, color, code, owner_id, time_zone)
  values (btrim(group_name), coalesce(group_color, 'bone'), public.new_group_code(), uid, zone)
  returning id into new_id;

  insert into public.group_members (group_id, user_id) values (new_id, uid);
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_group: joins by code. Returns the group's id (also if already in it).
-- ---------------------------------------------------------------------------
create or replace function public.join_group(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.groups%rowtype;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Pick a username first';
  end if;

  select * into target from public.groups
  where code = upper(regexp_replace(coalesce(join_code, ''), '[^A-Za-z0-9]', '', 'g'))
  for update;
  if not found then raise exception 'No group has that code'; end if;

  if exists (select 1 from public.group_members where group_id = target.id and user_id = uid) then
    return target.id;
  end if;
  if (select count(*) from public.group_members where group_id = target.id) >= 50 then
    raise exception 'That group is full (50 people)';
  end if;
  if (select count(*) from public.group_members where user_id = uid) >= 20 then
    raise exception 'You''re in 20 groups already. Leave one first.';
  end if;

  insert into public.group_members (group_id, user_id) values (target.id, uid);
  return target.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_group: an owner who leaves hands the group to its longest member.
-- The last person out deletes it.
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(g uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  heir uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from public.group_members where group_id = g and user_id = uid;

  select user_id into heir from public.group_members
  where group_id = g order by joined_at, user_id limit 1;

  if heir is null then
    delete from public.groups where id = g;
  else
    update public.groups set owner_id = heir
    where id = g and (owner_id = uid or owner_id is null);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_group_member: the owner removes someone.
-- ---------------------------------------------------------------------------
create or replace function public.remove_group_member(g uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.groups where id = g and owner_id = uid) then
    raise exception 'Only the group''s creator can remove people';
  end if;
  if member = uid then raise exception 'Leave the group instead'; end if;
  delete from public.group_members where group_id = g and user_id = member;
end;
$$;

-- ---------------------------------------------------------------------------
-- my_groups: your groups with your place this week, and your place as of the
-- start of today (null on the week's first day, or when nobody had climbed
-- yet), so the app can show up or down.
-- ---------------------------------------------------------------------------
create or replace function public.my_groups()
returns table (
  id uuid,
  name text,
  color text,
  code text,
  is_owner boolean,
  member_count integer,
  place integer,
  previous_place integer,
  week_gain_m integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gr.id,
    gr.name,
    gr.color,
    gr.code,
    gr.owner_id = auth.uid(),
    (select count(*)::integer from public.group_members x where x.group_id = gr.id),
    now_place.place,
    case
      when public.period_start(gr.time_zone, 'week') = date_trunc('day', now() at time zone gr.time_zone) at time zone gr.time_zone
        then null
      else before_place.place
    end,
    now_place.gain_m
  from public.group_members m
  join public.groups gr on gr.id = m.group_id
  left join lateral (
    select p.place, p.gain_m
    from public.group_places(gr.id, public.period_start(gr.time_zone, 'week'), 'infinity') p
    where p.user_id = auth.uid()
  ) now_place on true
  left join lateral (
    -- Everyone tied at zero isn't a place worth comparing against.
    select case when max(p.gain_m) over () > 0 then p.place end as place, p.user_id
    from public.group_places(
      gr.id,
      public.period_start(gr.time_zone, 'week'),
      date_trunc('day', now() at time zone gr.time_zone) at time zone gr.time_zone
    ) p
  ) before_place on before_place.user_id = auth.uid()
  where m.user_id = auth.uid()
  order by m.joined_at;
$$;

-- ---------------------------------------------------------------------------
-- group_board: the leaderboard for 'week', 'month' or 'year'.
-- ---------------------------------------------------------------------------
create or replace function public.group_board(g uuid, period text default 'week')
returns table (
  user_id uuid,
  username text,
  display_name text,
  gain_m integer,
  hikes integer,
  km numeric,
  place integer,
  is_me boolean,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    pr.username,
    pr.display_name,
    p.gain_m,
    p.hikes,
    p.km,
    p.place,
    p.user_id = auth.uid(),
    p.user_id = gr.owner_id
  from public.groups gr
  cross join lateral public.group_places(gr.id, public.period_start(gr.time_zone, period), 'infinity') p
  join public.profiles pr on pr.id = p.user_id
  where gr.id = g
    and public.is_group_member(g)
  order by p.place, pr.display_name;
$$;

-- ---------------------------------------------------------------------------
-- group_summary: the group page's headline and stat cards. Group favorite
-- and taste match read rankings but return only a trail name or a percent.
-- ---------------------------------------------------------------------------
create or replace function public.group_summary(g uuid, period text default 'week')
returns table (
  total_gain_m integer,
  total_hikes integer,
  total_km numeric,
  top_climber text,
  top_climber_gain_m integer,
  longest_day_name text,
  longest_day_km numeric,
  favorite_trail_id uuid,
  favorite_trail_name text,
  favorite_rankers integer,
  taste_match_name text,
  taste_match_percent integer
)
language sql
stable
security definer
set search_path = public
as $$
  with gr as (
    select * from public.groups where id = g and public.is_group_member(g)
  ),
  hikes as (
    select h.* from gr, public.group_hikes(gr.id, public.period_start(gr.time_zone, period), 'infinity') h
  ),
  climbers as (
    select h.user_id, sum(h.gain_m)::integer as gain from hikes h group by h.user_id
  ),
  top as (
    select pr.display_name, c.gain
    from climbers c join public.profiles pr on pr.id = c.user_id
    where c.gain > 0
    order by c.gain desc, pr.display_name
    limit 1
  ),
  days as (
    select h.user_id, sum(h.km) as km
    from hikes h, gr
    group by h.user_id, (h.hiked_at at time zone gr.time_zone)::date
  ),
  longest as (
    select pr.display_name, d.km
    from days d join public.profiles pr on pr.id = d.user_id
    where d.km > 0
    order by d.km desc, pr.display_name
    limit 1
  ),
  favorite as (
    select r.trail_id, t.name, count(distinct r.user_id)::integer as rankers
    from public.trail_rankings r
    join public.group_members m on m.user_id = r.user_id and m.group_id = g
    join public.trails t on t.id = r.trail_id
    where exists (select 1 from gr) and r.score is not null
    group by r.trail_id, t.name
    having count(distinct r.user_id) >= 2
    order by avg(r.score) desc, count(distinct r.user_id) desc, t.name
    limit 1
  ),
  mine as (
    select r.trail_id, r.hike_type, r.score from public.trail_rankings r
    where r.user_id = auth.uid() and r.score is not null and exists (select 1 from gr)
  ),
  shared as (
    select r.user_id, r.trail_id, r.hike_type, r.score as theirs, mine.score as mine
    from public.trail_rankings r
    join public.group_members m on m.user_id = r.user_id and m.group_id = g
    join mine on mine.trail_id = r.trail_id and mine.hike_type = r.hike_type
    where r.user_id <> auth.uid() and r.score is not null
  ),
  pairs as (
    select a.user_id,
      sum(case when sign(a.mine - b.mine) = sign(a.theirs - b.theirs) then 1 else 0 end) as agree,
      count(*) as total,
      (select count(*) from shared s where s.user_id = a.user_id) as shared_count
    from shared a
    join shared b
      on b.user_id = a.user_id
     and (a.trail_id, a.hike_type) < (b.trail_id, b.hike_type)
    where a.mine <> b.mine and a.theirs <> b.theirs
    group by a.user_id
  ),
  taste as (
    select pr.display_name, round(100.0 * p.agree / p.total)::integer as pct
    from pairs p join public.profiles pr on pr.id = p.user_id
    where p.shared_count >= 3 and p.total > 0
    order by p.agree::numeric / p.total desc, p.total desc, pr.display_name
    limit 1
  )
  select
    coalesce((select sum(gain_m) from hikes), 0)::integer,
    (select count(*) from hikes)::integer,
    coalesce((select sum(km) from hikes), 0),
    (select display_name from top),
    (select gain from top),
    (select display_name from longest),
    (select km from longest),
    (select trail_id from favorite),
    (select name from favorite),
    (select rankers from favorite),
    (select display_name from taste),
    (select pct from taste)
  from gr;
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.period_start(text, text, timestamptz) from public, anon;
revoke all on function public.group_hikes(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.group_places(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.new_group_code() from public, anon, authenticated;
revoke all on function public.create_group(text, text, text) from public, anon;
revoke all on function public.join_group(text) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
revoke all on function public.my_groups() from public, anon;
revoke all on function public.group_board(uuid, text) from public, anon;
revoke all on function public.group_summary(uuid, text) from public, anon;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.period_start(text, text, timestamptz) to authenticated;
grant execute on function public.create_group(text, text, text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.my_groups() to authenticated;
grant execute on function public.group_board(uuid, text) to authenticated;
grant execute on function public.group_summary(uuid, text) to authenticated;
