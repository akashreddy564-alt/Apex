-- 020: account deletion works again.
--
-- Supabase now refuses deletes on storage tables from SQL (storage.protect_delete:
-- "Use the Storage API instead"), so delete_own_account failed for everyone.
-- The app deletes the hiker's photos through the Storage API first
-- (lib/hikePhotos.ts deleteMyPhotos); this function no longer touches storage.
-- Everything else is as in 019.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- Trails other people hiked or ranked go to the earliest of them (a hike
  -- first, else a ranking), so their history survives. The rest cascade below.
  update public.trails t
  set owner_id = heir.user_id, updated_at = now()
  from (
    select distinct on (c.trail_id) c.trail_id, c.user_id
    from (
      select l.trail_id, l.user_id, 0 as pref, l.created_at as at
      from public.hike_logs l
      union all
      select r.trail_id, r.user_id, 1 as pref, r.updated_at as at
      from public.trail_rankings r
    ) c
    join public.trails mine on mine.id = c.trail_id
    where mine.owner_id = uid and c.user_id <> uid
    order by c.trail_id, c.pref, c.at
  ) heir
  where t.id = heir.trail_id;

  -- Own hikes go first: hike_logs.trail_id is on delete restrict, so a trail
  -- can't be removed while one of these still points at it.
  delete from public.hike_logs where user_id = uid;

  -- Rows reference auth.users with on delete cascade. Removing the auth user
  -- removes rankings, comparisons and the remaining trails in the same
  -- transaction.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
