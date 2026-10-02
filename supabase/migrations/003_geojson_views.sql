-- Read models that return GeoJSON instead of EWKB.
-- security_invoker keeps the base-table RLS policies in force.

create or replace view public.trails_api
with (security_invoker = true) as
select
  id,
  name,
  region,
  distance_km,
  elevation_gain_m,
  peak_elevation_m,
  st_asgeojson(path)::jsonb as path,
  elevation_profile,
  avg_moving_time_seconds,
  created_at,
  updated_at
from public.trails;

grant select on public.trails_api to authenticated;

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
  created_at
from public.hike_logs;

grant select on public.hike_logs_api to authenticated;
