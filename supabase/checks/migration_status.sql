-- Read-only. Shows which Apex migrations have run on this Supabase project
-- and whether the signed-in role can reach each table. Changes nothing.
select step, ok
from (values
  (1, '001 tables exist',                to_regclass('public.trail_rankings') is not null),
  (2, '002 hike-photos bucket',          exists (select 1 from storage.buckets where id = 'hike-photos')),
  (3, '003 GeoJSON views',               to_regclass('public.trails_api') is not null),
  (4, '004 delete-account function',     to_regprocedure('public.delete_own_account()') is not null),
  (5, '005 bucket ranking columns',      exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'trail_rankings' and column_name = 'bucket')),
  (6, '006 ranking score column',        exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'trail_rankings' and column_name = 'score')),
  (7, '007 past-hike detail columns',    exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'hike_logs' and column_name = 'hike_type')),
  (8, 'grant: trails (read)',            to_regclass('public.trails') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.trails'), 'select'), false)),
  (9, 'grant: hike_logs (read/write)',   to_regclass('public.hike_logs') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.hike_logs'), 'select'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.hike_logs'), 'insert'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.hike_logs'), 'update'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.hike_logs'), 'delete'), false)),
  (10, 'grant: trail_rankings',          to_regclass('public.trail_rankings') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.trail_rankings'), 'select'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.trail_rankings'), 'insert'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.trail_rankings'), 'update'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.trail_rankings'), 'delete'), false)),
  (11, 'grant: pairwise_comparisons',    to_regclass('public.pairwise_comparisons') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.pairwise_comparisons'), 'select'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.pairwise_comparisons'), 'insert'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.pairwise_comparisons'), 'update'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.pairwise_comparisons'), 'delete'), false)),
  (12, 'grant: trails_api view',         to_regclass('public.trails_api') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.trails_api'), 'select'), false)),
  (13, 'grant: hike_logs_api view',      to_regclass('public.hike_logs_api') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.hike_logs_api'), 'select'), false)),
  (14, '008 trail catalog columns',      exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'trails' and column_name = 'source')),
  (15, '009 profiles (read/write)',      to_regclass('public.profiles') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'select'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'insert'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'update'), false))
) as checks (n, step, ok)
order by n;
