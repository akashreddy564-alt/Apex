-- Summit, the daily mountain guess: results people choose to share.
--
-- One row per person per day (their first game). Seen by the same people
-- who see that person's hikes (friends and followers: sees_posts, 024) and
-- shown in their feed as a "Summit today" card. Playing without sharing
-- writes nothing. `game` leaves room for other daily games later.

create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null check (game in ('summit')),
  puzzle_date date not null,
  -- Guesses used, 1-6; 7 means they didn't get it.
  guesses smallint not null check (guesses between 1 and 7),
  created_at timestamptz not null default now(),
  primary key (user_id, game, puzzle_date)
);

-- The server sets the time and only takes a result for a day close to now
-- (time zones), so nobody backfills or posts ahead. The score itself is
-- reported by the phone: fine for a friendly board, not a prize.
create or replace function public.daily_results_stamp()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  if new.puzzle_date not between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1 then
    raise exception 'daily result must be for today';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_results_stamp on public.daily_results;
create trigger daily_results_stamp
  before insert or update on public.daily_results
  for each row execute function public.daily_results_stamp();

create index if not exists daily_results_day on public.daily_results (game, puzzle_date);

alter table public.daily_results enable row level security;

drop policy if exists "daily_results_select_visible" on public.daily_results;
create policy "daily_results_select_visible" on public.daily_results for select to authenticated
  using (public.sees_posts(auth.uid(), user_id));

drop policy if exists "daily_results_insert_own" on public.daily_results;
create policy "daily_results_insert_own" on public.daily_results for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "daily_results_delete_own" on public.daily_results;
create policy "daily_results_delete_own" on public.daily_results for delete to authenticated
  using (user_id = auth.uid());

grant select, delete on public.daily_results to authenticated;
-- Only these columns come from the phone; created_at is the server's.
grant insert (user_id, game, puzzle_date, guesses) on public.daily_results to authenticated;

-- A day's shared results from people you see (and yours), best first, with names for the card.
create or replace function public.daily_results_day(game_name text, day date)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  guesses smallint,
  is_me boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.user_id, p.username, p.display_name, p.avatar_path, r.guesses, r.user_id = auth.uid()
  from public.daily_results r
  join public.profiles p on p.id = r.user_id
  where r.game = game_name and r.puzzle_date = day
  order by r.guesses asc, r.created_at asc
  limit 50;
$$;

revoke all on function public.daily_results_day(text, date) from public, anon;
grant execute on function public.daily_results_day(text, date) to authenticated;
