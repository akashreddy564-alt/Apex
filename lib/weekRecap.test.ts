import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recapMessage, weekRange, weekRecap, type RecapTrail } from './weekRecap.ts';

const trails: Record<string, RecapTrail> = {
  si: { name: 'Mount Si', distance_km: 12.2, elevation_gain_m: 1020 },
  serene: { name: 'Lake Serene', distance_km: 10.5, elevation_gain_m: 700 },
};
const trailOf = (id: string) => trails[id];
// Sunday Nov 22, 2026, evening local time.
const now = new Date(2026, 10, 22, 19, 0);

describe('weekRange', () => {
  it('names the Monday-to-Sunday week', () => {
    assert.equal(weekRange(now), 'Nov 16 – 22');
    assert.equal(weekRange(new Date(2026, 11, 2)), 'Nov 30 – Dec 6');
  });
});

describe('weekRecap', () => {
  it('adds up this week only, preferring what the phone measured', () => {
    const recap = weekRecap(
      [
        { trail_id: 'si', created_at: new Date(2026, 10, 17, 9).toISOString(), elevation_gain_m: 980, distance_km: 12.4, duration_seconds: 14_400 },
        { trail_id: 'serene', created_at: new Date(2026, 10, 21, 10).toISOString(), elevation_gain_m: 700, distance_km: 10.5, duration_seconds: 10_800 },
        // Last week and the future don't count.
        { trail_id: 'si', created_at: new Date(2026, 10, 14, 10).toISOString(), elevation_gain_m: 1000 },
        { trail_id: 'si', created_at: new Date(2026, 10, 23, 10).toISOString(), elevation_gain_m: 1000 },
      ],
      trailOf,
      now,
    );
    assert.equal(recap.hikes, 2);
    assert.equal(recap.gainM, 1680);
    assert.equal(recap.km, 22.9);
    assert.equal(recap.movingSeconds, 25_200);
    assert.deepEqual(recap.biggest, { name: 'Mount Si', gainM: 980 });
    assert.deepEqual(recap.trails, ['Mount Si', 'Lake Serene']);
    assert.deepEqual(recap.days, [0, 980, 0, 0, 0, 700, 0]);
    assert.equal(recap.streakWeeks, 2);
  });

  it('never borrows a trail\'s catalog numbers for a hike without its own', () => {
    const recap = weekRecap([{ trail_id: 'si', created_at: new Date(2026, 10, 17, 9).toISOString() }], trailOf, now);
    assert.equal(recap.hikes, 1);
    assert.equal(recap.gainM, 0);
    assert.equal(recap.km, 0);
  });

  it('handles an empty week', () => {
    const recap = weekRecap([], trailOf, now);
    assert.equal(recap.hikes, 0);
    assert.equal(recap.biggest, null);
    assert.equal(recap.streakWeeks, 0);
  });
});

describe('recapMessage', () => {
  const ft = (m: number) => `${Math.round(m * 3.28084).toLocaleString('en-US')} ft`;
  const mi = (km: number) => `${(km * 0.621371).toFixed(1)} mi`;

  it('reads like a sentence', () => {
    const recap = weekRecap(
      [{ trail_id: 'si', created_at: new Date(2026, 10, 18, 12).toISOString(), elevation_gain_m: 1000, distance_km: 12 }],
      trailOf,
      now,
    );
    assert.equal(recapMessage(recap, ft, mi), 'My week in hiking (Nov 16 – 22): 1 hike, 3,281 ft climbed, 7.5 mi. Tracked with Apex.');
  });

  it('owns a rest week', () => {
    assert.equal(recapMessage(weekRecap([], trailOf, now), ft, mi), 'My week in hiking (Nov 16 – 22): rest week. Back on the trail soon.');
  });
});
