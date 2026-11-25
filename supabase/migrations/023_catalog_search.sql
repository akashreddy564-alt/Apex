-- 023: a big trail catalog, searched on the server.
--
-- The app used to pull every trail at sign-in and bundle the 23 curated ones.
-- Bulk catalog rows (scripts/catalog/bulk_extract.py, every named hiking trail
-- in a state) are too many for that, so the app now asks the server:
--   search_catalog  - by name or town, nearest first when a location is given
--   catalog_near    - trails that start or pass near a point (Finish matching)
--   catalog_trails  - full rows by id (a trail a friend hiked, a search pick)
-- All three read catalog rows only and work signed out (local mode).
--
-- Safe to run more than once.

-- Bulk rows carry their state (GA, CA ...). Curated rows leave it null.
alter table public.trails add column if not exists state text;

create extension if not exists pg_trgm;

create index if not exists trails_catalog_name_trgm
  on public.trails using gin (lower(name) gin_trgm_ops)
  where source = 'catalog';
create index if not exists trails_catalog_region_trgm
  on public.trails using gin (lower(region) gin_trgm_ops)
  where source = 'catalog';
create index if not exists trails_path_gix on public.trails using gist (path);

-- The view gains state at the end, so existing readers keep their columns.
-- It keeps reading as the caller, so trails RLS still applies through it.
create or replace view public.trails_api with (security_invoker = true) as
select
  id, name, region, distance_km, elevation_gain_m, peak_elevation_m,
  case when path is null then null else st_asgeojson(path)::jsonb end as path,
  elevation_profile, avg_moving_time_seconds, created_at, updated_at,
  source, owner_id, osm_ref, shape,
  case when trailhead is null then null else st_asgeojson(trailhead)::jsonb end as trailhead,
  state
from public.trails;
grant select on public.trails_api to authenticated;

-- ---------------------------------------------------------------------------
-- search_catalog: light rows for a result list. Pick one, then fetch it whole
-- with catalog_trails.
-- ---------------------------------------------------------------------------
create or replace function public.search_catalog(
  q text,
  near_lon double precision default null,
  near_lat double precision default null,
  lim integer default 30
)
returns table (
  id uuid,
  name text,
  region text,
  distance_km numeric,
  elevation_gain_m integer,
  trailhead jsonb,
  away_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with input as (
    select
      lower(left(btrim(coalesce(q, '')), 60)) as term,
      case
        when near_lon between -180 and 180 and near_lat between -90 and 90
        then st_setsrid(st_makepoint(near_lon, near_lat), 4326)::geography
      end as here,
      least(greatest(coalesce(lim, 30), 1), 50) as n
  )
  select
    t.id, t.name, t.region, t.distance_km, t.elevation_gain_m,
    case when t.trailhead is null then null else st_asgeojson(t.trailhead)::jsonb end,
    case when i.here is null or t.trailhead is null then null else st_distance(t.trailhead, i.here) end
  from public.trails t, input i
  where t.source = 'catalog'
    and length(i.term) >= 2
    and (
      lower(t.name) like '%' || i.term || '%'
      or lower(t.region) like '%' || i.term || '%'
      or (length(i.term) >= 4 and lower(t.name) % i.term)
    )
  order by
    (lower(t.name) = i.term) desc,
    (lower(t.name) like i.term || '%') desc,
    (lower(t.name) like '%' || i.term || '%') desc,
    case when i.here is null or t.trailhead is null then null else st_distance(t.trailhead, i.here) end asc nulls last,
    similarity(lower(t.name), i.term) desc,
    t.name
  limit (select n from input);
$$;

-- ---------------------------------------------------------------------------
-- catalog_near: whole rows for trails whose line passes within radius_m.
-- ---------------------------------------------------------------------------
create or replace function public.catalog_near(
  lon double precision,
  lat double precision,
  radius_m integer default 600,
  lim integer default 20
)
returns setof public.trails_api
language sql
stable
security definer
set search_path = public, extensions
as $$
  select v.*
  from public.trails t
  join public.trails_api v on v.id = t.id
  where t.source = 'catalog'
    and lon between -180 and 180 and lat between -90 and 90
    and st_dwithin(
      coalesce(t.path, t.trailhead),
      st_setsrid(st_makepoint(lon, lat), 4326)::geography,
      least(greatest(coalesce(radius_m, 600), 50), 5000)
    )
  order by st_distance(
    coalesce(t.trailhead, t.path),
    st_setsrid(st_makepoint(lon, lat), 4326)::geography
  )
  limit least(greatest(coalesce(lim, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- catalog_trails: whole catalog rows by id, up to 200 at a time.
-- ---------------------------------------------------------------------------
create or replace function public.catalog_trails(ids uuid[])
returns setof public.trails_api
language sql
stable
security definer
set search_path = public, extensions
as $$
  select v.*
  from public.trails_api v
  where v.source = 'catalog'
    and v.id = any (ids[1:200]);
$$;

revoke all on function public.search_catalog(text, double precision, double precision, integer) from public;
revoke all on function public.catalog_near(double precision, double precision, integer, integer) from public;
revoke all on function public.catalog_trails(uuid[]) from public;
grant execute on function public.search_catalog(text, double precision, double precision, integer) to anon, authenticated;
grant execute on function public.catalog_near(double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.catalog_trails(uuid[]) to anon, authenticated;
