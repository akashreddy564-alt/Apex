import test from 'node:test';
import assert from 'node:assert/strict';
import { angleToDisplay, dailyTotals, displayToFraction, paceLine } from './goalDial.ts';
import { toStored } from './weeklyGoal.ts';

test('angleToDisplay maps the sweep', () => {
  assert.equal(angleToDisplay('elevation', -220), 1000);
  assert.equal(angleToDisplay('elevation', 40), 8000);
  assert.equal(angleToDisplay('elevation', -90), 4500);
  assert.equal(angleToDisplay('elevation', 140), 1000);
  assert.equal(angleToDisplay('distance', -220), 5);
  assert.equal(angleToDisplay('distance', 40), 30);
});

test('angleToDisplay snaps to step and goes to the nearer end past the sweep', () => {
  const v = angleToDisplay('elevation', -200);
  assert.equal(v % 250, 0);
  assert.equal(v, 1500);
  assert.equal(angleToDisplay('elevation', 60), 8000);
  assert.equal(angleToDisplay('elevation', 110), 1000);
});

test('displayToFraction', () => {
  assert.equal(displayToFraction('elevation', 4500), 0.5);
  assert.equal(displayToFraction('distance', 5), 0);
  assert.equal(displayToFraction('distance', 99), 1);
});

test('dailyTotals puts hikes in Monday-Sunday slots', () => {
  const now = new Date(2026, 10, 22, 20, 0); // Sunday
  const logs = [
    { trail_id: 'a', created_at: new Date(2026, 10, 21, 9).toISOString(), elevation_gain_m: toStored('elevation', 1100) },
    { trail_id: 'b', created_at: new Date(2026, 10, 22, 9).toISOString(), elevation_gain_m: toStored('elevation', 842) },
    { trail_id: 'c', created_at: new Date(2026, 10, 22, 23).toISOString(), elevation_gain_m: 500 },
    { trail_id: 'd', created_at: new Date(2026, 10, 15, 9).toISOString(), elevation_gain_m: 500 },
  ];
  const trailOf = (id: string) => (id === 'b' ? { distance_km: 3, elevation_gain_m: toStored('elevation', 842) } : undefined);
  const t = dailyTotals(logs, trailOf, 'elevation', now);
  assert.equal(t.length, 7);
  assert.ok(Math.abs(t[5] - toStored('elevation', 1100)) < 1e-9);
  assert.ok(Math.abs(t[6] - toStored('elevation', 842)) < 1e-9);
  assert.deepEqual(t.slice(0, 5), [0, 0, 0, 0, 0]);
});

test('paceLine', () => {
  const target = toStored('elevation', 3000);
  const wed = new Date(2026, 10, 18, 10);
  assert.deepEqual(paceLine('elevation', target, target, wed), { tone: 'done', text: 'Goal met. Anything more is a bonus.' });
  assert.deepEqual(paceLine('elevation', toStored('elevation', 1942), target, wed), {
    tone: 'good',
    text: '1,058 ft to go. One more good hike gets you there.',
  });
  const fri = new Date(2026, 10, 20, 10);
  assert.deepEqual(paceLine('elevation', toStored('elevation', 400), target, fri), {
    tone: 'behind',
    text: '2,600 ft to go, with 3 days left this week.',
  });
  const sun = new Date(2026, 10, 22, 10);
  assert.equal(paceLine('elevation', 0, target, sun).text, '3,000 ft to go, with 1 day left this week.');
  assert.match(paceLine('distance', 0, toStored('distance', 10), fri).text, /^10 mi to go/);
});

test('dailyTotals never borrows a trail\'s catalog figure', () => {
  const now = new Date(2026, 10, 25, 12);
  const logs = [{ trail_id: 't', created_at: new Date(2026, 10, 24, 9).toISOString() }];
  const totals = dailyTotals(logs, () => ({ distance_km: 5, elevation_gain_m: 400 }), 'elevation', now);
  assert.deepEqual(totals, [0, 0, 0, 0, 0, 0, 0]);
});
