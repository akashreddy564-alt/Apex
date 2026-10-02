import {
  answer,
  bandScore,
  BUCKET_BANDS,
  BUCKETS,
  expectedComparisons,
  formatRankScore,
  migrateLegacyRankings,
  overallByScore,
  placementScoreLabel,
  positionForInsert,
  startSession,
  undo,
  withStoredScores,
  type Bucket,
  type PlacementAnswer,
  type StoredRanking,
} from '@/lib/ranking';

function place(order: string[], choices: PlacementAnswer[]): number {
  let session = startSession(order);
  for (const choice of choices) {
    session = answer(session, choice);
    if (session.done != null) break;
  }
  expect(session.done).not.toBeNull();
  return session.done!;
}

describe('bucket placement', () => {
  it('inserts at the start, middle, and end of a frozen order', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(place(order, ['new', 'new'])).toBe(0);
    expect(place(order, ['opponent', 'new'])).toBe(2);
    expect(place(order, ['opponent', 'opponent', 'opponent'])).toBe(4);
    expect(place([], [])).toBe(0);
  });

  it('keeps scores inside each band at one decimal', () => {
    for (const bucket of BUCKETS) {
      const { lo, hi } = BUCKET_BANDS[bucket];
      for (const count of [1, 2, 5, 20]) {
        const scores = Array.from({ length: count }, (_, index) =>
          bandScore(bucket, index, count),
        );
        for (const score of scores) {
          expect(score).toBeGreaterThanOrEqual(lo);
          expect(score).toBeLessThanOrEqual(hi);
          expect(score).toBe(Math.round(score * 10) / 10);
          expect(formatRankScore(score)).toMatch(/^\d+\.\d$/);
        }
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
        }
      }
    }
    expect(formatRankScore(8.7)).toBe('8.7');
    expect(formatRankScore(8)).toBe('8.0');
  });

  it('undoes a finished placement back to the previous bounds', () => {
    let session = startSession(['a', 'b', 'c', 'd']);
    session = answer(session, 'opponent');
    const mid = { low: session.low, high: session.high, history: session.history.length };
    session = answer(session, 'new');
    expect(session.done).not.toBeNull();

    session = undo(session);
    expect(session.done).toBeNull();
    expect(session.low).toBe(mid.low);
    expect(session.high).toBe(mid.high);
    expect(session.history).toHaveLength(mid.history);

    session = undo(session);
    expect(session.low).toBe(0);
    expect(session.high).toBe(3);
    expect(session.history).toHaveLength(0);
    expect(undo(session)).toBe(session);
  });

  it('stops on too close and writes one fractional key', () => {
    let session = startSession(['a', 'b', 'c', 'd']);
    session = answer(session, 'too_close');
    expect(session.done).toBe(1);
    expect(session.history[0]?.opponentId).toBe('b');

    const keys = ['a0', 'a1', 'a2', 'a3'];
    const inserted = positionForInsert(keys, session.done!);
    expect(inserted > keys[0] && inserted < keys[1]).toBe(true);
    expect(keys).toEqual(['a0', 'a1', 'a2', 'a3']);
  });

  it('places legacy rows into Loved without an Elo rating', () => {
    const migrated = migrateLegacyRankings([
      {
        id: 'r2',
        user_id: 'user',
        trail_id: 'diablo',
        rank_score: 1100,
        ordinal_rank: 2,
        comparison_count: 1,
      },
      {
        id: 'r1',
        user_id: 'user',
        trail_id: 'tam',
        rank_score: 1400,
        ordinal_rank: 1,
        comparison_count: 3,
      },
    ]);
    expect(migrated.map((row) => row.trail_id)).toEqual(['tam', 'diablo']);
    expect(migrated.every((row) => row.bucket === 'loved' && row.hike_type === 'hike')).toBe(
      true,
    );
    expect(migrated[0]?.position < migrated[1]?.position).toBe(true);
    expect(expectedComparisons(15)).toBe(4);
  });

  function unscored(
    trailId: string,
    hikeType: string,
    bucket: Bucket,
    position: string,
  ): Omit<StoredRanking, 'score'> {
    return {
      id: `rank-${hikeType}-${trailId}`,
      user_id: 'user',
      trail_id: trailId,
      hike_type: hikeType,
      bucket,
      position,
      comparison_count: 1,
      updated_at: '2020-01-01T00:00:00.000Z',
    };
  }

  it('shows the bucket name until that bucket reaches 3 hikes', () => {
    for (const bucket of BUCKETS) {
      const two = withStoredScores(
        [0, 1].map((index) => unscored(`${bucket}-${index}`, 'hike', bucket, `a${index}`)),
      );
      expect(two).toHaveLength(2);
      two.forEach((row, index) => {
        expect(row.score).toBe(bandScore(bucket, index, 2));
        expect(placementScoreLabel(bucket, two.length, row.score)).toBe(
          BUCKET_BANDS[bucket].label,
        );
      });

      const three = withStoredScores(
        [0, 1, 2].map((index) => unscored(`${bucket}-${index}`, 'hike', bucket, `a${index}`)),
      );
      expect(three).toHaveLength(3);
      for (const row of three) {
        expect(placementScoreLabel(bucket, three.length, row.score)).toBe(
          formatRankScore(row.score),
        );
      }
    }
  });

  it('keeps a 50-hike bucket inside its band and in position order', () => {
    for (const bucket of BUCKETS) {
      const { lo, hi } = BUCKET_BANDS[bucket];
      const scores = Array.from({ length: 50 }, (_, index) => bandScore(bucket, index, 50));
      for (const score of scores) {
        expect(score).toBeGreaterThanOrEqual(lo);
        expect(score).toBeLessThanOrEqual(hi);
        expect(score).toBe(Math.round(score * 10) / 10);
      }
      for (let index = 1; index < scores.length; index++) {
        expect(scores[index]).toBeLessThanOrEqual(scores[index - 1]);
      }
    }
  });

  it('sorts an Overall list of small buckets by stored score', () => {
    const summit = withStoredScores([
      unscored('alta', 'summit', 'loved', 'a0'),
      unscored('baja', 'summit', 'loved', 'a1'),
    ]);
    const day = withStoredScores([unscored('solo', 'day', 'loved', 'a0')]);
    const walk = withStoredScores([unscored('meadow', 'walk', 'fine', 'a0')]);
    const scramble = withStoredScores([
      unscored('scree', 'scramble', 'disliked', 'a0'),
      unscored('talus', 'scramble', 'disliked', 'a1'),
    ]);

    for (const row of [...summit, ...day, ...walk, ...scramble]) {
      const count = row.hike_type === 'day' || row.hike_type === 'walk' ? 1 : 2;
      expect(placementScoreLabel(row.bucket, count, row.score)).toBe(BUCKET_BANDS[row.bucket].label);
    }

    const merged = overallByScore([...scramble, ...walk, ...day, ...summit]);
    expect(merged.map((row) => row.trail_id)).toEqual([
      'alta',
      'solo',
      'baja',
      'meadow',
      'scree',
      'talus',
    ]);
    for (let index = 1; index < merged.length; index++) {
      expect(merged[index]?.score).toBeLessThanOrEqual(merged[index - 1]?.score ?? 0);
    }
    expect(day[0]?.score).toBe(bandScore('loved', 0, 1));
    expect(summit[0]?.score).toBe(bandScore('loved', 0, 2));
    expect(summit[1]?.score).toBe(bandScore('loved', 1, 2));
  });
});
