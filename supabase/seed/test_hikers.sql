-- Test hikers for trying friends without a second phone or email.
-- Run in the SQL editor. Safe to run more than once.
-- Remove them all with supabase/seed/remove_test_hikers.sql.
--
-- They're real accounts with addresses at the reserved .invalid domain, so no
-- email ever reaches them and nobody can sign in as them. Usernames end in
-- _test so they're easy to spot.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '7e570000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'maya@apex-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '7e570000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'jordan@apex-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '7e570000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'sam@apex-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.profiles (id, username, display_name)
values
  ('7e570000-0000-4000-8000-000000000001', 'maya_test', 'Maya Chen'),
  ('7e570000-0000-4000-8000-000000000002', 'jordan_test', 'Jordan Alvarez'),
  ('7e570000-0000-4000-8000-000000000003', 'sam_test', 'Sam Okafor')
on conflict (id) do nothing;

-- Maya and Jordan are already friends, so their pages show a friend count.
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('7e570000-0000-4000-8000-000000000001', '7e570000-0000-4000-8000-000000000002', 'accepted', now())
on conflict do nothing;

-- Maya asks every real account to be friends. Run this again after a new
-- person signs up and picks a username, and they'll get the request too.
insert into public.friendships (requester_id, addressee_id)
select '7e570000-0000-4000-8000-000000000001', p.id
from public.profiles p
where p.id::text not like '7e570000-%'
on conflict do nothing;

-- Feed (needs 011): Maya and Jordan each ranked a recent hike on a catalog
-- trail, with a like and a comment, so Home has posts once you accept Maya.
-- Their hikes and posts go when the accounts are removed (both cascade).
with picks as (
  select id, distance_km, row_number() over (order by name) as n
  from public.trails
  where source = 'catalog' and path is not null
  order by name
  limit 3
),
hikes (log_id, user_id, n, days_ago, duration_seconds, notes, bucket, score, bucket_size) as (
  values
    ('7e570000-0000-4000-8000-0000000000a1'::uuid, '7e570000-0000-4000-8000-000000000001'::uuid, 1, 1, 15300,
     'Clear all the way up. Last mile is steep but the view is worth every step.', 'loved', 8.9, 5),
    ('7e570000-0000-4000-8000-0000000000a2'::uuid, '7e570000-0000-4000-8000-000000000001'::uuid, 2, 4, 9800,
     'Muddy after the rain. Fine for a short one.', 'fine', 5.8, 3),
    ('7e570000-0000-4000-8000-0000000000a3'::uuid, '7e570000-0000-4000-8000-000000000002'::uuid, 3, 2, 12600,
     null, 'loved', 0, 1)
),
logs as (
  insert into public.hike_logs (id, user_id, trail_id, duration_seconds, notes, distance_km, created_at)
  select h.log_id, h.user_id, p.id, h.duration_seconds, h.notes, p.distance_km, now() - make_interval(days => h.days_ago)
  from hikes h join picks p on p.n = h.n
  on conflict (id) do nothing
  returning id, user_id, trail_id, created_at
)
insert into public.posts (id, user_id, trail_id, bucket, score, bucket_size, hiked_at, created_at)
select l.id, l.user_id, l.trail_id, h.bucket, h.score, h.bucket_size, l.created_at, l.created_at + interval '3 hours'
from logs l join hikes h on h.log_id = l.id
on conflict (id) do nothing;

insert into public.post_likes (post_id, user_id)
select '7e570000-0000-4000-8000-0000000000a1', '7e570000-0000-4000-8000-000000000002'
where exists (select 1 from public.posts where id = '7e570000-0000-4000-8000-0000000000a1')
on conflict do nothing;

insert into public.post_comments (id, post_id, user_id, body)
select '7e570000-0000-4000-8000-0000000000c1', '7e570000-0000-4000-8000-0000000000a1',
       '7e570000-0000-4000-8000-000000000002', 'Adding this to the list for next weekend.'
where exists (select 1 from public.posts where id = '7e570000-0000-4000-8000-0000000000a1')
on conflict (id) do nothing;
