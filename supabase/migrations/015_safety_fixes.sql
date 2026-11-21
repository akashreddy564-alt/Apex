-- Safety fixes for 012 and 013. Safe to run more than once. Needs 014.
--
-- 1. is_blocked_between() is granted to every signed-in person because the
--    comment policy calls it. Called directly it answered "has A blocked B?"
--    for any two people. It now answers only for pairs that include you;
--    internal callers use apex_private.blocked_between(), which nobody else
--    can run.
-- 2. report_content() saved a report even when the post or comment didn't
--    belong to the person reported, so a report could point at someone
--    else's content. It now refuses that.
-- 3. Hikes on your own trails (not the catalog) counted whatever gain the
--    phone sent, so one edited upload could top a group board. Every
--    recorded hike is now capped by its recorded length (450 m of gain per
--    km, steeper than any maintained trail) and at 3,000 m per hike. Catalog
--    hikes keep their 1.5× trail-gain cap as well.

-- ---------------------------------------------------------------------------
-- 1. Blocks
-- ---------------------------------------------------------------------------
create or replace function apex_private.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() in (a, b)
    and apex_private.blocked_between(a, b);
$$;

create or replace function public.notify(
  recipient uuid, what text, actor uuid,
  post uuid default null, grp uuid default null, cmt uuid default null, dedupe text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if recipient is null or actor is null or recipient = actor then return; end if;
  if apex_private.blocked_between(recipient, actor) then return; end if;
  insert into public.notifications (user_id, kind, actor_id, post_id, group_id, comment_id, dedupe_key)
  values (recipient, what, actor, post, grp, cmt, dedupe)
  on conflict (dedupe_key) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Reports must point at the reported person's own post or comment
-- ---------------------------------------------------------------------------
create or replace function public.report_content(
  person uuid,
  reason text,
  details text default null,
  post uuid default null,
  comment uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  snap text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if person is null then raise exception 'Nobody to report'; end if;
  if person = uid then raise exception 'You can''t report yourself'; end if;
  if comment is not null then
    select c.body into snap from public.post_comments c
    where c.id = comment and c.user_id = person
      and (post is null or c.post_id = post);
    if not found then raise exception 'That comment isn''t theirs'; end if;
  elsif post is not null then
    select coalesce(l.notes, '') into snap
    from public.posts p join public.hike_logs l on l.id = p.id
    where p.id = post and p.user_id = person;
    if not found then raise exception 'That post isn''t theirs'; end if;
  end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'That''s a lot of reports today. Try again tomorrow.';
  end if;
  insert into public.reports (reporter_id, target_user, target_post, target_comment, snapshot, reason, details)
  values (uid, person, post, comment, snap, reason, nullif(btrim(coalesce(details, '')), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. One cap for every board: group_hikes() and the "passed you" trigger
-- ---------------------------------------------------------------------------
create or replace function apex_private.board_gain(trail uuid, gain integer, path geography)
returns integer
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case
    when path is null then 0
    else least(
      greatest(coalesce(gain, 0), 0),
      round(st_length(path) / 1000 * 450)::integer,
      3000,
      coalesce(
        (select round(t.elevation_gain_m * 1.5)::integer
         from public.trails t
         where t.id = trail and t.source = 'catalog' and t.elevation_gain_m is not null),
        3000
      )
    )
  end;
$$;

create or replace function public.group_hikes(g uuid, since timestamptz, until timestamptz)
returns table (user_id uuid, log_id uuid, trail_id uuid, gain_m integer, km numeric, hiked_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    l.user_id,
    l.id,
    l.trail_id,
    apex_private.board_gain(l.trail_id, l.elevation_gain_m, l.recorded_path),
    -- Recorded length, not the typed one, so distance can't be padded either.
    round((st_length(l.recorded_path) / 1000)::numeric, 2),
    l.created_at
  from public.group_members m
  join public.hike_logs l on l.user_id = m.user_id
  where m.group_id = g
    and l.recorded_path is not null
    and l.created_at >= since
    and l.created_at < until;
$$;

create or replace function public.on_hike_counted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grp record;
  added integer;
  removed integer := 0;
  week_start timestamptz;
  after_gain integer;
  before_gain integer;
begin
  added := apex_private.board_gain(new.trail_id, new.elevation_gain_m, new.recorded_path);
  if tg_op = 'UPDATE' then
    removed := apex_private.board_gain(old.trail_id, old.elevation_gain_m, old.recorded_path);
  end if;
  if added <= removed then return new; end if;

  for grp in
    select g.id, g.time_zone from public.group_members m join public.groups g on g.id = m.group_id
    where m.user_id = new.user_id
  loop
    week_start := public.period_start(grp.time_zone, 'week');
    if new.created_at < week_start then continue; end if;

    select coalesce(sum(h.gain_m), 0) into after_gain
    from public.group_hikes(grp.id, week_start, 'infinity') h
    where h.user_id = new.user_id;
    before_gain := after_gain - added
      + case when tg_op = 'UPDATE' and old.created_at >= week_start then removed else 0 end;

    perform public.notify(
      p.user_id, 'passed', new.user_id, grp => grp.id,
      dedupe => 'passed:' || grp.id || ':' || new.user_id || ':' || p.user_id || ':' || to_char(week_start, 'YYYY-MM-DD'))
    from public.group_places(grp.id, week_start, 'infinity') p
    where p.user_id <> new.user_id
      and p.gain_m > 0
      and p.gain_m >= before_gain
      and p.gain_m < after_gain;
  end loop;
  return new;
end;
$$;

-- counted_gain() is replaced by apex_private.board_gain().
drop function if exists public.counted_gain(uuid, integer, boolean);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function apex_private.blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function apex_private.board_gain(uuid, integer, geography) from public, anon, authenticated;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function public.notify(uuid, text, uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.report_content(uuid, text, text, uuid, uuid) from public, anon;
revoke all on function public.group_hikes(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.report_content(uuid, text, text, uuid, uuid) to authenticated;
