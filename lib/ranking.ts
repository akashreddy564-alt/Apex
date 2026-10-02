import { generateKeyBetween } from 'fractional-indexing';

/** Ranking lists. A past hike stores one of these ids, not a separate label set. */
export const HIKE_TYPES = ['hike'] as const;
export type HikeTypeId = (typeof HIKE_TYPES)[number];

/** One list per user, trail, and hike type. D can add types without a new key. */
export const DEFAULT_HIKE_TYPE: HikeTypeId = 'hike';

export const BUCKETS = ['loved', 'fine', 'disliked'] as const;

export type Bucket = (typeof BUCKETS)[number];

export type PlacementAnswer = 'new' | 'opponent' | 'too_close' | 'skip';

export interface BucketBand {
  label: string;
  lo: number;
  hi: number;
}

/** Bands chosen for Apex. A position-based score cannot leave its band. */
export const BUCKET_BANDS: Record<Bucket, BucketBand> = {
  loved: { label: 'Loved', lo: 7, hi: 10 },
  fine: { label: 'Fine', lo: 4, hi: 6.9 },
  disliked: { label: "Didn't like", lo: 0, hi: 3.9 },
};

export interface PlacementStep {
  low: number;
  high: number;
  probe: number | null;
  skipped: string[];
  answer: PlacementAnswer;
  opponentId: string;
}

/**
 * Binary insert over a frozen best-first order.
 * `done` is the index where the new hike should be inserted. Nothing here writes storage.
 */
export interface PlacementSession {
  order: string[];
  low: number;
  high: number;
  /** Set when Skip moves the comparison off the midpoint. */
  probe: number | null;
  skipped: string[];
  history: PlacementStep[];
  done: number | null;
}

export interface StoredRanking {
  id: string;
  user_id: string;
  trail_id: string;
  hike_type: string;
  bucket: Bucket;
  /** Fractional index. Lower sorts first (better) inside the bucket. */
  position: string;
  /**
   * 0–10 band score. Always stored, including buckets of 1 or 2.
   * Sorting and the Overall merge read this. The row label does not, until the bucket has 3 hikes.
   */
  score: number;
  comparison_count: number;
  updated_at: string;
}

export interface LegacyRanking {
  id?: string;
  user_id?: string;
  trail_id?: string;
  hike_type?: string;
  bucket?: string;
  position?: string;
  elo_rating?: number;
  rank_score?: number;
  ordinal_rank?: number | null;
  comparison_count?: number;
  updated_at?: string;
}

export function startSession(order: string[]): PlacementSession {
  if (order.length === 0) {
    return {
      order,
      low: 0,
      high: -1,
      probe: null,
      skipped: [],
      history: [],
      done: 0,
    };
  }
  return {
    order,
    low: 0,
    high: order.length - 1,
    probe: null,
    skipped: [],
    history: [],
    done: null,
  };
}

export function currentProbe(session: PlacementSession): number {
  if (session.probe != null) return session.probe;
  return (session.low + session.high) >> 1;
}

export function expectedComparisons(count: number): number {
  if (count <= 0) return 0;
  return Math.ceil(Math.log2(count + 1));
}

function nearestUntested(
  order: string[],
  probe: number,
  low: number,
  high: number,
  skipped: string[],
): number | null {
  const skip = new Set(skipped);
  for (let distance = 1; distance <= high - low; distance++) {
    const right = probe + distance;
    const left = probe - distance;
    if (right <= high && !skip.has(order[right])) return right;
    if (left >= low && !skip.has(order[left])) return left;
  }
  return null;
}

/** Returns the next session. A finished session ignores further answers. */
export function answer(
  session: PlacementSession,
  choice: PlacementAnswer,
): PlacementSession {
  if (session.done != null) return session;
  if (session.order.length === 0) return { ...session, done: 0 };

  const probe = currentProbe(session);
  const opponentId = session.order[probe];
  if (!opponentId) return session;

  const history = [
    ...session.history,
    {
      low: session.low,
      high: session.high,
      probe: session.probe,
      skipped: session.skipped,
      answer: choice,
      opponentId,
    },
  ];

  if (choice === 'too_close') {
    return { ...session, history, probe: null, done: probe };
  }

  if (choice === 'skip') {
    const skipped = [...session.skipped, opponentId];
    const alternate = nearestUntested(session.order, probe, session.low, session.high, skipped);
    if (alternate == null) {
      return { ...session, history, skipped, probe: null, done: probe };
    }
    return { ...session, history, skipped, probe: alternate };
  }

  const low = choice === 'opponent' ? probe + 1 : session.low;
  const high = choice === 'new' ? probe - 1 : session.high;
  const next: PlacementSession = {
    ...session,
    low,
    high,
    probe: null,
    history,
  };
  if (low > high) return { ...next, done: low };
  return next;
}

/** Pop one answer. Clears a finished placement so the session can continue. */
export function undo(session: PlacementSession): PlacementSession {
  const step = session.history[session.history.length - 1];
  if (!step) return session;
  return {
    ...session,
    low: step.low,
    high: step.high,
    probe: step.probe,
    skipped: step.skipped,
    history: session.history.slice(0, -1),
    done: null,
  };
}

/**
 * Score for 0-based rank `index` inside a bucket of `count` hikes (best = 0).
 * Rounded to 0.1 and clamped to the band, so it cannot inflate past the bucket.
 */
export function bandScore(bucket: Bucket, index: number, count: number): number {
  if (count <= 0) throw new Error('Bucket count must be positive');
  const { lo, hi } = BUCKET_BANDS[bucket];
  const raw = hi - ((index + 0.5) * (hi - lo)) / count;
  const rounded = Math.round(raw * 10) / 10;
  return Math.min(hi, Math.max(lo, rounded));
}

/** Always one decimal, including trailing zeros (`8.0`). */
export function formatRankScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Row label, or the trail-detail line when `ordinal` is set.
 * Buckets of 1 or 2 show the bucket name. From 3 up, the one-decimal score.
 * With an ordinal, a small bucket is "#1 in Fine" and a bucket of 3 or more
 * adds the score: "#1 in Fine · 5.5".
 * `bandScore` is unchanged and still returns a number at every count.
 */
export function placementScoreLabel(
  bucket: Bucket,
  count: number,
  score: number,
  ordinal?: number,
): string {
  const name = BUCKET_BANDS[bucket].label;
  if (ordinal == null) {
    if (count < 3) return name;
    return formatRankScore(score);
  }
  const place = `#${ordinal} in ${name}`;
  if (count < 3) return place;
  return `${place} · ${formatRankScore(score)}`;
}

function rankingKey(row: { user_id: string; hike_type: string; trail_id: string }): string {
  return `${row.user_id}\0${row.hike_type}\0${row.trail_id}`;
}

/**
 * Write a band score onto every row from its position in that hike type and bucket.
 * One placement refreshes the whole bucket. The previous score is not reused.
 */
export function withStoredScores<T extends Omit<StoredRanking, 'score'> & { score?: number }>(
  rows: T[],
): (T & { score: number })[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.user_id}\0${row.hike_type}\0${row.bucket}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const scores = new Map<string, number>();
  for (const list of groups.values()) {
    const sorted = sortByPosition(list);
    sorted.forEach((row, index) => {
      scores.set(rankingKey(row), bandScore(row.bucket, index, sorted.length));
    });
  }

  return rows.map((row) => ({
    ...row,
    score: scores.get(rankingKey(row)) ?? bandScore(row.bucket, 0, 1),
  }));
}

/**
 * Overall list across hike types. Order is the stored score, highest first.
 * It does not recompute from position and it does not drop buckets of 1 or 2.
 */
export function overallByScore<T extends Pick<StoredRanking, 'score' | 'position' | 'trail_id'>>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.position < b.position) return -1;
    if (a.position > b.position) return 1;
    if (a.trail_id < b.trail_id) return -1;
    if (a.trail_id > b.trail_id) return 1;
    return 0;
  });
}

/** Key that sorts between the neighbors of an insertion index. One new row, no renumber. */
export function positionForInsert(sortedPositions: string[], index: number): string {
  const before = index > 0 ? sortedPositions[index - 1] : null;
  const after = index < sortedPositions.length ? sortedPositions[index] : null;
  return generateKeyBetween(before, after);
}

/**
 * Rows whose score, bucket, or position changed. A move between buckets
 * includes the old bucket so those server scores are not left stale.
 */
export function rankingsToSync<T extends { user_id: string; hike_type: string; trail_id: string; score: number; bucket: string; position: string }>(
  before: T[],
  after: T[],
): T[] {
  const previous = new Map(before.map((row) => [rankingKey(row), row]));
  return after.filter((row) => {
    const old = previous.get(rankingKey(row));
    if (!old) return true;
    return old.score !== row.score || old.bucket !== row.bucket || old.position !== row.position;
  });
}

export function sortByPosition<T extends { position: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
}

export function isBucket(value: string): value is Bucket {
  return (BUCKETS as readonly string[]).includes(value);
}

/**
 * Keep an existing list when rankings were stored as Elo.
 * Order is preserved (ordinal, else higher Elo first) and placed in Loved.
 */
export function migrateLegacyRankings(rows: LegacyRanking[]): StoredRanking[] {
  const current: Omit<StoredRanking, 'score'>[] = [];
  const legacy: LegacyRanking[] = [];

  for (const row of rows) {
    if (
      row.trail_id &&
      row.user_id &&
      row.position &&
      row.bucket &&
      isBucket(row.bucket)
    ) {
      current.push({
        id: row.id ?? `rank-${row.trail_id}`,
        user_id: row.user_id,
        trail_id: row.trail_id,
        hike_type: row.hike_type ?? DEFAULT_HIKE_TYPE,
        bucket: row.bucket,
        position: row.position,
        comparison_count: row.comparison_count ?? 0,
        updated_at: row.updated_at ?? new Date(0).toISOString(),
      });
    } else if (row.trail_id && row.user_id) {
      legacy.push(row);
    }
  }

  const ordered = [...legacy].sort((a, b) => {
    if (a.ordinal_rank != null && b.ordinal_rank != null) {
      return a.ordinal_rank - b.ordinal_rank;
    }
    return (b.rank_score ?? b.elo_rating ?? 0) - (a.rank_score ?? a.elo_rating ?? 0);
  });

  let previous: string | null = null;
  const converted = ordered.map((row) => {
    previous = generateKeyBetween(previous, null);
    return {
      id: row.id ?? `rank-${row.trail_id}`,
      user_id: row.user_id!,
      trail_id: row.trail_id!,
      hike_type: DEFAULT_HIKE_TYPE,
      bucket: 'loved' as const,
      position: previous,
      comparison_count: row.comparison_count ?? 0,
      updated_at: row.updated_at ?? new Date(0).toISOString(),
    };
  });

  return withStoredScores([...current, ...converted]);
}

export interface PlacementSummary {
  ranking: StoredRanking;
  score: number;
  ordinal: number;
  count: number;
}

export function describePlacement(
  rankings: StoredRanking[],
  trailId: string,
  hikeType: string = DEFAULT_HIKE_TYPE,
): PlacementSummary | null {
  const ranking = rankings.find(
    (row) => row.trail_id === trailId && row.hike_type === hikeType,
  );
  if (!ranking) return null;
  const group = sortByPosition(
    rankings.filter(
      (row) =>
        row.user_id === ranking.user_id &&
        row.bucket === ranking.bucket &&
        row.hike_type === hikeType,
    ),
  );
  const index = group.findIndex((row) => row.trail_id === trailId);
  if (index < 0) return null;
  return {
    ranking,
    score: ranking.score,
    ordinal: index + 1,
    count: group.length,
  };
}
