-- Removes the test hikers from test_hikers.sql, with their profiles and
-- friendships (both cascade from the account). Touches nothing else.
delete from auth.users
where id in (
  '7e570000-0000-4000-8000-000000000001',
  '7e570000-0000-4000-8000-000000000002',
  '7e570000-0000-4000-8000-000000000003'
);
