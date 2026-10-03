-- Distance, gain, and peak can be unknown. A missing value is null, not 0.
-- Non-null values keep the original checks.

alter table public.trails
  alter column distance_km drop not null,
  alter column elevation_gain_m drop not null,
  alter column peak_elevation_m drop not null;

alter table public.trails drop constraint if exists trails_distance_km_check;
alter table public.trails drop constraint if exists trails_elevation_gain_m_check;
alter table public.trails drop constraint if exists trails_peak_elevation_m_check;

alter table public.trails
  add constraint trails_distance_km_check check (distance_km is null or distance_km > 0),
  add constraint trails_elevation_gain_m_check check (elevation_gain_m is null or elevation_gain_m >= 0),
  add constraint trails_peak_elevation_m_check check (peak_elevation_m is null or peak_elevation_m >= 0);
