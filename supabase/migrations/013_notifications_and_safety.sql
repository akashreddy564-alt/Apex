-- Notifications, report and block (plan 3, step 6).
-- Safe to run more than once. Needs 012 (groups).
--
-- Notifications are made by the database, not the app, so they can't be
-- forged: friend requests and acceptances, someone joining your group, likes
-- and comments on your hike, and "passed you this week" on a group board.
-- v1 shows them in an in-app bell; push comes with the Apple Developer account.
--
-- Blocking someone unfriends you, stops friend requests either way, hides
-- their comments and notifications from you, and yours from them.
-- Reports are written through report_content() and read only by the owner
-- in the dashboard (supabase/checks/open_reports.sql).

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

grant select on public.blocks to authenticated;

create or replace function public.is_blocked_between(a uuid, b uuid)
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

create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if target = uid then raise exception 'You can''t block yourself'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
  delete from public.friendships
  where (requester_id = uid and addressee_id = target) or (requester_id = target and addressee_id = uid);
  delete from public.notifications
  where (user_id = uid and actor_id = target) or (user_id = target and actor_id = uid);
end;
$$;

create or replace function public.unblock_user(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = target;
$$;

create or replace function public.my_blocks()
returns table (id uuid, username text, display_name text, since timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- Friend requests can't cross a block (same as 010 plus that check).
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if target = uid then raise exception 'You can''t add yourself'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Pick a username first';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'That person isn''t on Apex';
  end if;
  if public.is_blocked_between(uid, target) then
    raise exception 'You can''t add this person';
  end if;

  select * into existing from public.friendships
  where (requester_id = uid and addressee_id = target)
     or (requester_id = target and addressee_id = uid)
  for update;

  if found then
    if existing.status = 'accepted' then return 'friends'; end if;
    if existing.requester_id = target then
      update public.friendships
      set status = 'accepted', accepted_at = now()
      where requester_id = target and addressee_id = uid;
      return 'accepted';
    end if;
    return 'requested';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (uid, target);
  return 'requested';
end;
$$;

-- Comments from someone either of you blocked are hidden.
drop policy if exists "post_comments_select_visible" on public.post_comments;
create policy "post_comments_select_visible"
  on public.post_comments for select
  to authenticated
  using (public.can_see_post(post_id) and not public.is_blocked_between(auth.uid(), user_id));

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_user uuid references public.profiles (id) on delete cascade,
  target_post uuid references public.posts (id) on delete set null,
  target_comment uuid references public.post_comments (id) on delete set null,
  -- What was reported, kept so a deleted post or comment can still be reviewed.
  snapshot text,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists reports_open_idx on public.reports (created_at) where status = 'open';

-- No policies: nobody reads or writes this table from the app.
alter table public.reports enable row level security;

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
  if person = uid then raise exception 'You can''t report yourself'; end if;
  if comment is not null then
    select c.body into snap from public.post_comments c where c.id = comment and c.user_id = person;
  elsif post is not null then
    select coalesce(l.notes, '') into snap
    from public.posts p join public.hike_logs l on l.id = p.id
    where p.id = post and p.user_id = person;
  end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'That''s a lot of reports today. Try again tomorrow.';
  end if;
  insert into public.reports (reporter_id, target_user, target_post, target_comment, snapshot, reason, details)
  values (uid, person, post, comment, snap, reason, nullif(btrim(coalesce(details, '')), ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friend_request', 'friend_accepted', 'group_join', 'like', 'comment', 'passed')),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  -- One like, one "passed" per group per week, one request: repeats are dropped.
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index if not exists notifications_dedupe_idx on public.notifications (dedupe_key);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.notifications to authenticated;

-- notify (internal): skips yourself and anyone across a block.
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
  if public.is_blocked_between(recipient, actor) then return; end if;
  insert into public.notifications (user_id, kind, actor_id, post_id, group_id, comment_id, dedupe_key)
  values (recipient, what, actor, post, grp, cmt, dedupe)
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.on_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify(new.addressee_id, 'friend_request', new.requester_id,
      dedupe => 'request:' || new.requester_id || ':' || new.addressee_id);
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    perform public.notify(new.requester_id, 'friend_accepted', new.addressee_id);
    -- The request is answered; it shouldn't sit in the bell.
    delete from public.notifications
    where dedupe_key = 'request:' || new.requester_id || ':' || new.addressee_id;
  end if;
  return new;
end;
$$;

-- A declined or cancelled request leaves the bell too.
create or replace function public.on_friendship_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where dedupe_key = 'request:' || old.requester_id || ':' || old.addressee_id;
  return old;
end;
$$;

create or replace function public.on_group_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(
    (select owner_id from public.groups where id = new.group_id), 'group_join', new.user_id,
    grp => new.group_id, dedupe => 'join:' || new.group_id || ':' || new.user_id);
  return new;
end;
$$;

create or replace function public.on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(
    (select user_id from public.posts where id = new.post_id), 'like', new.user_id,
    post => new.post_id, dedupe => 'like:' || new.post_id || ':' || new.user_id);
  return new;
end;
$$;

create or replace function public.on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(
    (select user_id from public.posts where id = new.post_id), 'comment', new.user_id,
    post => new.post_id, cmt => new.id);
  return new;
end;
$$;

-- counted_gain (internal): what one hike adds to a board, as in group_hikes().
create or replace function public.counted_gain(trail uuid, gain integer, recorded boolean)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not recorded then 0
    when t.source = 'catalog' and t.elevation_gain_m is not null
      then least(coalesce(gain, 0), round(t.elevation_gain_m * 1.5)::integer)
    else coalesce(gain, 0)
  end
  from public.trails t where t.id = trail;
$$;

-- "Passed you": after a recorded hike lands, tell everyone in your groups
-- whose weekly total you just went past. Nobody hears it at zero.
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
  added := coalesce(public.counted_gain(new.trail_id, new.elevation_gain_m, new.recorded_path is not null), 0);
  if tg_op = 'UPDATE' then
    removed := coalesce(public.counted_gain(old.trail_id, old.elevation_gain_m, old.recorded_path is not null), 0);
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

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify after insert or update of status on public.friendships
  for each row execute function public.on_friendship_change();

drop trigger if exists friendships_unnotify on public.friendships;
create trigger friendships_unnotify after delete on public.friendships
  for each row execute function public.on_friendship_delete();

drop trigger if exists group_members_notify on public.group_members;
create trigger group_members_notify after insert on public.group_members
  for each row execute function public.on_group_join();

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.on_post_like();

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.on_post_comment();

drop trigger if exists hike_logs_passed on public.hike_logs;
create trigger hike_logs_passed after insert or update of elevation_gain_m, recorded_path, trail_id on public.hike_logs
  for each row execute function public.on_hike_counted();

-- my_notifications: the bell, newest first, with what each row shows.
create or replace function public.my_notifications(max_rows integer default 50)
returns table (
  id uuid,
  kind text,
  actor_id uuid,
  actor_name text,
  actor_username text,
  post_id uuid,
  trail_name text,
  group_id uuid,
  group_name text,
  comment_body text,
  created_at timestamptz,
  is_read boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.kind, n.actor_id, a.display_name, a.username,
    n.post_id, t.name, n.group_id, g.name, left(c.body, 140), n.created_at, n.read_at is not null
  from public.notifications n
  join public.profiles a on a.id = n.actor_id
  left join public.posts p on p.id = n.post_id
  left join public.trails t on t.id = p.trail_id
  left join public.groups g on g.id = n.group_id
  left join public.post_comments c on c.id = n.comment_id
  where n.user_id = auth.uid()
    and not public.is_blocked_between(auth.uid(), n.actor_id)
  order by n.created_at desc
  limit least(greatest(coalesce(max_rows, 50), 1), 100);
$$;

create or replace function public.unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.my_blocks() from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.report_content(uuid, text, text, uuid, uuid) from public, anon;
revoke all on function public.notify(uuid, text, uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.counted_gain(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.my_notifications(integer) from public, anon;
revoke all on function public.unread_notification_count() from public, anon;
revoke all on function public.mark_notifications_read() from public, anon;

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.my_blocks() to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.report_content(uuid, text, text, uuid, uuid) to authenticated;
grant execute on function public.my_notifications(integer) to authenticated;
grant execute on function public.unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
