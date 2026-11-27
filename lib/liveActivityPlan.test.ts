import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activityProps, clockText, MIN_UPDATE_MS, shouldPush } from './liveActivityPlan.ts';

const start = Date.UTC(2026, 10, 27, 15, 0, 0);
const hike = { startedAt: start, pausedAt: null, pausedMs: 0, distanceM: 3910.71, elevationGainM: 390 };

test('formats the clock like the recording screen', () => {
  assert.equal(clockText(0), '0:00');
  assert.equal(clockText(65), '1:05');
  assert.equal(clockText(3725), '1:02:05');
});

test('shows miles, climb in feet, and a clock that leaves out pauses', () => {
  const now = start + 3_600_000;
  const props = activityProps({ ...hike, pausedMs: 600_000 }, 'Raven Cliff Falls', now);
  assert.equal(props.miles, '2.43');
  assert.equal(props.climbFt, '1,280');
  assert.equal(props.paused, false);
  assert.equal(props.clockText, '50:00');
  assert.equal(props.clockFrom, now - 3_000_000);
});

test('freezes while paused and shortens long trail names', () => {
  const now = start + 1_800_000;
  const props = activityProps({ ...hike, pausedAt: start + 1_200_000 }, 'A very long trail name that keeps going and going', now);
  assert.equal(props.paused, true);
  assert.equal(props.clockText, '20:00');
  assert.equal(props.trail.length, 32);
  assert.equal(activityProps(hike, '  ', now).trail, 'Hike');
});

test('pushes on start, pause and resume at once, numbers at most every 15 s', () => {
  const now = start + 60_000;
  const a = activityProps(hike, 'Mount Si', now);
  assert.equal(shouldPush(null, a, 0, now), true);
  const moved = activityProps({ ...hike, distanceM: 4200 }, 'Mount Si', now);
  assert.equal(shouldPush(a, moved, now - 5_000, now), false);
  assert.equal(shouldPush(a, moved, now - MIN_UPDATE_MS, now), true);
  assert.equal(shouldPush(a, a, now - 60_000, now), false, 'nothing changed');
  const paused = activityProps({ ...hike, pausedAt: now }, 'Mount Si', now);
  assert.equal(shouldPush(a, paused, now - 1_000, now), true);
});
