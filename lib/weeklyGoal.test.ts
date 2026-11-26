import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  defaultGoal,
  formatAmount,
  formatProgress,
  parseGoal,
  toDisplay,
  toStored,
  weeklyProgress,
  type GoalLog,
  type GoalTrail,
} from './weeklyGoal.ts';

// Wednesday 2026-11-18, local time. The week runs Mon 16 – Sun 22.
const NOW = new Date(2026, 10, 18, 12, 0);
const at = (day: number, hour = 10) => new Date(2026, 10, day, hour).toISOString();

const TRAILS: Record<string, GoalTrail> = {
  si: { distance_km: 12, elevation_gain_m: 960 },
  bare: { distance_km: null, elevation_gain_m: null },
};
const trailOf = (id: string) => TRAILS[id];

describe('goal units', () => {
  it('round-trips the presets', () => {
    assert.equal(toDisplay('elevation', toStored('elevation', 3000)), 3000);
    assert.equal(toDisplay('distance', toStored('distance', 10)), 10);
  });

  it('defaults to 3,000 ft of elevation', () => {
    const goal = defaultGoal();
    assert.equal(goal.metric, 'elevation');
    assert.equal(toDisplay('elevation', goal.target), 3000);
  });
});

describe('parseGoal', () => {
  it('keeps a valid goal', () => {
    assert.deepEqual(parseGoal({ metric: 'distance', target: 20 }), {
      metric: 'distance',
      target: 20,
    });
  });

  it('resets a bad target to that metric’s default', () => {
    assert.deepEqual(parseGoal({ metric: 'distance', target: -1 }), defaultGoal('distance'));
    assert.deepEqual(parseGoal({ metric: 'distance', target: 'x' }), defaultGoal('distance'));
  });

  it('survives garbage', () => {
    assert.deepEqual(parseGoal(null), defaultGoal());
    assert.deepEqual(parseGoal('nope'), defaultGoal());
  });
});

describe('weeklyProgress', () => {
  const elevation = { metric: 'elevation' as const, target: 1000 };

  it('counts only this week, up to now', () => {
    const logs: GoalLog[] = [
      { trail_id: 'si', created_at: at(16), elevation_gain_m: 400 }, // Monday
      { trail_id: 'si', created_at: at(15), elevation_gain_m: 900 }, // last Sunday
      { trail_id: 'si', created_at: at(21), elevation_gain_m: 900 }, // Saturday, future
    ];
    const progress = weeklyProgress(logs, trailOf, elevation, NOW);
    assert.equal(progress.done, 400);
    assert.equal(progress.hikes, 1);
    assert.equal(progress.fraction, 0.4);
    assert.equal(progress.complete, false);
  });

  it('never borrows the trail\'s catalog figure when the hike has no measurement', () => {
    const logs: GoalLog[] = [{ trail_id: 'si', created_at: at(17) }];
    const progress = weeklyProgress(logs, trailOf, elevation, NOW);
    assert.equal(progress.done, 0);
    assert.equal(progress.hikes, 1);
    const distance = weeklyProgress(logs, trailOf, { metric: 'distance', target: 20 }, NOW);
    assert.equal(distance.done, 0);
  });

  it('prefers the hike’s own figure, even a smaller one', () => {
    const logs: GoalLog[] = [{ trail_id: 'si', created_at: at(17), elevation_gain_m: 300 }];
    assert.equal(weeklyProgress(logs, trailOf, elevation, NOW).done, 300);
  });

  it('counts a hike with nothing to add without breaking', () => {
    const logs: GoalLog[] = [
      { trail_id: 'bare', created_at: at(17) },
      { trail_id: 'missing', created_at: at(17) },
    ];
    const progress = weeklyProgress(logs, trailOf, elevation, NOW);
    assert.equal(progress.done, 0);
    assert.equal(progress.hikes, 2);
  });

  it('caps the ring at full and marks it complete', () => {
    const logs: GoalLog[] = [{ trail_id: 'si', created_at: at(17), elevation_gain_m: 1500 }];
    const progress = weeklyProgress(logs, trailOf, elevation, NOW);
    assert.equal(progress.fraction, 1);
    assert.equal(progress.complete, true);
  });

  it('keys the week by its Monday', () => {
    assert.equal(weeklyProgress([], trailOf, elevation, NOW).weekOf, '2026-11-16');
    const sunday = new Date(2026, 10, 22, 23, 0);
    assert.equal(weeklyProgress([], trailOf, elevation, sunday).weekOf, '2026-11-16');
  });
});

describe('formatting', () => {
  it('shows feet with commas and miles to one decimal', () => {
    assert.equal(formatAmount('elevation', toStored('elevation', 12400)), '12,400');
    assert.equal(formatAmount('distance', toStored('distance', 4.25)), '4.3');
    assert.equal(formatAmount('distance', toStored('distance', 10)), '10');
  });

  it('writes done over target', () => {
    assert.equal(
      formatProgress('elevation', toStored('elevation', 1240), toStored('elevation', 3000)),
      '1,240 / 3,000 ft',
    );
  });
});
