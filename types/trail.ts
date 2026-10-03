/**
 * Apex domain types — mirrors supabase/migrations/001_initial_schema.sql
 */

export interface GeoJSONPosition {
  /** [longitude, latitude] or [longitude, latitude, altitude] */
  0: number;
  1: number;
  2?: number;
  length: 2 | 3;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][] | [number, number, number][];
}

export interface ElevationSample {
  distance_m: number;
  elevation_m: number;
}

export interface Trail {
  id: string;
  name: string;
  region: string;
  /** Null when the trail has no measured distance. Never store 0 for that. */
  distance_km: number | null;
  elevation_gain_m: number | null;
  peak_elevation_m: number | null;
  /** Canonical trail path as GeoJSON LineString */
  path: GeoJSONLineString;
  elevation_profile: ElevationSample[];
  avg_moving_time_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface HikeLog {
  id: string;
  user_id: string;
  trail_id: string;
  duration_seconds: number;
  photos: string[];
  notes: string | null;
  recorded_path: GeoJSONLineString | null;
  created_at: string;
}

export interface TrailRanking {
  id: string;
  user_id: string;
  trail_id: string;
  elo_rating: number;
  rank_score: number;
  ordinal_rank: number | null;
  comparison_count: number;
  updated_at: string;
}

export interface PairwiseComparison {
  id: string;
  user_id: string;
  winner_trail_id: string;
  loser_trail_id: string;
  context_log_id: string | null;
  created_at: string;
}

/** Trail joined with the current user's ranking row (if any) */
export interface RankedTrail extends Trail {
  ranking: TrailRanking | null;
}

export interface TrailTelemetry {
  peak_elevation_m: number | null;
  elevation_gain_m: number | null;
  distance_km: number | null;
  avg_moving_time_seconds: number | null;
}

export type ComparisonChoice = 'challenger' | 'opponent';

export interface ComparisonRound {
  challenger: Trail;
  opponent: Trail;
  /** Binary-search bounds into the sorted ranking list */
  low: number;
  high: number;
}

export interface LeaderboardEntry {
  trail: Trail;
  ranking: TrailRanking;
  isNew?: boolean;
}
