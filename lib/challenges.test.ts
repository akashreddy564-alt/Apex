import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  challengeAmount,
  challengeFor,
  challengeFraction,
  daysLeft,
  formatChallengeAmount,
  formatChallengeProgress,
  mapChallengeRow,
  monthChallenges,
  parseChallengeKey,
} from './challenges.ts';

const dec = new Date(2026, 11, 10, 12);
const path = { type: 'LineString', coordinates: [] };

test('each month has climb, distance and hikes, keyed for the server', () => {
  const all = monthChallenges(dec);
  assert.deepEqual(all.map((c) => c.key), ['2026-12:climb', '2026-12:distance', '2026-12:hikes']);
  assert.equal(all[0]!.title, 'Climb 10,000 ft in December');
  assert.equal(all[1]!.title, 'Hike 50 miles in December');
  assert.equal(all[2]!.title, '8 hikes in December');
  assert.equal(challengeFor('climb', new Date(2026, 0, 3)).key, '2026-01:climb');
});

test('parses server keys and refuses anything else', () => {
  assert.equal(parseChallengeKey('2026-12:distance')?.title, 'Hike 50 miles in December');
  assert.equal(parseChallengeKey('2026-13:climb'), null);
  assert.equal(parseChallengeKey('2026-12:sprint'), null);
  assert.equal(parseChallengeKey('nope'), null);
});

test('only recorded hikes in the month count', () => {
  const climb = challengeFor('climb', dec);
  const logs = [
    { created_at: new Date(2026, 11, 2).toISOString(), recorded_path: path, elevation_gain_m: 900, distance_km: 10 },
    { created_at: new Date(2026, 11, 9).toISOString(), recorded_path: path, elevation_gain_m: 600, distance_km: 8 },
    // Typed in, not recorded.
    { created_at: new Date(2026, 11, 5).toISOString(), recorded_path: null, elevation_gain_m: 5000, distance_km: 40 },
    // Last month.
    { created_at: new Date(2026, 10, 30).toISOString(), recorded_path: path, elevation_gain_m: 700, distance_km: 9 },
  ];
  assert.equal(challengeAmount(climb, logs), 1500);
  assert.equal(challengeAmount(challengeFor('distance', dec), logs), 18);
  assert.equal(challengeAmount(challengeFor('hikes', dec), logs), 2);
});

test('progress caps at the target and formats in feet, miles and hikes', () => {
  const climb = challengeFor('climb', dec);
  assert.equal(challengeFraction(climb, climb.target * 2), 1);
  assert.equal(challengeFraction(climb, 0), 0);
  assert.equal(formatChallengeAmount('climb', 1000), '3,281 ft');
  assert.equal(formatChallengeAmount('distance', 16.09344), '10.0 mi');
  assert.equal(formatChallengeAmount('hikes', 1), '1 hike');
  assert.equal(formatChallengeProgress(climb, 1000), '3,281 / 10,000 ft');
  assert.equal(formatChallengeProgress(challengeFor('hikes', dec), 3), '3 / 8 hikes');
});

test('counts the days left, today included', () => {
  assert.equal(daysLeft(challengeFor('hikes', dec), dec), 22);
  assert.equal(daysLeft(challengeFor('hikes', dec), new Date(2026, 11, 31, 20)), 1);
});

test('maps board rows and drops malformed ones', () => {
  assert.deepEqual(
    mapChallengeRow({ user_id: 'u1', username: 'maya', display_name: 'Maya', amount: '1520.5', hikes: 3, place: 1, is_me: false }),
    { userId: 'u1', username: 'maya', displayName: 'Maya', amount: 1520.5, hikes: 3, place: 1, isMe: false },
  );
  assert.equal(mapChallengeRow({ username: 'x' }), null);
});
