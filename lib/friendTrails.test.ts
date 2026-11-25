import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MOCK_USER_ID } from '../data/mockTrails.ts';
import type { Trail } from '../types/trail.ts';
import { dropUnreadableFriendTrails, isFriendTrail, trailOwnerLabel } from './friendTrails.ts';

const ME = 'me-uuid';
const SAM = 'sam-uuid';

function trail(id: string, extra: Partial<Trail> = {}): Trail {
  return {
    id,
    name: id,
    region: '',
    distance_km: null,
    elevation_gain_m: null,
    peak_elevation_m: null,
    path: { type: 'LineString', coordinates: [] },
    elevation_profile: [],
    avg_moving_time_seconds: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...extra,
  };
}

const friendTrail = trail('f', { source: 'user', owner_id: SAM });
const ownTrail = trail('o', { source: 'user', owner_id: ME });
const mockTrail = trail('m', { source: 'user', owner_id: MOCK_USER_ID });
const catalogTrail = trail('c', { source: 'catalog', owner_id: null });

describe('isFriendTrail', () => {
  it('is true for a user trail someone else owns', () => {
    assert.equal(isFriendTrail(friendTrail, ME), true);
  });
  it('is false for your own, a pre-sign-in, or a catalog trail', () => {
    assert.equal(isFriendTrail(ownTrail, ME), false);
    assert.equal(isFriendTrail(mockTrail, ME), false);
    assert.equal(isFriendTrail(catalogTrail, ME), false);
  });
  it('is false when signed out', () => {
    assert.equal(isFriendTrail(friendTrail, null), false);
  });
});

describe('dropUnreadableFriendTrails', () => {
  const all = [friendTrail, ownTrail, mockTrail, catalogTrail];
  it('drops a friend trail the server no longer returns', () => {
    const kept = dropUnreadableFriendTrails(all, new Set(['o', 'c']), ME, new Set());
    assert.deepEqual(kept.map((t) => t.id), ['o', 'm', 'c']);
  });
  it('keeps it when the server returned it, or it is in keep', () => {
    assert.equal(dropUnreadableFriendTrails(all, new Set(['f']), ME, new Set()).length, 4);
    assert.equal(dropUnreadableFriendTrails(all, new Set(), ME, new Set(['f'])).length, 4);
  });
});

describe('trailOwnerLabel', () => {
  const friends = [{ id: SAM, display_name: 'Sam Lee' }];
  it('names a friend by first name', () => {
    assert.equal(trailOwnerLabel(friendTrail, ME, friends), 'Added by Sam');
  });
  it('falls back when the owner is not a friend any more', () => {
    assert.equal(trailOwnerLabel(friendTrail, ME, []), 'Added by a hiker');
  });
  it('is null for your own and catalog trails', () => {
    assert.equal(trailOwnerLabel(ownTrail, ME, friends), null);
    assert.equal(trailOwnerLabel(catalogTrail, ME, friends), null);
  });
});
