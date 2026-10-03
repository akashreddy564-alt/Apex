-- Curated trails. Run with the SQL editor or service role after 001 and 003.
-- Authenticated clients can read these rows; they cannot insert trails.

insert into public.trails (
  id, name, region, distance_km, elevation_gain_m, peak_elevation_m,
  path, elevation_profile, avg_moving_time_seconds
) values
(
  'a0000000-0000-4000-8000-000000000001',
  'Mt. Diablo Summit',
  'East Bay, CA',
  12.40, 980, 1173,
  st_geogfromtext('SRID=4326;LINESTRING(-121.914 37.862, -121.905 37.871, -121.914 37.881)'),
  '[{"distance_m":0,"elevation_m":220},{"distance_m":1200,"elevation_m":340},{"distance_m":2400,"elevation_m":480},{"distance_m":3600,"elevation_m":610},{"distance_m":4800,"elevation_m":720},{"distance_m":6000,"elevation_m":850},{"distance_m":7200,"elevation_m":960},{"distance_m":8400,"elevation_m":1080},{"distance_m":9600,"elevation_m":1140},{"distance_m":10800,"elevation_m":1173},{"distance_m":12400,"elevation_m":1170}]'::jsonb,
  15120
),
(
  'a0000000-0000-4000-8000-000000000002',
  'East Peak via Matt Davis',
  'Mt. Tamalpais, CA',
  14.10, 760, 784,
  st_geogfromtext('SRID=4326;LINESTRING(-122.596 37.907, -122.58 37.92, -122.577 37.929)'),
  '[{"distance_m":0,"elevation_m":120},{"distance_m":1500,"elevation_m":210},{"distance_m":3000,"elevation_m":320},{"distance_m":4500,"elevation_m":410},{"distance_m":6000,"elevation_m":500},{"distance_m":7500,"elevation_m":590},{"distance_m":9000,"elevation_m":680},{"distance_m":11000,"elevation_m":740},{"distance_m":14100,"elevation_m":784}]'::jsonb,
  13680
),
(
  'a0000000-0000-4000-8000-000000000003',
  'Half Dome Cables',
  'Yosemite, CA',
  23.20, 1460, 2694,
  st_geogfromtext('SRID=4326;LINESTRING(-119.557 37.733, -119.53 37.746, -119.533 37.746)'),
  '[{"distance_m":0,"elevation_m":1220},{"distance_m":2000,"elevation_m":1380},{"distance_m":4000,"elevation_m":1520},{"distance_m":6000,"elevation_m":1680},{"distance_m":9000,"elevation_m":1900},{"distance_m":12000,"elevation_m":2100},{"distance_m":15000,"elevation_m":2280},{"distance_m":18000,"elevation_m":2450},{"distance_m":21000,"elevation_m":2620},{"distance_m":23200,"elevation_m":2694}]'::jsonb,
  33600
),
(
  'a0000000-0000-4000-8000-000000000004',
  'Skyline Loop',
  'Mt. Rainier, WA',
  8.90, 520, 2073,
  st_geogfromtext('SRID=4326;LINESTRING(-121.74 46.786, -121.73 46.79, -121.735 46.8)'),
  '[{"distance_m":0,"elevation_m":1640},{"distance_m":1000,"elevation_m":1720},{"distance_m":2500,"elevation_m":1850},{"distance_m":4000,"elevation_m":1960},{"distance_m":5500,"elevation_m":2040},{"distance_m":7000,"elevation_m":2073},{"distance_m":8900,"elevation_m":1980}]'::jsonb,
  10500
),
(
  'a0000000-0000-4000-8000-000000000005',
  'Angel Island Perimeter',
  'SF Bay, CA',
  9.60, 310, 240,
  st_geogfromtext('SRID=4326;LINESTRING(-122.435 37.86, -122.43 37.87, -122.44 37.865)'),
  '[{"distance_m":0,"elevation_m":10},{"distance_m":1200,"elevation_m":40},{"distance_m":2400,"elevation_m":90},{"distance_m":3600,"elevation_m":150},{"distance_m":4800,"elevation_m":200},{"distance_m":6000,"elevation_m":240},{"distance_m":7200,"elevation_m":180},{"distance_m":8400,"elevation_m":80},{"distance_m":9600,"elevation_m":15}]'::jsonb,
  7800
),
(
  'a0000000-0000-4000-8000-000000000006',
  'Mission Peak',
  'Fremont, CA',
  9.80, 650, 770,
  st_geogfromtext('SRID=4326;LINESTRING(-121.88 37.504, -121.88 37.512, -121.88 37.519)'),
  '[{"distance_m":0,"elevation_m":120},{"distance_m":1000,"elevation_m":220},{"distance_m":2500,"elevation_m":360},{"distance_m":4000,"elevation_m":480},{"distance_m":5500,"elevation_m":600},{"distance_m":7000,"elevation_m":700},{"distance_m":8500,"elevation_m":760},{"distance_m":9800,"elevation_m":770}]'::jsonb,
  9600
),
(
  'a0000000-0000-4000-8000-000000000007',
  'Lands End Coastal',
  'San Francisco, CA',
  5.20, 180, 95,
  st_geogfromtext('SRID=4326;LINESTRING(-122.51 37.78, -122.505 37.785, -122.51 37.79)'),
  '[{"distance_m":0,"elevation_m":20},{"distance_m":800,"elevation_m":45},{"distance_m":1600,"elevation_m":70},{"distance_m":2400,"elevation_m":95},{"distance_m":3200,"elevation_m":60},{"distance_m":4000,"elevation_m":35},{"distance_m":5200,"elevation_m":25}]'::jsonb,
  4500
)
on conflict (id) do nothing;
