-- Store the 0–10 band score on every ranking.
-- The row label may show the bucket name until that bucket has 3 hikes.
-- Sorting and the Overall merge read this column.

alter table public.trail_rankings
  add column if not exists score numeric(3, 1);

-- Same bands as bandScore: Loved 7–10, Fine 4–6.9, Didn't like 0–3.9.
-- Best-first order is the fractional position. Rounded to 0.1 and clamped.
update public.trail_rankings as ranking
set score = scored.score
from (
  select
    id,
    least(
      hi,
      greatest(
        lo,
        round((hi - ((idx + 0.5) * (hi - lo)) / cnt) * 10) / 10
      )
    ) as score
  from (
    select
      id,
      (row_number() over (
        partition by user_id, hike_type, bucket
        order by position collate "C", id
      ) - 1)::numeric as idx,
      count(*) over (partition by user_id, hike_type, bucket)::numeric as cnt,
      case bucket
        when 'loved' then 7
        when 'fine' then 4
        else 0
      end::numeric as lo,
      case bucket
        when 'loved' then 10
        when 'fine' then 6.9
        else 3.9
      end::numeric as hi
    from public.trail_rankings
    where score is null
  ) ranked
) scored
where ranking.id = scored.id;

alter table public.trail_rankings
  drop constraint if exists trail_rankings_score_check;

alter table public.trail_rankings
  add constraint trail_rankings_score_check
  check (score is null or (score >= 0 and score <= 10));

create index if not exists trail_rankings_score_idx
  on public.trail_rankings (user_id, score desc);

grant select, insert, update, delete on public.trail_rankings to authenticated;
