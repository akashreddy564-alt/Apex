-- Removes the test hikers from test_hikers.sql, with their profiles and
-- friendships (both cascade from the account). Touches nothing else.
-- Test crew (012) goes first; its owner is a test hiker.
delete from public.groups where id = '7e570000-0000-4000-8000-0000000000f1';
delete from auth.users
where id in (
  '7e570000-0000-4000-8000-000000000001',
  '7e570000-0000-4000-8000-000000000002',
  '7e570000-0000-4000-8000-000000000003'
);
