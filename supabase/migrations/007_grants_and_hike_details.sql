-- 007: explicit grants (Supabase stops auto-granting on new public tables
-- after Oct 30, 2026) and the optional past-hike detail columns.
-- Safe to run more than once. Expects 001–006 to have run first.

-- ---------------------------------------------------------------------------
-- Grants. RLS policies (001) still decide which rows each user can touch;
-- these only let the signed-in role reach the tables at all.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select on public.trails to authenticated;
grant select, insert, update, delete on public.hike_logs to authenticated;
grant select, insert, update, delete on public.trail_rankings to authenticated;
grant select, insert, update, delete on public.pairwise_comparisons to authenticated;

grant select on public.trails_api to authenticated;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Past-hike details (#17). The app keeps these locally today; the columns
-- let them sync once the client sends them.
-- ---------------------------------------------------------------------------
alter table public.hike_logs
  add column if not exists distance_km numeric(7, 2)
    check (distance_km is null or distance_km > 0),
  add column if not exists terrain text[] not null default '{}',
  add column if not exists conditions text[] not null default '{}',
  add column if not exists difficulty text,
  add column if not exists hike_type text;

-- New columns go at the end so `create or replace view` can keep the old ones.
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
  hike_type
from public.hike_logs;

grant select on public.hike_logs_api to authenticated;

-- New tables (accounts, friends, feed) get their own explicit grants in
-- their own migrations, with RLS enabled. No blanket default privileges.
