-- 019: friends' trails.
--
-- A trail someone adds (source = 'user') was readable by its owner alone, so
-- friends saw it in the feed but couldn't open, save, rank or match it. Now a
-- friend can read it (unless either has blocked the other), and anyone who has
-- logged or ranked a trail keeps reading it after an unfriend. Writes stay
-- owner-only.
--
-- Deleting an account used to fail when a friend had logged one of its trails
-- (hike_logs.trail_id is on delete restrict). The trail now passes to the
-- earliest other hiker on it.

drop policy if exists "trails_select_catalog_or_own" on public.trails;
drop policy if exists "trails_select_catalog_own_or_friend" on public.trails;
create policy "trails_select_catalog_own_or_friend"
  on public.trails for select
  to authenticated
  using (
    owner_id is null
    or owner_id = (select auth.uid())
    or (
      public.are_friends((select auth.uid()), owner_id)
      and not public.is_blocked_between((select auth.uid()), owner_id)
    )
    or exists (
      select 1 from public.hike_logs l
      where l.trail_id = trails.id and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.trail_rankings r
      where r.trail_id = trails.id and r.user_id = (select auth.uid())
    )
  );

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
  -- removes hike logs, rankings, comparisons and the remaining trails in the
  -- same transaction.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
