import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appendComment,
  applyFriendAction,
  dropComment,
  tempId,
  withCommentDelta,
  withLike,
  withoutAuthor,
  withoutMember,
} from './optimistic.ts';
import type { Friendship } from './friendRules.ts';
import type { BoardRow } from './groupRules.ts';
import type { FeedPost } from './postRules.ts';

const NOW = '2026-11-21T05:00:00.000Z';
const maya = { id: 'm', username: 'maya', display_name: 'Maya' };
const row = (id: string, relation: Friendship['relation']): Friendship => ({
  id,
  username: id,
  display_name: id,
  relation,
  since: '2026-01-01',
});

describe('applyFriendAction', () => {
  it('adds a sent request', () => {
    const next = applyFriendAction([row('a', 'friend')], maya, 'add', NOW);
    assert.deepEqual(
      next.map((r) => [r.id, r.relation]),
      [
        ['a', 'friend'],
        ['m', 'outgoing'],
      ],
    );
  });

  it('turns a request to someone who asked you into a friendship', () => {
    const next = applyFriendAction([row('m', 'incoming')], maya, 'add', NOW);
    assert.equal(next[0].relation, 'friend');
    assert.equal(next[0].since, '2026-01-01');
  });

  it('accepts, declines and removes', () => {
    assert.equal(applyFriendAction([row('m', 'incoming')], maya, 'accept', NOW)[0].relation, 'friend');
    assert.deepEqual(applyFriendAction([row('m', 'incoming')], maya, 'decline', NOW), []);
    assert.deepEqual(
      applyFriendAction([row('m', 'friend'), row('a', 'friend')], maya, 'remove', NOW).map((r) => r.id),
      ['a'],
    );
  });
});

const post = (id: string, authorId: string): FeedPost =>
  ({ id, authorId, liked: false, likeCount: 2, commentCount: 1 }) as FeedPost;

describe('feed patches', () => {
  it('hides a blocked author across pages', () => {
    const data = { pages: [[post('1', 'x'), post('2', 'y')], [post('3', 'x')]], pageParams: [null, 'a'] };
    const next = withoutAuthor(data, 'x');
    assert.deepEqual(
      next?.pages.map((p) => p.map((q) => q.id)),
      [['2'], []],
    );
    assert.equal(withoutAuthor(undefined, 'x'), undefined);
  });

  it('likes and unlikes without going below zero', () => {
    assert.equal(withLike(post('1', 'x'), true).likeCount, 3);
    assert.equal(withLike({ ...post('1', 'x'), liked: true, likeCount: 0 }, false).likeCount, 0);
    const same = post('1', 'x');
    assert.equal(withLike(same, false), same);
  });

  it('counts comments', () => {
    assert.equal(withCommentDelta(post('1', 'x'), 1).commentCount, 2);
    assert.equal(withCommentDelta(post('1', 'x'), -5).commentCount, 0);
  });
});

describe('comments', () => {
  const c = { id: 'c1', userId: 'u', username: 'u', displayName: 'U', body: 'hi', createdAt: NOW };

  it('appends and drops', () => {
    const list = appendComment(undefined, c);
    assert.equal(list.length, 1);
    assert.deepEqual(dropComment(list, 'c1'), []);
  });

  it('makes distinct local ids', () => {
    assert.notEqual(tempId(), tempId());
    assert.match(tempId(), /^local-/);
  });
});

describe('withoutMember', () => {
  const r = (userId: string, gainM: number, place: number) => ({ userId, gainM, place }) as BoardRow;

  it('re-numbers places, keeping ties together', () => {
    const next = withoutMember([r('a', 900, 1), r('b', 500, 2), r('c', 300, 3), r('d', 300, 3)], 'b');
    assert.deepEqual(
      next.map((x) => [x.userId, x.place]),
      [
        ['a', 1],
        ['c', 2],
        ['d', 2],
      ],
    );
  });
});
