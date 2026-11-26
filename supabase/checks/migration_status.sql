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
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'select'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'insert'), false) and coalesce(has_table_privilege('authenticated', to_regclass('public.profiles'), 'update'), false)),
  (16, '010 friends',                    to_regclass('public.friendships') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.friendships'), 'select'), false)
                                           and to_regprocedure('public.send_friend_request(uuid)') is not null
                                           and to_regprocedure('public.my_friendships()') is not null),
  (17, '011 feed',                       to_regclass('public.posts') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.posts'), 'insert'), false)
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.post_likes'), 'insert'), false)
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.post_comments'), 'insert'), false)
                                           and to_regprocedure('public.feed_posts(timestamptz, integer, uuid)') is not null),
  (18, '012 groups',                     to_regclass('public.groups') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.group_members'), 'select'), false)
                                           and exists (select 1 from information_schema.columns
                                                       where table_schema = 'public' and table_name = 'hike_logs_api' and column_name = 'elevation_gain_m')
                                           and to_regprocedure('public.join_group(text)') is not null
                                           and to_regprocedure('public.group_summary(uuid, text)') is not null),
  (19, '013 notifications and safety',  to_regclass('public.notifications') is not null
                                           and to_regclass('public.reports') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.blocks'), 'select'), false)
                                           and to_regprocedure('public.my_notifications(integer)') is not null
                                           and to_regprocedure('public.report_content(uuid, text, text, uuid, uuid)') is not null
                                           and exists (select 1 from pg_trigger where tgname = 'hike_logs_passed')),
  (20, '014 rate limits and input checks', to_regclass('apex_private.rate_limits') is not null
                                           and exists (select 1 from pg_trigger where tgname = 'post_likes_rate')
                                           and exists (select 1 from pg_constraint where conname = 'hike_logs_notes_check')),
  (21, '015 safety fixes',               to_regprocedure('apex_private.board_gain(uuid, integer, geography)') is not null
                                           and to_regprocedure('public.counted_gain(uuid, integer, boolean)') is null),
  (22, '016 friend board, person posts', to_regprocedure('public.friend_board(text, text)') is not null
                                           and to_regprocedure('public.person_posts(uuid, timestamptz, integer)') is not null),
  (23, '017 schools and companies',      to_regclass('public.organizations') is not null
                                           and coalesce(has_table_privilege('authenticated', to_regclass('public.organization_members'), 'select'), false)
                                           and to_regprocedure('public.confirm_org_code(text)') is not null
                                           and to_regprocedure('public.organization_board(uuid, text)') is not null
                                           and not coalesce(has_function_privilege('authenticated', to_regprocedure('public.issue_org_code(uuid, text)'), 'execute'), false)),
  (24, '018 terms',                       exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'profiles' and column_name = 'terms_accepted_at')
                                           and exists (select 1 from pg_trigger where tgname = 'post_comments_require_terms')),
  (25, '019 friend trails',               exists (select 1 from pg_policies
                                           where schemaname = 'public' and tablename = 'trails'
                                             and policyname = 'trails_select_catalog_own_or_friend')),
  (26, '020 account deletion skips storage', position('storage.objects' in pg_get_functiondef('public.delete_own_account()'::regprocedure)) = 0),
  (27, '021 hundredths, First Ascent',   exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'trail_rankings'
                                             and column_name = 'score' and numeric_scale = 2)
                                           and exists (select 1 from information_schema.columns
                                           where table_schema = 'public' and table_name = 'profiles' and column_name = 'ascent_no')
                                           and exists (select 1 from pg_trigger where tgname = 'profiles_first_ascent')
                                           and not coalesce(has_table_privilege('authenticated', to_regclass('public.first_ascent_counter'), 'select'), false)),
  (28, '022 First Ascent skips own domain', position('@hikeapex.com' in pg_get_functiondef('public.is_test_account(uuid)'::regprocedure)) > 0),
  (29, '023 catalog search',              to_regprocedure('public.search_catalog(text, double precision, double precision, integer)') is not null
                                           and to_regprocedure('public.catalog_near(double precision, double precision, integer, integer)') is not null
                                           and to_regprocedure('public.catalog_trails(uuid[])') is not null
                                           and exists (select 1 from information_schema.columns
                                                       where table_schema = 'public' and table_name = 'trails' and column_name = 'state')),
  (30, '024 follows, difficulty, own stats', to_regclass('public.follows') is not null
                                           and to_regprocedure('public.sees_posts(uuid, uuid)') is not null
                                           and to_regprocedure('public.trail_people_rankings(uuid)') is not null
                                           and exists (select 1 from information_schema.columns
                                                       where table_schema = 'public' and table_name = 'trail_rankings' and column_name = 'difficulty')
                                           and position('t.distance_km' in pg_get_functiondef('public.feed_posts(timestamptz, integer, uuid)'::regprocedure)) = 0),
  (31, '025 follow privacy fixes',        position('auth.uid() in (viewer, person)' in pg_get_functiondef('public.follows_person(uuid, uuid)'::regprocedure)) > 0),
  (32, '026 companions, gear, conditions', exists (select 1 from information_schema.columns
                                                       where table_schema = 'public' and table_name = 'hike_logs' and column_name = 'gear')
                                           and to_regprocedure('public.trail_conditions(uuid)') is not null
                                           and position('auth.uid() in (a, b)' in pg_get_functiondef('public.are_friends(uuid, uuid)'::regprocedure)) > 0),
  (33, '028 ranking-first social',        exists (select 1 from information_schema.columns
                                                       where table_schema = 'public' and table_name = 'posts' and column_name = 'list_rank')
                                           and to_regprocedure('public.person_rankings(uuid)') is not null
                                           and to_regprocedure('public.group_trail_board(uuid)') is not null
                                           and to_regprocedure('public.taste_picks(integer)') is not null
                                           and position('list_rank' in pg_get_function_result('public.feed_posts(timestamptz, integer, uuid)'::regprocedure)) > 0)
) as checks (n, step, ok)
order by n;
