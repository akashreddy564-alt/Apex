-- 027: privacy fixes for 026 (security review, 2026-11-26).
--
-- 1. Tagging: following needs no approval, so tagging anyone you follow let a
--    stranger be pinged with "tagged you". Companions are now friends, or
--    people you follow who follow you back.
-- 2. trail_conditions counted any word stored in a hike's chips, including
--    from people across a block. It now counts only the app's chip words
--    (lib/hikeDetails.ts) and leaves out anyone blocked either way.
--
-- Safe to run more than once.

create or replace function apex_private.clean_hike_details()
returns trigger
language plpgsql
security definer
set search_path = public, apex_private
as $$
begin
  new.companions := coalesce(array(
    select distinct c
    from unnest(coalesce(new.companions, '{}')) as c
    where c <> new.user_id
      and (
        exists (
          select 1 from public.friendships fr
          where fr.status = 'accepted'
            and ((fr.requester_id = new.user_id and fr.addressee_id = c) or (fr.requester_id = c and fr.addressee_id = new.user_id))
        )
        or (
          exists (select 1 from public.follows f where f.follower_id = new.user_id and f.followee_id = c)
          and exists (select 1 from public.follows f where f.follower_id = c and f.followee_id = new.user_id)
        )
      )
      and not public.is_blocked_between(new.user_id, c)
    limit 10
  ), '{}');
  new.gear := coalesce(array(
    select distinct left(btrim(g), 60)
    from unnest(coalesce(new.gear, '{}')) as g
    where btrim(g) <> ''
    limit 12
  ), '{}');
  return new;
end;
$$;

create or replace function public.trail_conditions(trail uuid)
returns table (chip text, kind text, hikers integer)
language sql
stable
security definer
set search_path = public
as $$
  select chip, kind, count(distinct user_id)::integer
  from (
    select l.user_id, unnest(coalesce(l.terrain, '{}')) as chip, 'terrain' as kind
    from public.hike_logs l
    where l.trail_id = trail and l.created_at > now() - interval '365 days'
    union all
    select l.user_id, unnest(coalesce(l.conditions, '{}')), 'conditions'
    from public.hike_logs l
    where l.trail_id = trail and l.created_at > now() - interval '365 days'
  ) reports
  where auth.uid() is not null
    and not public.is_blocked_between(auth.uid(), reports.user_id)
    and (
      (kind = 'terrain' and chip = any (array['Rocky', 'Roots', 'Sandy', 'Snow', 'Scramble', 'Paved']))
      or (kind = 'conditions' and chip = any (array['Dry', 'Muddy', 'Rain', 'Fog', 'Hot', 'Windy', 'Icy']))
    )
  group by chip, kind
  order by count(distinct user_id) desc, chip
  limit 12;
$$;
