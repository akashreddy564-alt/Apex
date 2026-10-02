-- Replace Elo with a bucket plus a fractional position.
-- One ranking row per (user, trail, hike type). Comparisons are an append-only log.
-- 002 and 003 live on later branches; this file is numbered so it still sorts after them.

alter table public.trail_rankings
  add column if not exists hike_type text not null default 'hike',
  add column if not exists bucket text not null default 'loved',
  add column if not exists position text;

-- Zero-padded keys such as a000010 are illegal fractional indexes.
-- Suffix 1 so the key never ends in 0, and give null ordinals their own row.
update public.trail_rankings as ranking
set position = keyed.key
from (
  select
    id,
    'a' || case when n % 10 = 0 then (n + 1)::text else n::text end || '1' as key
  from (
    select
      id,
      row_number() over (
        partition by user_id, hike_type, bucket
        order by coalesce(ordinal_rank, 1000000), id
      ) as n
    from public.trail_rankings
    where position is null
  ) numbered
) keyed
where ranking.id = keyed.id;

alter table public.trail_rankings
  alter column position set not null;

alter table public.trail_rankings
  drop column if exists elo_rating,
  drop column if exists rank_score,
  drop column if exists ordinal_rank;

alter table public.trail_rankings
  drop constraint if exists trail_rankings_bucket_check;

alter table public.trail_rankings
  add constraint trail_rankings_bucket_check
  check (bucket in ('loved', 'fine', 'disliked'));

alter table public.trail_rankings
  drop constraint if exists trail_rankings_user_id_trail_id_key;

alter table public.trail_rankings
  drop constraint if exists trail_rankings_user_trail_type_key;

alter table public.trail_rankings
  add constraint trail_rankings_user_trail_type_key
  unique (user_id, trail_id, hike_type);

drop index if exists public.trail_rankings_user_rank_idx;

create index if not exists trail_rankings_order_idx
  on public.trail_rankings (user_id, hike_type, bucket, position);

alter table public.pairwise_comparisons
  alter column winner_trail_id drop not null,
  alter column loser_trail_id drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.pairwise_comparisons'::regclass
      and con.contype = 'c'
  loop
    execute format(
      'alter table public.pairwise_comparisons drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.pairwise_comparisons
  add column if not exists session_id uuid,
  add column if not exists hike_type text not null default 'hike',
  add column if not exists challenger_trail_id uuid references public.trails (id) on delete cascade,
  add column if not exists opponent_trail_id uuid references public.trails (id) on delete cascade,
  add column if not exists result text;

alter table public.pairwise_comparisons
  add constraint pairwise_result_check
  check (result is null or result in ('new', 'opponent', 'too_close', 'skip'));

alter table public.pairwise_comparisons
  add constraint pairwise_distinct_trails
  check (
    winner_trail_id is null
    or loser_trail_id is null
    or winner_trail_id <> loser_trail_id
  );

create index if not exists pairwise_session_idx
  on public.pairwise_comparisons (user_id, session_id);

grant select, insert, update, delete on public.trail_rankings to authenticated;
grant select, insert, update, delete on public.pairwise_comparisons to authenticated;
