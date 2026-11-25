import test from 'node:test';
import assert from 'node:assert/strict';
import { contourPaths } from './contours.ts';

type Pt = [number, number];

/** Every straight piece of every line in one path string, as [from, to]. */
function segments(d: string): Array<[Pt, Pt]> {
  const out: Array<[Pt, Pt]> = [];
  for (const sub of d.split('M').filter(Boolean)) {
    const pts = sub
      .replace('Z', '')
      .trim()
      .split(/\s*L\s*/)
      .map((p) => p.trim().split(/\s+/).map(Number) as Pt);
    for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]);
  }
  return out;
}

function cross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  // Strict: touching at an end point is not a crossing.
  return d1 * d2 < -1e-6 && d3 * d4 < -1e-6;
}

test('same seed gives the same paths', () => {
  assert.deepEqual(contourPaths('angels', 340, 360), contourPaths('angels', 340, 360));
});

test('a different seed gives different paths', () => {
  assert.notDeepEqual(contourPaths('angels', 340, 360), contourPaths('zion', 340, 360));
});

test('one path per level, default 12', () => {
  assert.equal(contourPaths('a', 100, 100).length, 12);
  assert.equal(contourPaths('a', 100, 100, 5).length, 5);
});

test('every level draws something', () => {
  for (const d of contourPaths('home', 390, 320)) assert.ok(d.startsWith('M'), d.slice(0, 20));
});

test('lines stay inside the box (with a small margin)', () => {
  for (const d of contourPaths('log', 390, 300)) {
    for (const [[x1, y1], [x2, y2]] of segments(d)) {
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        assert.ok(x >= -1 && x <= 391 && y >= -1 && y <= 301, `${x},${y}`);
      }
    }
  }
});

test('no two lines ever cross, like a real topo map', () => {
  for (const seed of ['home', 'log', 'gate-Friends', 'week-Nov 23–29', 'trail-1']) {
    const levels = contourPaths(seed, 220, 180, 9).map(segments);
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        for (const [a, b] of levels[i]) {
          for (const [c, d] of levels[j]) {
            assert.ok(!cross(a, b, c, d), `${seed}: levels ${i} and ${j} cross`);
          }
        }
      }
    }
  }
});
