import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { weekStart, weeklyStreak } from './streak.ts';

// Wednesday 2026-11-04, local time.
const WED = new Date('2026-11-04T12:00:00');

describe('weekStart', () => {
  it('is the Monday before, at midnight', () => {
    assert.equal(weekStart(WED).toDateString(), new Date('2026-11-02T00:00:00').toDateString());
    assert.equal(weekStart(new Date('2026-11-08T23:00:00')).getDate(), 2);
    assert.equal(weekStart(new Date('2026-11-02T00:30:00')).getDate(), 2);
  });
});

describe('weeklyStreak', () => {
  it('counts back through last week while this week is still open', () => {
    const streak = weeklyStreak(['2026-11-01T10:00:00', '2026-10-25T10:00:00', '2026-10-17T10:00:00'], WED);
    assert.deepEqual(streak, { weeks: 3, hikedThisWeek: false, atRisk: true });
  });

  it('includes this week once there is a hike, and stops at a gap', () => {
    const streak = weeklyStreak(['2026-11-03T08:00:00', '2026-10-31T10:00:00', '2026-10-15T10:00:00'], WED);
    assert.deepEqual(streak, { weeks: 2, hikedThisWeek: true, atRisk: false });
  });

  it('is zero with no recent hikes, and ignores bad and future dates', () => {
    assert.deepEqual(weeklyStreak(['2026-10-01T10:00:00', 'nope', '2026-11-20T10:00:00'], WED), {
      weeks: 0,
      hikedThisWeek: false,
      atRisk: false,
    });
  });

  it('counts several hikes in one week once', () => {
    assert.equal(weeklyStreak(['2026-11-01T10:00:00', '2026-10-31T10:00:00'], WED).weeks, 1);
  });
});
