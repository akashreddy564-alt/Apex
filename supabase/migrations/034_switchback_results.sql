-- Switchback, the daily trail puzzle: results people choose to share.
--
-- One row per person per day (the first solve). Seen by the same people who
-- see that person's hikes (friends and followers: sees_posts, migration 024),
-- and shown in their feed as a "Switchback today" card. Solving without
-- sharing writes nothing.

create table if not exists public.switchback_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_date date not null,
  seconds integer not null check (seconds between 1 and 36000),
  size smallint not null check (size between 4 and 9),
  created_at timestamptz not null default now(),
  primary key (user_id, puzzle_date),
  -- A day's result only around that day (time zones), not backfilled or from the future.
  check (puzzle_date between (created_at at time zone 'utc')::date - 2 and (created_at at time zone 'utc')::date + 2)
);

create index if not exists switchback_results_day on public.switchback_results (puzzle_date, seconds);

alter table public.switchback_results enable row level security;

drop policy if exists "switchback_select_visible" on public.switchback_results;
create policy "switchback_select_visible" on public.switchback_results for select to authenticated
  using (public.sees_posts(auth.uid(), user_id));

drop policy if exists "switchback_insert_own" on public.switchback_results;
create policy "switchback_insert_own" on public.switchback_results for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "switchback_delete_own" on public.switchback_results;
create policy "switchback_delete_own" on public.switchback_results for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.switchback_results to authenticated;

-- Today's shared results from people you see (and yours), fastest first, with names for the card.
create or replace function public.switchback_day(day date)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  seconds integer,
  size smallint,
  is_me boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.user_id, p.username, p.display_name, p.avatar_path, r.seconds, r.size, r.user_id = auth.uid()
  from public.switchback_results r
  join public.profiles p on p.id = r.user_id
  where r.puzzle_date = day
  order by r.seconds asc, r.created_at asc
  limit 50;
$$;

revoke all on function public.switchback_day(date) from public, anon;
grant execute on function public.switchback_day(date) to authenticated;
