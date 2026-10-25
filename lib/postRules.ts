import type { Bucket } from './ranking.ts';

/** Past hikes older than this don't post, so a backlog never floods friends' feeds. */
export const POST_WINDOW_DAYS = 7;

/** A ranked hike posts when it happened within the last week. */
export function shouldPost(hikedAt: string, now: Date = new Date()): boolean {
  const at = Date.parse(hikedAt);
  if (!Number.isFinite(at)) return false;
  const ageMs = now.getTime() - at;
  return ageMs <= POST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export interface FeedPost {
  id: string;
  authorId: string;
  username: string;
  displayName: string;
  trailId: string;
  trailName: string;
  region: string;
  bucket: Bucket;
  score: number;
  bucketSize: number;
  hikedAt: string;
  postedAt: string;
  durationSeconds: number | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  notes: string | null;
  photos: string[];
  /** [lon, lat] points, already trimmed by the server. Empty when there's no route to show. */
  route: [number, number][];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  isMine: boolean;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function routePoints(value: unknown): [number, number][] {
  if (!value || typeof value !== 'object') return [];
  const geo = value as { type?: unknown; coordinates?: unknown };
  if (geo.type !== 'LineString' || !Array.isArray(geo.coordinates)) return [];
  return geo.coordinates.flatMap((point) => {
    if (!Array.isArray(point)) return [];
    const [lon, lat] = point as unknown[];
    return typeof lon === 'number' && typeof lat === 'number' ? [[lon, lat] as [number, number]] : [];
  });
}

const BUCKETS = new Set(['loved', 'fine', 'disliked']);

/** One row of `feed_posts()`. Null when the row is unusable. */
export function mapFeedPost(row: Record<string, unknown>): FeedPost | null {
  if (typeof row.post_id !== 'string' || typeof row.username !== 'string') return null;
  if (typeof row.bucket !== 'string' || !BUCKETS.has(row.bucket)) return null;
  return {
    id: row.post_id,
    authorId: String(row.author_id ?? ''),
    username: row.username,
    displayName: typeof row.display_name === 'string' ? row.display_name : row.username,
    trailId: String(row.trail_id ?? ''),
    trailName: typeof row.trail_name === 'string' ? row.trail_name : 'A hike',
    region: typeof row.region === 'string' ? row.region : '',
    bucket: row.bucket as Bucket,
    score: num(row.score) ?? 0,
    bucketSize: Math.max(1, num(row.bucket_size) ?? 1),
    hikedAt: String(row.hiked_at ?? row.posted_at ?? ''),
    postedAt: String(row.posted_at ?? ''),
    durationSeconds: num(row.duration_seconds),
    distanceKm: num(row.distance_km),
    elevationGainM: num(row.elevation_gain_m),
    notes: typeof row.notes === 'string' && row.notes.trim() ? row.notes.trim() : null,
    photos: Array.isArray(row.photos) ? row.photos.filter((p): p is string => typeof p === 'string') : [],
    route: routePoints(row.route),
    likeCount: num(row.like_count) ?? 0,
    commentCount: num(row.comment_count) ?? 0,
    liked: row.liked === true,
    isMine: row.is_mine === true,
  };
}

export interface MyRankedTrail {
  trailId: string;
  name: string;
  bucket: Bucket;
  score: number;
}

const NEIGHBOURS: Record<Bucket, Bucket[]> = {
  loved: ['loved', 'fine'],
  fine: ['loved', 'fine', 'disliked'],
  disliked: ['fine', 'disliked'],
};

/**
 * "Ranked above your Mount Si": compares a friend's score with your own
 * rankings. Only for scored posts, only against trails you ranked in the same
 * or a neighbouring bucket, and never against the same trail.
 */
export function comparisonTag(post: Pick<FeedPost, 'trailId' | 'bucket' | 'score' | 'bucketSize' | 'isMine'>, mine: MyRankedTrail[]): string | null {
  if (post.isMine || post.bucketSize < 3) return null;
  const nearby = mine.filter(
    (row) => row.trailId !== post.trailId && NEIGHBOURS[post.bucket].includes(row.bucket),
  );
  if (nearby.length === 0) return null;
  const below = nearby.filter((row) => row.score < post.score).sort((a, b) => b.score - a.score)[0];
  if (below) return `Ranked above your ${below.name}`;
  const above = nearby.filter((row) => row.score > post.score).sort((a, b) => a.score - b.score)[0];
  return above ? `Ranked below your ${above.name}` : null;
}

/** "Today", "Yesterday", "Saturday" within a week, then "Oct 12". */
export function hikeDayLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(at)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return at.toLocaleDateString('en-US', { weekday: 'long' });
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
