-- Immediate account removal. Runs as the migration owner, not as the client.
-- The app calls this with the signed-in user's JWT. No service-role key ships
-- in the client.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from storage.objects
  where bucket_id = 'hike-photos'
    and (storage.foldername(name))[1] = uid::text;

  -- Rows reference auth.users with on delete cascade. Removing the auth user
  -- removes hike logs, rankings, and comparisons in the same transaction.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
