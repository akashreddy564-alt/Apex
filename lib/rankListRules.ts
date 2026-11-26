/**
 * Rows for ranked lists, trail boards and taste match (migration 028).
 * Pure, so node tests can cover them without Supabase.
 */
import type { Bucket } from './ranking.ts';

export const PRIVATE_TRAIL = 'A private trail';
export const TOP_COUNT = 10;

export interface RankedRow {
  /** Null for a trail you can't open (someone's private trail). */
  trailId: string | null;
  name: string;
  region: string;
  bucket: Bucket;
  score: number;
  rank: number;
  difficulty: number | null;
  /** [lon, lat] points; only the top ten carry a route. */
  route: [number, number][];
}

export interface BoardTrail {
  trailId: string;
  name: string;
  region: string;
  avgScore: number;
  rankers: number;
  place: number;
}

export interface TasteMatch {
  shared: number;
  /** 0–100, or null below 4 shared trails. */
  agreement: number | null;
}

export interface TastePick {
  trailId: string;
  name: string;
  region: string;
  lovers: number;
  names: string[];
}

const BUCKETS = new Set(['loved', 'fine', 'disliked']);

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function points(value: unknown): [number, number][] {
  const geo = value as { type?: unknown; coordinates?: unknown } | null;
  if (!geo || geo.type !== 'LineString' || !Array.isArray(geo.coordinates)) return [];
  return geo.coordinates.flatMap((point) => {
    if (!Array.isArray(point)) return [];
    const [lon, lat] = point as unknown[];
    return typeof lon === 'number' && typeof lat === 'number' ? [[lon, lat] as [number, number]] : [];
  });
}

/** One row of `person_rankings()`. */
export function mapRankedRow(row: Record<string, unknown>): RankedRow | null {
  const rank = num(row.list_rank);
  if (rank == null || typeof row.bucket !== 'string' || !BUCKETS.has(row.bucket)) return null;
  const readable = row.readable === true && typeof row.trail_id === 'string';
  return {
    trailId: readable ? (row.trail_id as string) : null,
    name: readable ? text(row.trail_name) || 'A hike' : PRIVATE_TRAIL,
    region: readable ? text(row.region) : '',
    bucket: row.bucket as Bucket,
    score: num(row.score) ?? 0,
    rank,
    difficulty: num(row.difficulty),
    route: readable ? points(row.route) : [],
  };
}

/** "Maya’s", "Desk hikers’". */
export function possessive(name: string): string {
  return /s$/i.test(name.trim()) ? `${name.trim()}’` : `${name.trim()}’s`;
}

/** The top ten and everything after it. */
export function splitTopTen<T extends { rank: number }>(rows: T[]): { top: T[]; rest: T[] } {
  return { top: rows.filter((r) => r.rank <= TOP_COUNT), rest: rows.filter((r) => r.rank > TOP_COUNT) };
}

/** One row of a `*_trail_board()`. */
export function mapBoardTrail(row: Record<string, unknown>): BoardTrail | null {
  if (typeof row.trail_id !== 'string') return null;
  return {
    trailId: row.trail_id,
    name: text(row.trail_name) || 'A hike',
    region: text(row.region),
    avgScore: num(row.avg_score) ?? 0,
    rankers: num(row.rankers) ?? 0,
    place: num(row.place) ?? 0,
  };
}

/** `taste_match()` returns at most one row; none when you can't see them. */
export function mapTasteMatch(rows: Record<string, unknown>[]): TasteMatch | null {
  const row = rows[0];
  if (!row) return null;
  return { shared: num(row.shared) ?? 0, agreement: num(row.agreement) };
}

/** One row of `taste_picks()`. */
export function mapTastePick(row: Record<string, unknown>): TastePick | null {
  if (typeof row.trail_id !== 'string') return null;
  return {
    trailId: row.trail_id,
    name: text(row.trail_name) || 'A hike',
    region: text(row.region),
    lovers: num(row.lovers) ?? 0,
    names: Array.isArray(row.names) ? row.names.filter((n): n is string => typeof n === 'string') : [],
  };
}
