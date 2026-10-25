import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { comparisonTag, hikeDayLabel, mapFeedPost, shouldPost, type MyRankedTrail } from './postRules.ts';

const NOW = new Date('2026-10-25T18:00:00');

describe('shouldPost', () => {
  it('posts hikes from the last 7 days and not older ones', () => {
    assert.equal(shouldPost('2026-10-25T09:00:00', NOW), true);
    assert.equal(shouldPost('2026-10-19T09:00:00', NOW), true);
    assert.equal(shouldPost('2026-10-17T09:00:00', NOW), false);
    assert.equal(shouldPost('not a date', NOW), false);
  });
});

describe('mapFeedPost', () => {
  const row = {
    post_id: 'p1', author_id: 'a', username: 'maya', display_name: 'Maya Chen', trail_id: 't1',
    trail_name: 'Mount Si', region: 'WA', bucket: 'loved', score: '9.1', bucket_size: 4,
    hiked_at: '2026-10-24T15:00:00Z', posted_at: '2026-10-24T20:00:00Z', duration_seconds: 3600,
    distance_km: '12.4', elevation_gain_m: 960, notes: '  ', photos: ['sb:a/1.jpg', 3],
    route: { type: 'LineString', coordinates: [[-121.7, 47.5], [-121.72, 47.51], ['x', 1]] },
    like_count: 2, comment_count: '1', liked: true, is_mine: false,
  };

  it('reads numbers given as strings and drops bad points', () => {
    const post = mapFeedPost(row);
    assert.equal(post?.score, 9.1);
    assert.equal(post?.distanceKm, 12.4);
    assert.equal(post?.commentCount, 1);
    assert.deepEqual(post?.route, [[-121.7, 47.5], [-121.72, 47.51]]);
    assert.deepEqual(post?.photos, ['sb:a/1.jpg']);
    assert.equal(post?.notes, null);
  });

  it('rejects rows without an id or with an unknown bucket', () => {
    assert.equal(mapFeedPost({ ...row, post_id: null }), null);
    assert.equal(mapFeedPost({ ...row, bucket: 'meh' }), null);
  });

  it('has no route when the server sent none', () => {
    assert.deepEqual(mapFeedPost({ ...row, route: null })?.route, []);
  });
});

describe('comparisonTag', () => {
  const mine: MyRankedTrail[] = [
    { trailId: 'si', name: 'Mount Si', bucket: 'loved', score: 8.6 },
    { trailId: 'rr', name: 'Rattlesnake Ledge', bucket: 'fine', score: 6.2 },
    { trailId: 'bad', name: 'Mud Loop', bucket: 'disliked', score: 2.1 },
  ];
  const post = { trailId: 'x', bucket: 'loved' as const, score: 9.0, bucketSize: 4, isMine: false };

  it('names your closest trail below their score', () => {
    assert.equal(comparisonTag(post, mine), 'Ranked above your Mount Si');
  });

  it('falls back to the closest trail above', () => {
    assert.equal(comparisonTag({ ...post, score: 5.0, bucket: 'fine' }, mine), 'Ranked above your Mud Loop');
    assert.equal(comparisonTag({ ...post, score: 1.0, bucket: 'disliked' }, mine), 'Ranked below your Mud Loop');
  });

  it('ignores far buckets, the same trail, unscored posts and your own posts', () => {
    assert.equal(comparisonTag({ ...post, bucket: 'disliked', score: 9.5 }, [mine[0]]), null);
    assert.equal(comparisonTag({ ...post, trailId: 'si' }, [mine[0]]), null);
    assert.equal(comparisonTag({ ...post, bucketSize: 2 }, mine), null);
    assert.equal(comparisonTag({ ...post, isMine: true }, mine), null);
  });
});

describe('hikeDayLabel', () => {
  it('says today, yesterday, a weekday, then a date', () => {
    assert.equal(hikeDayLabel('2026-10-25T08:00:00', NOW), 'Today');
    assert.equal(hikeDayLabel('2026-10-24T08:00:00', NOW), 'Yesterday');
    assert.equal(hikeDayLabel('2026-10-21T08:00:00', NOW), 'Wednesday');
    assert.equal(hikeDayLabel('2026-10-12T08:00:00', NOW), 'Oct 12');
  });
});
