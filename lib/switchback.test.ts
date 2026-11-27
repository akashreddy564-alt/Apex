import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canStep,
  dayKey,
  formatTime,
  isSolved,
  puzzleFor,
  randomRoute,
  rng,
  seedFor,
  sizeFor,
  streakFrom,
  touch,
  type Puzzle,
} from './switchback.ts';

/** Solves by replaying the route the generator would have walked: search for a valid trail. */
function solve(p: Puzzle): number[] | null {
  const total = p.size * p.size;
  const start = Number(Object.keys(p.cairns).find((k) => p.cairns[Number(k)] === 1));
  const trail = [start];
  const go = (): boolean => {
    if (trail.length === total) return isSolved(p, trail);
    const end = trail[trail.length - 1]!;
    for (const n of [end - p.size, end + p.size, end - 1, end + 1]) {
      if (canStep(p, trail, n)) {
        trail.push(n);
        if (go()) return true;
        trail.pop();
      }
    }
    return false;
  };
  return go() ? trail : null;
}

test('the same date gives the same puzzle', () => {
  assert.deepEqual(puzzleFor('2026-11-27'), puzzleFor('2026-11-27'));
  assert.notDeepEqual(puzzleFor('2026-11-27'), puzzleFor('2026-11-28'));
});

test('random routes cover every cell once with neighbouring steps', () => {
  for (const size of [5, 6, 7]) {
    const route = randomRoute(size, rng(seedFor(`t${size}`)));
    assert.equal(route.length, size * size);
    assert.equal(new Set(route).size, size * size);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]!;
      const b = route[i]!;
      const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
      const dc = Math.abs((a % size) - (b % size));
      assert.equal(dr + dc, 1);
    }
  }
});

test('a week of puzzles is solvable, with cairns numbered 1..last', () => {
  for (let d = 23; d <= 29; d++) {
    const p = puzzleFor(`2026-11-${d}`);
    const numbers = Object.values(p.cairns).sort((a, b) => a - b);
    assert.deepEqual(numbers, Array.from({ length: p.last }, (_, i) => i + 1));
    assert.equal(p.last, p.size + 2);
    // Small grids: check a solution really exists.
    if (p.size <= 5) assert.ok(solve(p), `no solution for ${p.date}`);
  }
});

test('sizes grow through the week', () => {
  assert.equal(sizeFor('2026-11-23'), 5); // Monday
  assert.equal(sizeFor('2026-11-26'), 6); // Thursday
  assert.equal(sizeFor('2026-11-28'), 7); // Saturday
});

test('the trail must start on cairn 1, step to neighbours, and take cairns in order', () => {
  const p: Puzzle = { date: 'x', size: 3, cairns: { 0: 1, 4: 2, 8: 3 }, last: 3 };
  assert.equal(canStep(p, [], 1), false);
  assert.equal(canStep(p, [], 0), true);
  assert.equal(canStep(p, [0], 2), false); // not a neighbour
  assert.equal(canStep(p, [0, 1, 2, 5], 8), false); // last cairn only as the last cell
  // 0 1 2 / 3 4 5 / 6 7 8: a snake that hits 4 second... 0,3,6,7,4,1,2,5,8
  const trail = [0, 3, 6, 7, 4, 1, 2, 5, 8];
  let t: number[] = [];
  for (const cell of trail) t = touch(p, t, cell);
  assert.deepEqual(t, trail);
  assert.equal(isSolved(p, t), true);
});

test('touching a cell already on the trail steps back to it', () => {
  const p: Puzzle = { date: 'x', size: 3, cairns: { 0: 1, 8: 2 }, last: 2 };
  assert.deepEqual(touch(p, [0, 1, 2, 5], 1), [0, 1]);
  assert.deepEqual(touch(p, [0, 1], 7), [0, 1]); // refused step changes nothing
});

test('isSolved rejects gaps, repeats and cairns out of order', () => {
  const p: Puzzle = { date: 'x', size: 2, cairns: { 0: 1, 1: 2, 2: 3 }, last: 3 };
  assert.equal(isSolved(p, [0, 1, 3, 2]), true);
  assert.equal(isSolved(p, [0, 2, 3, 1]), false);
  assert.equal(isSolved(p, [0, 1, 3]), false);
});

test('formatTime and dayKey', () => {
  assert.equal(formatTime(42), '0:42');
  assert.equal(formatTime(65), '1:05');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('streak counts back from today or yesterday and remembers the best run', () => {
  assert.deepEqual(streakFrom(['2026-11-25', '2026-11-26', '2026-11-27'], '2026-11-27'), { current: 3, best: 3 });
  assert.deepEqual(streakFrom(['2026-11-25', '2026-11-26'], '2026-11-27'), { current: 2, best: 2 });
  assert.deepEqual(streakFrom(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-26'], '2026-11-28'), { current: 0, best: 3 });
  assert.deepEqual(streakFrom(['2026-12-31', '2027-01-01'], '2027-01-01'), { current: 2, best: 2 });
});
