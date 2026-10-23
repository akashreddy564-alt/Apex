import { formatRankScore, type Bucket } from './ranking.ts';

export type BucketShortLabel = 'Loved' | 'Fine' | 'Nope';

export const SHORT_LABELS: Record<Bucket, BucketShortLabel> = {
  loved: 'Loved',
  fine: 'Fine',
  disliked: 'Nope',
};

export interface ScoreBadgeContent {
  /** One-decimal score, or null while the bucket has fewer than 3 hikes. */
  value: string | null;
  label: BucketShortLabel;
  tone: Bucket;
}

/** What a score badge shows. Same rule as `placementScoreLabel`: no number below 3 hikes. */
export function scoreBadgeContent(bucket: Bucket, count: number, score: number): ScoreBadgeContent {
  return {
    value: count >= 3 ? formatRankScore(score) : null,
    label: SHORT_LABELS[bucket],
    tone: bucket,
  };
}
