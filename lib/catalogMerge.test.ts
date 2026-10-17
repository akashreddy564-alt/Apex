import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Trail } from '../types/trail.ts';
import { mergeCatalog } from './catalogMerge.ts';

function trail(id: string, name: string, extra: Partial<Trail> = {}): Trail {
  return {
    id,
    name,
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

describe('mergeCatalog', () => {
  const catalog = [
    trail('c-b', 'Bravo', { source: 'catalog', distance_km: 9 }),
    trail('c-a', 'Alpha', { source: 'catalog' }),
  ];

  it('replaces an older copy of a catalog trail', () => {
    const merged = mergeCatalog([trail('c-b', 'Bravo old', { source: 'catalog' })], catalog, new Set());
    assert.equal(merged.find((t) => t.id === 'c-b')!.distance_km, 9);
    assert.equal(merged.length, 2);
  });

  it('keeps user trails, newest first, ahead of the catalog', () => {
    const merged = mergeCatalog(
      [
        trail('u-old', 'Old', { source: 'user', owner_id: 'me', created_at: '2026-01-01T00:00:00.000Z' }),
        trail('u-new', 'New', { source: 'user', owner_id: 'me', created_at: '2026-09-01T00:00:00.000Z' }),
      ],
      catalog,
      new Set(),
    );
    assert.deepEqual(merged.map((t) => t.id), ['u-new', 'u-old', 'c-a', 'c-b']);
  });

  it('keeps a demo trail only when a hike was logged on it', () => {
    const merged = mergeCatalog(
      [trail('demo-1', 'Charlie'), trail('demo-2', 'Delta')],
      catalog,
      new Set(['demo-2']),
    );
    assert.deepEqual(merged.map((t) => t.id), ['c-a', 'c-b', 'demo-2']);
  });
});
