-- 031: monthly challenges (owner note, 2026-11-27).
--
-- Each month has three challenges: climb, distance and hikes. You join one,
-- and its board shows you and the mutual friends who joined (never strangers,
-- never across a block). Only recorded hikes count, with the same climb cap
-- and recorded length as group boards (015), so typed-in hikes can't pad it.
-- Targets live in the app; the board returns amounts.
--
-- A challenge key is "YYYY-MM:metric", e.g. "2026-12:climb".
--
-- Safe to run more than once.

create table if not exists public.challenge_entries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge text not null check (challenge ~ '^20[0-9]{2}-(0[1-9]|1[0-2]):(climb|distance|hikes)$'),
  joined_at timestamptz not null default now(),
  primary key (user_id, challenge)
);

alter table public.challenge_entries enable row level security;

drop policy if exists "challenge_entries_own_select" on public.challenge_entries;
create policy "challenge_entries_own_select"
  on public.challenge_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "challenge_entries_own_insert" on public.challenge_entries;
create policy "challenge_entries_own_insert"
  on public.challenge_entries for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "challenge_entries_own_delete" on public.challenge_entries;
create policy "challenge_entries_own_delete"
  on public.challenge_entries for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.challenge_entries from anon;
grant select, insert, delete on public.challenge_entries to authenticated;

-- The board: everyone who joined and is you or a mutual friend, by amount.
-- amount is metres climbed, kilometres walked, or hikes, for the month in the
-- caller's time zone.
create or replace function public.challenge_board(ch text, tz text default 'UTC')
returns table (
  user_id uuid,
  username text,
  display_name text,
  amount numeric,
  hikes integer,
  place integer,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  zone text := coalesce(nullif(btrim(tz), ''), 'UTC');
  since timestamptz;
  metric text;
begin
  if auth.uid() is null then return; end if;
  if ch is null or ch !~ '^20[0-9]{2}-(0[1-9]|1[0-2]):(climb|distance|hikes)$' then return; end if;
  if not exists (select 1 from pg_timezone_names where name = zone) then zone := 'UTC'; end if;
  metric := split_part(ch, ':', 2);
  since := (to_date(split_part(ch, ':', 1) || '-01', 'YYYY-MM-DD')::timestamp) at time zone zone;

  return query
  with people as (
    select e.user_id
    from public.challenge_entries e
    where e.challenge = ch
      and (e.user_id = auth.uid() or public.is_mutual_friend(e.user_id))
  ),
  counted as (
    select
      p.user_id,
      coalesce(sum(apex_private.board_gain(l.trail_id, l.elevation_gain_m, l.recorded_path)), 0)::numeric as gain_m,
      coalesce(sum(round((st_length(l.recorded_path) / 1000)::numeric, 2)), 0)::numeric as km,
      count(l.id)::integer as n
    from people p
    left join public.hike_logs l
      on l.user_id = p.user_id
     and l.recorded_path is not null
     and l.created_at >= since
     and l.created_at < since + interval '1 month'
    group by p.user_id
  ),
  scored as (
    select c.user_id, c.n,
           case metric when 'climb' then c.gain_m when 'distance' then c.km else c.n::numeric end as amount
    from counted c
  )
  select s.user_id, pr.username, pr.display_name, s.amount, s.n,
         rank() over (order by s.amount desc)::integer,
         s.user_id = auth.uid()
  from scored s
  join public.profiles pr on pr.id = s.user_id
  order by s.amount desc, pr.display_name
  limit 100;
end;
$$;

revoke all on function public.challenge_board(text, text) from public, anon;
grant execute on function public.challenge_board(text, text) to authenticated;
