import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  groupFriendships,
  mapFriendship,
  relationTo,
  usernamePrefixPattern,
  type Friendship,
} from './friendRules.ts';

const row = (id: string, relation: Friendship['relation']): Friendship => ({
  id,
  username: id,
  display_name: id.toUpperCase(),
  relation,
  since: '2026-10-25T00:00:00Z',
});

describe('mapFriendship', () => {
  it('keeps known relations and drops anything else', () => {
    assert.equal(mapFriendship({ id: 'a', username: 'ann', relation: 'friend' })?.display_name, 'ann');
    assert.equal(mapFriendship({ id: 'a', username: 'ann', relation: 'blocked' }), null);
    assert.equal(mapFriendship({ username: 'ann', relation: 'friend' }), null);
  });
});

describe('groupFriendships', () => {
  it('splits friends, incoming and outgoing', () => {
    const groups = groupFriendships([row('a', 'friend'), row('b', 'incoming'), row('c', 'outgoing'), row('d', 'friend')]);
    assert.deepEqual(groups.friends.map((r) => r.id), ['a', 'd']);
    assert.deepEqual(groups.incoming.map((r) => r.id), ['b']);
    assert.deepEqual(groups.outgoing.map((r) => r.id), ['c']);
  });
});

describe('relationTo', () => {
  it('knows yourself, friends, requests and strangers', () => {
    const rows = [row('a', 'friend'), row('b', 'incoming')];
    assert.equal(relationTo(rows, 'me', 'me'), 'self');
    assert.equal(relationTo(rows, 'a', 'me'), 'friend');
    assert.equal(relationTo(rows, 'b', 'me'), 'incoming');
    assert.equal(relationTo(rows, 'z', 'me'), 'none');
  });
});

describe('usernamePrefixPattern', () => {
  it('lowercases, drops @ and escapes underscores', () => {
    assert.equal(usernamePrefixPattern('@May'), 'may%');
    assert.equal(usernamePrefixPattern('a_b'), 'a\\_b%');
  });

  it('returns null for nothing or characters a username can’t have', () => {
    assert.equal(usernamePrefixPattern('  '), null);
    assert.equal(usernamePrefixPattern('ma%'), null);
    assert.equal(usernamePrefixPattern('maya chen'), null);
  });
});
