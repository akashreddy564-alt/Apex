-- Store the 0–10 band score on every ranking.
-- The row label may show the bucket name until that bucket has 3 hikes.
-- Sorting and the Overall merge read this column.

alter table public.trail_rankings
  add column if not exists score numeric(3, 1);

create index if not exists trail_rankings_score_idx
  on public.trail_rankings (user_id, score desc);
