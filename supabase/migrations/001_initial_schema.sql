-- Apex initial schema
-- Requires: pgcrypto (gen_random_uuid), postgis (geography / geometry)

create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- trails
-- ---------------------------------------------------------------------------
create table public.trails (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  distance_km numeric(8, 2) not null check (distance_km > 0),
  elevation_gain_m integer not null check (elevation_gain_m >= 0),
  peak_elevation_m integer not null check (peak_elevation_m >= 0),
  -- GeoJSON LineString stored as geography for trail path / PostGIS queries
  path geography(LineString, 4326) not null,
  -- Dense elevation samples keyed by distance along path (meters)
  elevation_profile jsonb not null default '[]'::jsonb
    check (jsonb_typeof(elevation_profile) = 'array'),
  avg_moving_time_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trails_path_gix on public.trails using gist (path);
create index trails_region_idx on public.trails (region);
create index trails_name_trgm_idx on public.trails using gin (name gin_trgm_ops);

comment on column public.trails.elevation_profile is
  'Array of { distance_m: number, elevation_m: number } samples for sparklines';

-- ---------------------------------------------------------------------------
-- hike_logs
-- ---------------------------------------------------------------------------
create table public.hike_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trail_id uuid not null references public.trails (id) on delete restrict,
  duration_seconds integer not null check (duration_seconds > 0),
  photos text[] not null default '{}',
  notes text,
  -- Optional recorded track for this outing (may differ from canonical trail)
  recorded_path geography(LineString, 4326),
  created_at timestamptz not null default now()
);

create index hike_logs_user_idx on public.hike_logs (user_id, created_at desc);
create index hike_logs_trail_idx on public.hike_logs (trail_id);

-- ---------------------------------------------------------------------------
-- trail_rankings (per-user Elo + ordinal rank)
-- ---------------------------------------------------------------------------
create table public.trail_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trail_id uuid not null references public.trails (id) on delete cascade,
  elo_rating numeric(10, 2) not null default 1000.00,
  rank_score numeric(10, 4) not null default 1000.0000,
  ordinal_rank integer,
  comparison_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, trail_id)
);

create index trail_rankings_user_rank_idx
  on public.trail_rankings (user_id, rank_score desc);

-- ---------------------------------------------------------------------------
-- pairwise_comparisons (audit trail for binary-insertion ranking)
-- ---------------------------------------------------------------------------
create table public.pairwise_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  winner_trail_id uuid not null references public.trails (id) on delete cascade,
  loser_trail_id uuid not null references public.trails (id) on delete cascade,
  context_log_id uuid references public.hike_logs (id) on delete set null,
  created_at timestamptz not null default now(),
  check (winner_trail_id <> loser_trail_id)
);

create index pairwise_user_idx on public.pairwise_comparisons (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.trails enable row level security;
alter table public.hike_logs enable row level security;
alter table public.trail_rankings enable row level security;
alter table public.pairwise_comparisons enable row level security;

-- Trails are readable by authenticated users; writes via service / curated seed
create policy "trails_select_authenticated"
  on public.trails for select
  to authenticated
  using (true);

create policy "hike_logs_own_all"
  on public.hike_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trail_rankings_own_all"
  on public.trail_rankings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pairwise_own_all"
  on public.pairwise_comparisons for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for hike photos (create via dashboard or storage API)
-- insert into storage.buckets (id, name, public) values ('hike-photos', 'hike-photos', false);
