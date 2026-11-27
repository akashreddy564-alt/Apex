import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardTop, holePath, spotlight } from './tourLayout.ts';

const screen = { width: 390, height: 844 };
const safe = { top: 47, bottom: 34 };

test('spotlight pads the target and stays on screen', () => {
  assert.deepEqual(spotlight({ x: 16, y: 100, width: 358, height: 120 }, screen), { x: 8, y: 92, width: 374, height: 136 });
  const edge = spotlight({ x: 0, y: 800, width: 390, height: 60 }, screen);
  assert.equal(edge.x, 4);
  assert.equal(edge.y + edge.height, screen.height - 4);
});

test('card goes below a spotlight near the top and above one near the bottom', () => {
  const card = { height: 180 };
  const top = cardTop({ x: 8, y: 92, width: 374, height: 136 }, card, screen, safe);
  assert.equal(top, 92 + 136 + 16);
  const bottom = cardTop({ x: 8, y: 740, width: 374, height: 60 }, card, screen, safe);
  assert.equal(bottom, 740 - 16 - 180);
});

test('card is centered with no spotlight and never leaves the safe area', () => {
  assert.equal(cardTop(null, { height: 200 }, screen, safe), (844 - 200) / 2);
  const tall = cardTop({ x: 0, y: 20, width: 100, height: 700 }, { height: 300 }, screen, safe);
  assert.ok(tall <= screen.height - safe.bottom - 12 - 300);
  assert.ok(tall >= safe.top + 12);
});

test('holePath has the outer screen and a hole only when there is one', () => {
  assert.equal(holePath(screen, { x: 0, y: 0, width: 0, height: 0 }, 12), 'M0 0H390V844H0Z');
  const path = holePath(screen, { x: 10, y: 20, width: 100, height: 50 }, 12);
  assert.ok(path.startsWith('M0 0H390V844H0Z'));
  assert.equal((path.match(/A/g) ?? []).length, 4);
});
