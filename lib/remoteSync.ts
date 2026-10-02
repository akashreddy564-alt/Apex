import AsyncStorage from '@react-native-async-storage/async-storage';

import { asLineString, isUuid, lineStringToEwkt } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type { HikeLog, PairwiseComparison, Trail, TrailRanking } from '@/types/trail';

const OUTBOX_KEY = 'apex-sync-outbox';

type OutboxKind = 'log' | 'ranking' | 'comparison';

interface OutboxEntry {
  kind: OutboxKind;
  id: string;
  attempts: number;
}

let outbox: OutboxEntry[] = [];
let outboxLoaded = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

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

  const remoteTrails = (trailsRes.data ?? [])
    .map((row) => mapTrail(row as Record<string, unknown>))
    .filter((trail): trail is Trail => trail !== null);
  const remoteLogs = (logsRes.data ?? []).map((row) => mapLog(row as Record<string, unknown>));
  const remoteRanks = (ranksRes.data ?? [])
    .map((row) => mapRanking(row as Record<string, unknown>))
    .filter((row): row is TrailRanking => row !== null);
  const remotePairs = (pairsRes.data ?? [])
    .map((row) => mapPair(row as Record<string, unknown>))
    .filter((row): row is PairwiseComparison => row !== null);

  await loadOutbox();
  const dirty = new Set(outbox.map((entry) => `${entry.kind}:${entry.id}`));
  const local = useTrailCache.getState();
  const trails =
    remoteTrails.length === 0 ? local.trails : mergeById(local.trails, remoteTrails, new Set());
  useTrailCache.setState({
    trails,
    logs: mergeById(local.logs, remoteLogs, dirtyIds(dirty, 'log')),
  });
  useRankingStore.setState({
    rankings: mergeById(
      useRankingStore.getState().rankings,
      remoteRanks,
      dirtyIds(dirty, 'ranking'),
    ),
    comparisons: mergeById(
      useRankingStore.getState().comparisons,
      remotePairs,
      dirtyIds(dirty, 'comparison'),
    ),
  });

  void flushOutbox();

  return {
    ok: true,
    message: trails.length === 0 ? 'No remote trails yet' : `${trails.length} trails`,
  };
}

/** Remote rows fill in; local rows that are missing remotely or still unsent stay. */
function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  dirty: Set<string>,
): T[] {
  const localById = new Map(local.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const row of remote) {
    seen.add(row.id);
    const kept = dirty.has(row.id) ? localById.get(row.id) : undefined;
    merged.push(kept ?? row);
  }
  for (const row of local) {
    if (!seen.has(row.id)) merged.push(row);
  }
  return merged;
}

function dirtyIds(dirty: Set<string>, kind: OutboxKind): Set<string> {
  const ids = new Set<string>();
  for (const key of dirty) {
    if (key.startsWith(`${kind}:`)) ids.add(key.slice(kind.length + 1));
  }
  return ids;
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

function mapRanking(row: Record<string, unknown>): TrailRanking | null {
  const bucket = row.bucket;
  if (bucket !== 'loved' && bucket !== 'fine' && bucket !== 'disliked') return null;
  if (typeof row.position !== 'string' || typeof row.trail_id !== 'string') return null;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    trail_id: row.trail_id,
    hike_type: typeof row.hike_type === 'string' ? row.hike_type : 'hike',
    bucket,
    position: row.position,
    comparison_count: num(row.comparison_count),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapPair(row: Record<string, unknown>): PairwiseComparison | null {
  const result = row.result;
  if (result !== 'new' && result !== 'opponent' && result !== 'too_close' && result !== 'skip') {
    return null;
  }
  if (
    typeof row.session_id !== 'string' ||
    typeof row.challenger_trail_id !== 'string' ||
    typeof row.opponent_trail_id !== 'string'
  ) {
    return null;
  }
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    session_id: row.session_id,
    hike_type: typeof row.hike_type === 'string' ? row.hike_type : 'hike',
    challenger_trail_id: row.challenger_trail_id,
    opponent_trail_id: row.opponent_trail_id,
    result,
    context_log_id: row.context_log_id == null ? null : String(row.context_log_id),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function pushLog(log: HikeLog): Promise<void> {
  await loadOutbox();
  if (await sendLog(log)) dequeue('log', log.id);
  else enqueue('log', log.id);
}

export async function pushRanking(ranking: TrailRanking): Promise<void> {
  await loadOutbox();
  if (await sendRanking(ranking)) dequeue('ranking', ranking.id);
  else enqueue('ranking', ranking.id);
}

export async function pushAllRankings(): Promise<void> {
  const rankings = useRankingStore.getState().rankings;
  for (const ranking of rankings) {
    await pushRanking(ranking);
  }
}

export async function pushComparison(comparison: PairwiseComparison): Promise<void> {
  await loadOutbox();
  if (comparison.context_log_id) {
    const log = useTrailCache.getState().logs.find((row) => row.id === comparison.context_log_id);
    if (log) await pushLog(log);
  }
  if (await sendComparison(comparison)) dequeue('comparison', comparison.id);
  else enqueue('comparison', comparison.id);
}

async function sendLog(log: HikeLog): Promise<boolean> {
  if (!supabase || !isUuid(log.id) || !isUuid(log.trail_id)) return true;
  const uid = await userId();
  if (!uid) return false;
  const { error } = await supabase.from('hike_logs').upsert({
    id: log.id,
    user_id: uid,
    trail_id: log.trail_id,
    duration_seconds: log.duration_seconds,
    photos: log.photos.filter((photo) => photo.startsWith('sb:')),
    notes: log.notes,
    recorded_path: log.recorded_path ? lineStringToEwkt(log.recorded_path) : null,
    created_at: log.created_at,
  });
  return !error;
}

async function sendRanking(ranking: TrailRanking): Promise<boolean> {
  if (!supabase || !isUuid(ranking.trail_id)) return true;
  const uid = await userId();
  if (!uid) return false;
  const row: Record<string, unknown> = {
    user_id: uid,
    trail_id: ranking.trail_id,
    hike_type: ranking.hike_type,
    bucket: ranking.bucket,
    position: ranking.position,
    comparison_count: ranking.comparison_count,
    updated_at: ranking.updated_at,
  };
  if (isUuid(ranking.id)) row.id = ranking.id;
  const { error } = await supabase
    .from('trail_rankings')
    .upsert(row, { onConflict: 'user_id,trail_id,hike_type' });
  return !error;
}

async function sendComparison(comparison: PairwiseComparison): Promise<boolean> {
  if (
    !supabase ||
    !isUuid(comparison.session_id) ||
    !isUuid(comparison.challenger_trail_id) ||
    !isUuid(comparison.opponent_trail_id)
  ) {
    return true;
  }
  const uid = await userId();
  if (!uid) return false;
  const challengerWins = comparison.result === 'new' || comparison.result === 'too_close';
  const row: Record<string, unknown> = {
    user_id: uid,
    session_id: comparison.session_id,
    hike_type: comparison.hike_type,
    challenger_trail_id: comparison.challenger_trail_id,
    opponent_trail_id: comparison.opponent_trail_id,
    result: comparison.result,
    winner_trail_id:
      comparison.result === 'skip'
        ? null
        : challengerWins
          ? comparison.challenger_trail_id
          : comparison.opponent_trail_id,
    loser_trail_id:
      comparison.result === 'skip'
        ? null
        : challengerWins
          ? comparison.opponent_trail_id
          : comparison.challenger_trail_id,
    context_log_id:
      comparison.context_log_id && isUuid(comparison.context_log_id)
        ? comparison.context_log_id
        : null,
    created_at: comparison.created_at,
  };
  if (isUuid(comparison.id)) row.id = comparison.id;
  const { error } = await supabase.from('pairwise_comparisons').upsert(row);
  return !error;
}

async function loadOutbox(): Promise<void> {
  if (outboxLoaded) return;
  outboxLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    outbox = Array.isArray(parsed) ? parsed : [];
  } catch {
    outbox = [];
  }
}

async function saveOutbox(): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

function enqueue(kind: OutboxKind, id: string): void {
  if (outbox.some((entry) => entry.kind === kind && entry.id === id)) {
    scheduleRetry();
    return;
  }
  outbox.push({ kind, id, attempts: 0 });
  void saveOutbox();
  scheduleRetry();
}

function dequeue(kind: OutboxKind, id: string): void {
  const next = outbox.filter((entry) => entry.kind !== kind || entry.id !== id);
  if (next.length === outbox.length) return;
  outbox = next;
  void saveOutbox();
}

function scheduleRetry(): void {
  if (retryTimer || outbox.length === 0) return;
  const wait = Math.min(30_000, 1000 * 2 ** Math.min(outbox[0]?.attempts ?? 0, 5));
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, wait);
}

export async function flushOutbox(): Promise<void> {
  await loadOutbox();
  for (const entry of [...outbox]) {
    const ok = await sendOutboxEntry(entry);
    if (ok) {
      dequeue(entry.kind, entry.id);
    } else {
      entry.attempts += 1;
      await saveOutbox();
    }
  }
  scheduleRetry();
}

async function sendOutboxEntry(entry: OutboxEntry): Promise<boolean> {
  if (entry.kind === 'log') {
    const log = useTrailCache.getState().logs.find((row) => row.id === entry.id);
    return log ? sendLog(log) : true;
  }
  if (entry.kind === 'ranking') {
    const ranking = useRankingStore.getState().rankings.find((row) => row.id === entry.id);
    return ranking ? sendRanking(ranking) : true;
  }
  const comparison = useRankingStore
    .getState()
    .comparisons.find((row) => row.id === entry.id);
  if (!comparison) return true;
  if (comparison.context_log_id) {
    const log = useTrailCache.getState().logs.find((row) => row.id === comparison.context_log_id);
    if (log && !(await sendLog(log))) return false;
  }
  return sendComparison(comparison);
}
