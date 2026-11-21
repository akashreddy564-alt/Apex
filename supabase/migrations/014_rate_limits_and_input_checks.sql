-- Rate limits and input checks (hardening before launch).
-- Safe to run more than once. Needs 013 (notifications and safety).
--
-- Rate limits are tiered, per signed-in person, over a rolling 15 minutes:
--   strict (5):    friend requests, reports, creating groups, join-code tries
--   social:        likes 60, comments 20, blocks 20, username changes 5
--   posting:       30 posts (re-ranking a hike re-posts it)
--   unlimited:     reads, hike and ranking sync (first sign-in uploads a backlog)
-- Limits live in apex_private.rate_limits, so tuning one is a single UPDATE.
-- A blocked write raises SQLSTATE P0429 with a message starting
-- "rate_limited:", which the app turns into "Slow down a little".
--
-- Sign-in emails are limited by Supabase Auth, not here: set
-- Authentication → Rate Limits → "emails sent" in the dashboard (see
-- docs/security.md). The app also holds the "Send link" button for 60 s.

create schema if not exists apex_private;
revoke all on schema apex_private from public, anon, authenticated;

create table if not exists apex_private.rate_limits (
  action text primary key,
  max_count integer not null check (max_count > 0),
  per interval not null default interval '15 minutes'
);

insert into apex_private.rate_limits (action, max_count) values
  ('friend_request', 5),
  ('report', 5),
  ('group_create', 5),
  ('group_join', 5),
  ('like', 60),
  ('comment', 20),
  ('block', 20),
  ('username', 5),
  ('post', 30)
on conflict (action) do nothing;

create table if not exists apex_private.rate_events (
  user_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_lookup_idx on apex_private.rate_events (user_id, action, at desc);

-- Count this person's recent events for one action, refuse past the limit,
-- otherwise record one more. Callers run inside the write they guard, so a
-- refused write leaves nothing behind.
create or replace function apex_private.hit(act text)
returns void
language plpgsql
security definer
set search_path = apex_private, public
as $$
declare
  uid uuid := auth.uid();
  lim apex_private.rate_limits%rowtype;
  used integer;
begin
  -- Service-role and dashboard writes have no user; they're not limited.
  if uid is null then return; end if;
  select * into lim from apex_private.rate_limits where action = act;
  if not found then return; end if;

  -- One person's events for one action, serialised so two quick taps can't both slip under.
  perform pg_advisory_xact_lock(hashtext(uid::text || ':' || act));
  select count(*) into used from apex_private.rate_events
  where user_id = uid and action = act and at > now() - lim.per;
  if used >= lim.max_count then
    raise exception using
      errcode = 'P0429',
      message = 'rate_limited:' || act,
      hint = 'Try again in a few minutes.';
  end if;

  insert into apex_private.rate_events (user_id, action) values (uid, act);
  -- Keep the table small: drop this person's events older than a day.
  delete from apex_private.rate_events where user_id = uid and at < now() - interval '1 day';
end;
$$;
revoke all on function apex_private.hit(text) from public, anon, authenticated;

create or replace function apex_private.limit_insert()
returns trigger
language plpgsql
security definer
set search_path = apex_private, public
as $$
begin
  perform apex_private.hit(tg_argv[0]);
  return new;
end;
$$;
revoke all on function apex_private.limit_insert() from public, anon, authenticated;

drop trigger if exists friendships_rate on public.friendships;
create trigger friendships_rate before insert on public.friendships
  for each row execute function apex_private.limit_insert('friend_request');

drop trigger if exists reports_rate on public.reports;
create trigger reports_rate before insert on public.reports
  for each row execute function apex_private.limit_insert('report');

drop trigger if exists groups_rate on public.groups;
create trigger groups_rate before insert on public.groups
  for each row execute function apex_private.limit_insert('group_create');

drop trigger if exists post_likes_rate on public.post_likes;
create trigger post_likes_rate before insert on public.post_likes
  for each row execute function apex_private.limit_insert('like');

drop trigger if exists post_comments_rate on public.post_comments;
create trigger post_comments_rate before insert on public.post_comments
  for each row execute function apex_private.limit_insert('comment');

drop trigger if exists blocks_rate on public.blocks;
create trigger blocks_rate before insert on public.blocks
  for each row execute function apex_private.limit_insert('block');

drop trigger if exists posts_rate on public.posts;
create trigger posts_rate before insert on public.posts
  for each row execute function apex_private.limit_insert('post');

-- Username changes only, not other profile edits.
create or replace function apex_private.limit_username()
returns trigger
language plpgsql
security definer
set search_path = apex_private, public
as $$
begin
  if new.username is distinct from old.username then
    perform apex_private.hit('username');
  end if;
  return new;
end;
$$;
revoke all on function apex_private.limit_username() from public, anon, authenticated;

drop trigger if exists profiles_username_rate on public.profiles;
create trigger profiles_username_rate before update on public.profiles
  for each row execute function apex_private.limit_username();

-- ---------------------------------------------------------------------------
-- join_group: count every try, including wrong codes, so codes can't be
-- guessed. A wrong code returns null instead of raising, because raising
-- would roll back the recorded try. The app shows "No group has that code".
-- ---------------------------------------------------------------------------
create or replace function public.join_group(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.groups%rowtype;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Pick a username first';
  end if;

  perform apex_private.hit('group_join');

  select * into target from public.groups
  where code = upper(regexp_replace(coalesce(join_code, ''), '[^A-Za-z0-9]', '', 'g'))
  for update;
  if not found then return null; end if;

  if exists (select 1 from public.group_members where group_id = target.id and user_id = uid) then
    return target.id;
  end if;
  if (select count(*) from public.group_members where group_id = target.id) >= 50 then
    raise exception 'That group is full (50 people)';
  end if;
  if (select count(*) from public.group_members where user_id = uid) >= 20 then
    raise exception 'You''re in 20 groups already. Leave one first.';
  end if;

  insert into public.group_members (group_id, user_id) values (target.id, uid);
  return target.id;
end;
$$;
revoke all on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Input checks the app also enforces. NOT VALID: existing rows are left
-- alone; every new or edited row is checked.
-- Control characters are refused everywhere except newlines and tabs in
-- notes and comments.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hike_logs_notes_check') then
    alter table public.hike_logs add constraint hike_logs_notes_check
      check (notes is null or (char_length(notes) <= 2000 and notes !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trails_user_name_check') then
    alter table public.trails add constraint trails_user_name_check
      check (source <> 'user' or (char_length(btrim(name)) between 1 and 80 and name !~ '[\x00-\x1F\x7F]')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'post_comments_body_chars_check') then
    alter table public.post_comments add constraint post_comments_body_chars_check
      check (body !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_chars_check') then
    alter table public.profiles add constraint profiles_display_name_chars_check
      check (display_name !~ '[\x00-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'groups_name_chars_check') then
    alter table public.groups add constraint groups_name_chars_check
      check (name !~ '[\x00-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_details_chars_check') then
    alter table public.reports add constraint reports_details_chars_check
      check (details is null or details !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
end;
$$;
