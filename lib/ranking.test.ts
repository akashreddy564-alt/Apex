import assert from 'node:assert/strict';
import { test } from 'node:test';

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
} from './ranking.ts';

function place(order: string[], choices: PlacementAnswer[]): number {
  let session = startSession(order);
  for (const choice of choices) {
    session = answer(session, choice);
    if (session.done != null) break;
  }
  assert.notEqual(session.done, null);
  return session.done!;
}

test('binary insert lands at the start, middle, and end of a frozen order', () => {
  const order = ['a', 'b', 'c', 'd'];
  assert.equal(place(order, ['new', 'new']), 0);
  assert.equal(place(order, ['opponent', 'new']), 2);
  assert.equal(place(order, ['opponent', 'opponent', 'opponent']), 4);
  assert.equal(place([], []), 0);
});

test('scores stay inside each bucket band and use one decimal', () => {
  for (const bucket of BUCKETS) {
    const { lo, hi } = BUCKET_BANDS[bucket];
    for (const count of [1, 2, 5, 20]) {
      const scores = Array.from({ length: count }, (_, index) =>
        bandScore(bucket, index, count),
      );
      for (const score of scores) {
        assert.ok(score >= lo && score <= hi, `${bucket} ${score} outside ${lo}-${hi}`);
        assert.equal(score, Math.round(score * 10) / 10);
        assert.match(formatRankScore(score), /^\d+\.\d$/);
      }
      for (let i = 1; i < scores.length; i++) {
        assert.ok(scores[i] <= scores[i - 1]);
      }
    }
  }
  assert.equal(formatRankScore(8.7), '8.7');
  assert.equal(formatRankScore(8), '8.0');
});

test('undo restores the previous bounds and clears a finished placement', () => {
  let session = startSession(['a', 'b', 'c', 'd']);
  session = answer(session, 'opponent');
  const mid = { low: session.low, high: session.high, history: session.history.length };
  session = answer(session, 'new');
  assert.notEqual(session.done, null);

  session = undo(session);
  assert.equal(session.done, null);
  assert.equal(session.low, mid.low);
  assert.equal(session.high, mid.high);
  assert.equal(session.history.length, mid.history);

  session = undo(session);
  assert.equal(session.low, 0);
  assert.equal(session.high, 3);
  assert.equal(session.history.length, 0);
  assert.equal(undo(session), session);
});

test('too close places the hike on the current opponent and stops', () => {
  let session = startSession(['a', 'b', 'c', 'd']);
  session = answer(session, 'too_close');
  assert.equal(session.done, 1);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].opponentId, 'b');

  const stuck = answer(session, 'new');
  assert.equal(stuck.done, 1);
  assert.equal(stuck.history.length, 1);

  const keys = ['a0', 'a1', 'a2', 'a3'];
  const inserted = positionForInsert(keys, session.done!);
  assert.ok(keys[0] < inserted && inserted < keys[1]);
});

test('an insert writes one fractional key without renumbering neighbors', () => {
  const keys = ['a0', 'a1', 'a2'];
  const before = positionForInsert(keys, 0);
  const between = positionForInsert(keys, 2);
  const after = positionForInsert(keys, 3);
  assert.ok(before < keys[0]);
  assert.ok(keys[1] < between && between < keys[2]);
  assert.ok(after > keys[2]);
  assert.deepEqual(keys, ['a0', 'a1', 'a2']);
});

test('legacy Elo rows keep their order inside Loved', () => {
  const migrated = migrateLegacyRankings([
    {
      id: 'r2',
      user_id: 'user',
      trail_id: 'diablo',
      elo_rating: 1100,
      rank_score: 1100,
      ordinal_rank: 2,
      comparison_count: 1,
    },
    {
      id: 'r1',
      user_id: 'user',
      trail_id: 'tam',
      elo_rating: 1400,
      rank_score: 1400,
      ordinal_rank: 1,
      comparison_count: 3,
    },
  ]);
  assert.equal(migrated.length, 2);
  assert.equal(migrated[0].trail_id, 'tam');
  assert.equal(migrated[1].trail_id, 'diablo');
  assert.ok(migrated.every((row) => row.bucket === 'loved' && row.hike_type === 'hike'));
  assert.ok(migrated[0].position < migrated[1].position);
  assert.equal(migrated[0].comparison_count, 3);
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

test('rows show the bucket name until that bucket reaches 3 hikes', () => {
  for (const bucket of BUCKETS) {
    const two = withStoredScores(
      [0, 1].map((index) => unscored(`${bucket}-${index}`, 'hike', bucket, `a${index}`)),
    );
    assert.equal(two.length, 2);
    for (const [index, row] of two.entries()) {
      assert.equal(row.score, bandScore(bucket, index, 2));
      assert.equal(typeof row.score, 'number');
      assert.equal(placementScoreLabel(bucket, two.length, row.score), BUCKET_BANDS[bucket].label);
    }

    const three = withStoredScores(
      [0, 1, 2].map((index) => unscored(`${bucket}-${index}`, 'hike', bucket, `a${index}`)),
    );
    assert.equal(three.length, 3);
    for (const row of three) {
      assert.equal(placementScoreLabel(bucket, three.length, row.score), formatRankScore(row.score));
    }
  }
});

test('a 50-hike bucket stays inside its band and follows position', () => {
  for (const bucket of BUCKETS) {
    const { lo, hi } = BUCKET_BANDS[bucket];
    const scores = Array.from({ length: 50 }, (_, index) => bandScore(bucket, index, 50));
    for (const score of scores) {
      assert.ok(score >= lo && score <= hi, `${bucket} ${score} outside ${lo}-${hi}`);
      assert.equal(score, Math.round(score * 10) / 10);
    }
    for (let index = 1; index < scores.length; index++) {
      assert.ok(scores[index] <= scores[index - 1]);
    }
  }
});

test('an Overall list sorts hikes from small buckets by stored score', () => {
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
    assert.equal(typeof row.score, 'number');
    const count = row.hike_type === 'day' || row.hike_type === 'walk' ? 1 : 2;
    assert.equal(placementScoreLabel(row.bucket, count, row.score), BUCKET_BANDS[row.bucket].label);
  }

  const merged = overallByScore([...scramble, ...walk, ...day, ...summit]);
  assert.deepEqual(
    merged.map((row) => row.trail_id),
    ['alta', 'solo', 'baja', 'meadow', 'scree', 'talus'],
  );
  for (let index = 1; index < merged.length; index++) {
    assert.ok(merged[index].score <= merged[index - 1].score);
  }
  assert.equal(day[0].score, bandScore('loved', 0, 1));
  assert.equal(summit[0].score, bandScore('loved', 0, 2));
  assert.equal(summit[1].score, bandScore('loved', 1, 2));
});

test('expected comparisons follow the binary-search bound', () => {
  assert.equal(expectedComparisons(0), 0);
  assert.equal(expectedComparisons(1), 1);
  assert.equal(expectedComparisons(15), 4);
});
