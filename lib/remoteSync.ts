import { asLineString, isUuid, lineStringToEwkt } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useComparisonStore } from '@/stores/comparisonStore';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type { HikeLog, PairwiseComparison, Trail, TrailRanking } from '@/types/trail';

export interface SyncResult {
  ok: boolean;
  message: string;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapTrail(row: Record<string, unknown>): Trail | null {
  const path = asLineString(row.path);
  if (!path || typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  const profile = Array.isArray(row.elevation_profile) ? row.elevation_profile : [];
  return {
    id: row.id,
    name: row.name,
    region: typeof row.region === 'string' ? row.region : '',
    distance_km: num(row.distance_km),
    elevation_gain_m: num(row.elevation_gain_m),
    peak_elevation_m: num(row.peak_elevation_m),
    path,
    elevation_profile: profile
      .map((sample) => {
        if (!sample || typeof sample !== 'object') return null;
        const point = sample as { distance_m?: unknown; elevation_m?: unknown };
        return {
          distance_m: num(point.distance_m),
          elevation_m: num(point.elevation_m),
        };
      })
      .filter((sample): sample is Trail['elevation_profile'][number] => sample !== null),
    avg_moving_time_seconds:
      row.avg_moving_time_seconds == null ? null : num(row.avg_moving_time_seconds),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function userId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Pull trails, logs, rankings, and comparisons. No-ops without a session. */
export async function pullRemote(): Promise<SyncResult> {
  if (!supabase) return { ok: true, message: 'Local mode' };
  const uid = await userId();
  if (!uid) return { ok: true, message: 'Signed out' };

  const [trailsRes, logsRes, ranksRes, pairsRes] = await Promise.all([
    supabase.from('trails_api').select('*'),
    supabase.from('hike_logs_api').select('*').eq('user_id', uid),
    supabase.from('trail_rankings').select('*').eq('user_id', uid),
    supabase.from('pairwise_comparisons').select('*').eq('user_id', uid),
  ]);

  const error = trailsRes.error || logsRes.error || ranksRes.error || pairsRes.error;
  if (error) return { ok: false, message: error.message };

  const trails = (trailsRes.data ?? [])
    .map((row) => mapTrail(row as Record<string, unknown>))
    .filter((trail): trail is Trail => trail !== null);
  useTrailCache.setState({
    trails,
    logs: (logsRes.data ?? []).map((row) => mapLog(row as Record<string, unknown>)),
  });

  const rankings = (ranksRes.data ?? []).map((row) =>
    mapRanking(row as Record<string, unknown>),
  );
  useRankingStore.getState().setRankings(rankings);
  useComparisonStore
    .getState()
    .setAll((pairsRes.data ?? []).map((row) => mapPair(row as Record<string, unknown>)));

  return {
    ok: true,
    message: trails.length === 0 ? 'No remote trails yet' : `${trails.length} trails`,
  };
}

function mapLog(row: Record<string, unknown>): HikeLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    trail_id: String(row.trail_id),
    duration_seconds: num(row.duration_seconds),
    photos: Array.isArray(row.photos) ? row.photos.map(String) : [],
    notes: row.notes == null ? null : String(row.notes),
    recorded_path: asLineString(row.recorded_path),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapRanking(row: Record<string, unknown>): TrailRanking {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    trail_id: String(row.trail_id),
    elo_rating: num(row.elo_rating, 1000),
    rank_score: num(row.rank_score, 1000),
    ordinal_rank: row.ordinal_rank == null ? null : num(row.ordinal_rank),
    comparison_count: num(row.comparison_count),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapPair(row: Record<string, unknown>): PairwiseComparison {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    winner_trail_id: String(row.winner_trail_id),
    loser_trail_id: String(row.loser_trail_id),
    context_log_id: row.context_log_id == null ? null : String(row.context_log_id),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function pushLog(log: HikeLog): Promise<void> {
  if (!supabase || !isUuid(log.id) || !isUuid(log.trail_id)) return;
  const uid = await userId();
  if (!uid) return;
  await supabase.from('hike_logs').upsert({
    id: log.id,
    user_id: uid,
    trail_id: log.trail_id,
    duration_seconds: log.duration_seconds,
    photos: log.photos,
    notes: log.notes,
    recorded_path: log.recorded_path ? lineStringToEwkt(log.recorded_path) : null,
    created_at: log.created_at,
  });
}

export async function pushRanking(ranking: TrailRanking): Promise<void> {
  if (!supabase || !isUuid(ranking.trail_id)) return;
  const uid = await userId();
  if (!uid) return;
  const row: Record<string, unknown> = {
    user_id: uid,
    trail_id: ranking.trail_id,
    elo_rating: ranking.elo_rating,
    rank_score: ranking.rank_score,
    ordinal_rank: ranking.ordinal_rank,
    comparison_count: ranking.comparison_count,
    updated_at: ranking.updated_at,
  };
  if (isUuid(ranking.id)) row.id = ranking.id;
  await supabase.from('trail_rankings').upsert(row, { onConflict: 'user_id,trail_id' });
}

export async function pushAllRankings(): Promise<void> {
  const rankings = useRankingStore.getState().rankings;
  await Promise.all(rankings.map((ranking) => pushRanking(ranking)));
}

export async function pushComparison(comparison: PairwiseComparison): Promise<void> {
  if (
    !supabase ||
    !isUuid(comparison.winner_trail_id) ||
    !isUuid(comparison.loser_trail_id)
  ) {
    return;
  }
  const uid = await userId();
  if (!uid) return;
  const row: Record<string, unknown> = {
    user_id: uid,
    winner_trail_id: comparison.winner_trail_id,
    loser_trail_id: comparison.loser_trail_id,
    context_log_id:
      comparison.context_log_id && isUuid(comparison.context_log_id)
        ? comparison.context_log_id
        : null,
    created_at: comparison.created_at,
  };
  if (isUuid(comparison.id)) row.id = comparison.id;
  await supabase.from('pairwise_comparisons').upsert(row);
}
