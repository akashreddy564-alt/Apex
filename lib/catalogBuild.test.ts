import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogId, seedSql, trailFromRoute, type CuratedTrail } from './catalogBuild.ts';
import { lineLengthM } from './catalogRoute.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const curated: CuratedTrail = {
  slug: 'test-peak',
  name: "Hiker's Peak",
  region: 'Somewhere, UT',
  extract: 'utah',
  shape: 'out-and-back',
  trailhead: [0, 0],
  via: [[0, 0.009]],
  prefer: [],
  expectKm: 2,
};

const line: [number, number][] = [[0, 0], [0, 0.009]];
const oneWay = lineLengthM(line);
const NOW = '2026-10-17T00:00:00.000Z';

describe('catalogId', () => {
  it('is stable and uuid-shaped', () => {
    assert.equal(catalogId('test-peak'), catalogId('test-peak'));
    assert.notEqual(catalogId('test-peak'), catalogId('other-peak'));
    assert.match(catalogId('test-peak'), UUID_RE);
  });
});

describe('trailFromRoute', () => {
  it('doubles an out-and-back and mirrors its profile', () => {
    const trail = trailFromRoute(
      curated,
      { slug: 'test-peak', wayIds: [5, 6], coordinates: line },
      [100, 150, 200],
      [0, oneWay / 2, oneWay],
      NOW,
    );
    assert.ok(Math.abs(trail.distance_km! - (oneWay * 2) / 1000) < 0.01);
    assert.equal(trail.elevation_gain_m, 100);
    assert.equal(trail.peak_elevation_m, 200);
    const profile = trail.elevation_profile;
    assert.equal(profile.length, 5);
    assert.equal(profile[profile.length - 1]!.elevation_m, 100);
    assert.ok(Math.abs(profile[profile.length - 1]!.distance_m - oneWay * 2) < 1);
    assert.equal(trail.source, 'catalog');
    assert.equal(trail.osm_ref, 'way/5,6');
    assert.deepEqual(trail.trailhead, [0, 0]);
    assert.equal(trail.shape, 'out-and-back');
    assert.equal(trail.id, catalogId('test-peak'));
  });

  it('does not double a loop and ignores sub-metre wobble in gain', () => {
    const trail = trailFromRoute(
      { ...curated, shape: 'loop' },
      { slug: 'test-peak', wayIds: [5], coordinates: line },
      [100, 100.4, 100, 110],
      [0, 10, 20, oneWay],
      NOW,
    );
    assert.ok(Math.abs(trail.distance_km! - oneWay / 1000) < 0.01);
    assert.equal(trail.elevation_gain_m, 10);
  });
});

describe('seedSql', () => {
  it('upserts by id and escapes quotes', () => {
    const trail = trailFromRoute(
      curated,
      { slug: 'test-peak', wayIds: [5], coordinates: line },
      [100, 200],
      [0, oneWay],
      NOW,
    );
    const sql = seedSql([trail]);
    assert.ok(sql.includes("'Hiker''s Peak'"));
    assert.ok(sql.includes('on conflict (id) do update'));
    assert.ok(sql.includes("st_geogfromtext('SRID=4326;LINESTRING(0 0, 0 0.009)')"));
    assert.ok(sql.includes('st_setsrid(st_makepoint(0, 0), 4326)::geography'));
  });
});
