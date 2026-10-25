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
