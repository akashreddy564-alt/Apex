-- App Review demo account. Run in the SQL editor after test_hikers.sql.
-- Safe to run more than once.
--
-- Before running:
--   1. Supabase → Authentication → Users → Add user → "Create new user":
--      an email you control (review@hikeapex.com), a strong password,
--      and "Auto Confirm User" ticked.
--   2. Change the email on the next line to that address.
-- Put the email and password in App Store Connect → App Review Information.
-- The app signs in with them from Settings → "Have a password? Sign in with it".

with reviewer as (
  select id from auth.users where email = 'review@hikeapex.com'
)
insert into public.profiles (id, username, display_name)
select id, 'app_review', 'App Review' from reviewer
on conflict (id) do nothing;

-- Agree to the terms for them (migration 018), so the feed opens straight away.
update public.profiles
set terms_accepted_at = coalesce(terms_accepted_at, now()), terms_version = coalesce(terms_version, '2026-11-24')
where username = 'app_review';

-- Friends with Maya and Jordan, so Home shows their posts, likes and comments.
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
select t.id, p.id, 'accepted', now()
from public.profiles p
cross join (values ('7e570000-0000-4000-8000-000000000001'::uuid), ('7e570000-0000-4000-8000-000000000002'::uuid)) as t (id)
where p.username = 'app_review'
on conflict do nothing;
update public.friendships f
set status = 'accepted', accepted_at = coalesce(f.accepted_at, now())
from public.profiles p
where p.username = 'app_review'
  and p.id in (f.requester_id, f.addressee_id)
  and f.status <> 'accepted';

-- Sam sends a request, so the reviewer can try accepting one.
insert into public.friendships (requester_id, addressee_id)
select '7e570000-0000-4000-8000-000000000003', p.id from public.profiles p
where p.username = 'app_review'
on conflict do nothing;

-- A member of Test crew, so Social shows a group and its board.
insert into public.group_members (group_id, user_id)
select '7e570000-0000-4000-8000-0000000000f1', p.id from public.profiles p
where p.username = 'app_review'
  and exists (select 1 from public.groups where id = '7e570000-0000-4000-8000-0000000000f1')
on conflict do nothing;

-- Check: one row with friends = 2 and in_group = true.
select
  p.username,
  (select count(*) from public.friendships f
    where f.status = 'accepted' and p.id in (f.requester_id, f.addressee_id)) as friends,
  exists (select 1 from public.group_members m where m.user_id = p.id) as in_group
from public.profiles p
where p.username = 'app_review';
