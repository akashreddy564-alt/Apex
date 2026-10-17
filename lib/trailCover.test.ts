import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodePolyline, mapCoverUrl, trailCover } from './trailCover.ts';

const path = {
  type: 'LineString' as const,
  coordinates: [
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252],
  ] as [number, number][],
};

describe('encodePolyline', () => {
  it('matches the reference example from the polyline spec', () => {
    assert.equal(encodePolyline(path.coordinates), '_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  });
});

describe('mapCoverUrl', () => {
  it('draws the route on a label-free satellite image', () => {
    const url = mapCoverUrl(path, 'pk.test');
    assert.ok(url);
    assert.ok(url.startsWith('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/'));
    assert.ok(url.includes(`path-4+C9D4B0-0.9(${encodeURIComponent('_p~iF~ps|U_ulLnnqC_mqNvxq`@')})`));
    assert.ok(url.includes('/auto/600x340@2x?'));
    assert.ok(url.includes('access_token=pk.test'));
  });

  it('gives no image without a token or a drawable route', () => {
    assert.equal(mapCoverUrl(path, undefined), null);
    assert.equal(mapCoverUrl(path, ''), null);
    assert.equal(mapCoverUrl({ type: 'LineString', coordinates: [[-120, 38]] }, 'pk.test'), null);
  });

  it('thins long recordings so the URL stays short', () => {
    const long = Array.from({ length: 3000 }, (_, i) => [-120 + i * 1e-4, 38 + i * 1e-4] as [number, number]);
    const url = mapCoverUrl({ type: 'LineString', coordinates: long }, 'pk.test');
    assert.ok(url && url.length < 8000);
  });
});

describe('trailCover', () => {
  const log = (photos: string[], created_at: string) => ({ trail_id: 't1', photos, created_at });

  it('prefers the newest hike photo of that trail', () => {
    const cover = trailCover('t1', path, [
      log(['file:///old.jpg'], '2026-09-01T00:00:00Z'),
      log(['file:///new.jpg', 'file:///second.jpg'], '2026-10-01T00:00:00Z'),
      { trail_id: 't2', photos: ['file:///other.jpg'], created_at: '2026-10-09T00:00:00Z' },
    ], 'pk.test');
    assert.deepEqual(cover, { kind: 'photo', uri: 'file:///new.jpg' });
  });

  it('skips cloud-only photo refs it cannot show directly', () => {
    const cover = trailCover('t1', path, [log(['sb:u/1.jpg'], '2026-10-01T00:00:00Z')], 'pk.test');
    assert.equal(cover?.kind, 'map');
  });

  it('falls back to the satellite route image, then to nothing', () => {
    assert.equal(trailCover('t1', path, [], 'pk.test')?.kind, 'map');
    assert.equal(trailCover('t1', path, [], undefined), null);
  });
});
