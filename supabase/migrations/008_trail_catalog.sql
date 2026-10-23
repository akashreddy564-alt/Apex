-- 008: trail catalog and user-owned trails.
-- Catalog rows (owner_id null) come from supabase/seed/catalog_trails.sql.
-- A hike with no catalog match creates a trail owned by the hiker.
-- Safe to run more than once. Expects 001–007 to have run first.

alter table public.trails
  add column if not exists source text not null default 'catalog'
    check (source in ('catalog', 'user')),
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  -- OSM ways the catalog line was built from, e.g. 'way/123,456'.
  add column if not exists osm_ref text,
  add column if not exists shape text
    check (shape is null or shape in ('loop', 'out-and-back', 'point-to-point')),
  add column if not exists trailhead geography(Point, 4326);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trails_owner_matches_source'
      and conrelid = 'public.trails'::regclass
  ) then
    alter table public.trails
      add constraint trails_owner_matches_source
      check ((source = 'user') = (owner_id is not null));
  end if;
end $$;

-- A past hike logged without GPS has no line and no measured stats.
alter table public.trails alter column path drop not null;
alter table public.trails alter column distance_km drop not null;
alter table public.trails alter column elevation_gain_m drop not null;
alter table public.trails alter column peak_elevation_m drop not null;

create index if not exists trails_owner_idx on public.trails (owner_id);
create index if not exists trails_trailhead_gix on public.trails using gist (trailhead);

-- ---------------------------------------------------------------------------
-- RLS. Everyone signed in reads the catalog; a user trail is its owner's
-- alone (plan 3 widens this to friends). Only the owner writes their trails;
-- nobody writes catalog rows from the app.
-- ---------------------------------------------------------------------------
alter table public.trails enable row level security;

drop policy if exists "trails_select_authenticated" on public.trails;
drop policy if exists "trails_select_catalog_or_own" on public.trails;
create policy "trails_select_catalog_or_own"
  on public.trails for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "trails_insert_own" on public.trails;
create policy "trails_insert_own"
  on public.trails for insert
  to authenticated
  with check (owner_id = auth.uid() and source = 'user');

drop policy if exists "trails_update_own" on public.trails;
create policy "trails_update_own"
  on public.trails for update
  to authenticated
  using (owner_id = auth.uid() and source = 'user')
  with check (owner_id = auth.uid() and source = 'user');

drop policy if exists "trails_delete_own" on public.trails;
create policy "trails_delete_own"
  on public.trails for delete
  to authenticated
  using (owner_id = auth.uid() and source = 'user');

grant select, insert, update, delete on public.trails to authenticated;

-- New columns go at the end so `create or replace view` can keep the old ones.
create or replace view public.trails_api
with (security_invoker = true) as
select
  id,
  name,
  region,
  distance_km,
  elevation_gain_m,
  peak_elevation_m,
  case when path is null then null else st_asgeojson(path)::jsonb end as path,
  elevation_profile,
  avg_moving_time_seconds,
  created_at,
  updated_at,
  source,
  owner_id,
  osm_ref,
  shape,
  case when trailhead is null then null else st_asgeojson(trailhead)::jsonb end as trailhead
from public.trails;

grant select on public.trails_api to authenticated;
