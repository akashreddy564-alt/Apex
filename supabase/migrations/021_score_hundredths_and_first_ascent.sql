-- 021: scores in hundredths, and First Ascent numbers for the first 100 hikers.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Scores: one decimal ran out of room. Loved spans 7–10, so past ~30 loved
-- trails two neighbours showed the same score. Hundredths last into the
-- hundreds. Bands match lib/ranking.ts: Loved 7–10, Fine 4–6.99,
-- Didn't like 0–3.99.
-- ---------------------------------------------------------------------------

alter table public.trail_rankings alter column score type numeric(4, 2);
alter table public.posts alter column score type numeric(4, 2);

-- Re-score every ranking from its position, as bandScore does.
update public.trail_rankings as ranking
set score = scored.score
from (
  select
    id,
    least(
      hi,
      greatest(
        lo,
        round((hi - ((idx + 0.5) * (hi - lo)) / cnt) * 100) / 100
      )
    ) as score
  from (
    select
      id,
      (row_number() over (
        partition by user_id, hike_type, bucket
        order by position, id
      ) - 1)::numeric as idx,
      count(*) over (partition by user_id, hike_type, bucket)::numeric as cnt,
      case bucket
        when 'loved' then 7
        when 'fine' then 4
        else 0
      end::numeric as lo,
      case bucket
        when 'loved' then 10
        when 'fine' then 6.99
        else 3.99
      end::numeric as hi
    from public.trail_rankings
  ) ranked
) scored
where ranking.id = scored.id
  and ranking.score is distinct from scored.score;

-- Posts keep the score friends already saw; they just gain room for hundredths.

-- ---------------------------------------------------------------------------
-- First Ascent: the first 100 accounts get a number, #1–#100, in sign-up
-- order. Handed out by the database when the profile is made, never reused
-- (a deleted #12 stays retired) and never set or changed from the app.
-- Test and App Review accounts don't take a number.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists ascent_no smallint unique
    check (ascent_no between 1 and 100);

-- One row: the last number handed out. Only the trigger below touches it.
create table if not exists public.first_ascent_counter (
  id boolean primary key default true check (id),
  last_no smallint not null default 0
);
insert into public.first_ascent_counter (id) values (true) on conflict do nothing;
alter table public.first_ascent_counter enable row level security;
revoke all on public.first_ascent_counter from anon, authenticated;

create or replace function public.is_test_account(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select u.email ilike '%@apex-test.invalid' or u.email = 'appreview@example.com'
     from auth.users u where u.id = uid),
    false
  );
$$;
revoke all on function public.is_test_account(uuid) from public, anon, authenticated;

-- Before the trigger exists, number the hikers who already signed up.
drop trigger if exists profiles_first_ascent on public.profiles;

with ranked as (
  select
    p.id,
    (select last_no from public.first_ascent_counter)
      + row_number() over (order by p.created_at, p.id) as n
  from public.profiles p
  where p.ascent_no is null
    and not public.is_test_account(p.id)
)
update public.profiles p
set ascent_no = ranked.n
from ranked
where p.id = ranked.id
  and ranked.n <= 100;

update public.first_ascent_counter
set last_no = greatest(last_no, (select coalesce(max(ascent_no), 0) from public.profiles))
where id;

create or replace function public.assign_first_ascent()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  next_no smallint;
begin
  -- Nobody changes a number once it's given, including to give themselves one.
  if tg_op = 'UPDATE' then
    new.ascent_no := old.ascent_no;
    return new;
  end if;

  new.ascent_no := null;
  -- The app saves profiles with an upsert, so editing a username arrives as an
  -- insert first. An existing profile keeps its number (the update branch above).
  if public.is_test_account(new.id)
     or exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- The row lock makes simultaneous sign-ups take turns.
  update public.first_ascent_counter
  set last_no = last_no + 1
  where id and last_no < 100
  returning last_no into next_no;

  new.ascent_no := next_no;
  return new;
end;
$$;

create trigger profiles_first_ascent
  before insert or update on public.profiles
  for each row execute function public.assign_first_ascent();
