import test from 'node:test';
import assert from 'node:assert/strict';
import { isPickDay, pickWeekKey, weekendPicks, type PickTrail } from './weekendPick.ts';

const trail = (id: string, name: string, km: number, gainM: number, lon: number, lat: number): PickTrail => ({
  id,
  name,
  region: 'Somewhere',
  source: 'catalog',
  distance_km: km,
  elevation_gain_m: gainM,
  start: [lon, lat],
});

// Around North Bend, WA.
const SI = trail('si', 'Mount Si', 12, 1021, -121.72, 47.49);
const MAILBOX = trail('mailbox', 'Mailbox Peak', 16, 1364, -121.67, 47.47);
const RATTLE = trail('rattle', 'Rattlesnake Ledge', 6, 389, -121.77, 47.44);
const SERENE = trail('serene', 'Lake Serene', 11, 400, -121.57, 47.81);
const ZION = trail('zion', 'Angels Landing', 9, 592, -112.96, 37.25);

const base = {
  trails: [SI, MAILBOX, RATTLE, SERENE, ZION],
  loved: ['si'],
  done: ['si'],
  saved: [] as string[],
  home: { lat: 47.49, lon: -121.72, fromHike: true },
  skipped: [] as string[],
};

test('isPickDay is Wednesday through Sunday', () => {
  // 2026-11-16 is a Monday.
  assert.equal(isPickDay(new Date(2026, 10, 16)), false);
  assert.equal(isPickDay(new Date(2026, 10, 17)), false);
  assert.equal(isPickDay(new Date(2026, 10, 18)), true);
  assert.equal(isPickDay(new Date(2026, 10, 21)), true);
  assert.equal(isPickDay(new Date(2026, 10, 22)), true);
});

test('pickWeekKey is the Monday of the week', () => {
  assert.equal(pickWeekKey(new Date(2026, 10, 22, 20)), '2026-11-16');
  assert.equal(pickWeekKey(new Date(2026, 10, 18)), '2026-11-16');
  assert.equal(pickWeekKey(new Date(2026, 10, 23)), '2026-11-23');
});

test('picks the nearby trail closest to a Loved one, never one already done', () => {
  const picks = weekendPicks(base);
  assert.equal(picks[0].trail.id, 'mailbox');
  assert.ok(!picks.some((p) => p.trail.id === 'si'));
});

test('leaves out trails beyond 150 mi', () => {
  assert.ok(!weekendPicks(base).some((p) => p.trail.id === 'zion'));
});

test('a saved trail gets a boost and a Saved reason', () => {
  const picks = weekendPicks({ ...base, saved: ['serene'] });
  assert.equal(picks[0].trail.id, 'serene');
  assert.equal(picks[0].reasons[0].value, 'Saved');
});

test('Like reason names the Loved trail when the match is close', () => {
  const [pick] = weekendPicks(base);
  assert.equal(pick.reasons.find((r) => r.value.startsWith('Like'))?.value, 'Like Mount Si');
});

test('no Like reason for a loose match', () => {
  const rattle = weekendPicks({ ...base, skipped: ['mailbox', 'serene'] })[0];
  assert.equal(rattle.trail.id, 'rattle');
  assert.ok(!rattle.reasons.some((r) => r.value.startsWith('Like')));
});

test('distance reason only when home comes from a real hike', () => {
  const real = weekendPicks(base)[0];
  assert.ok(real.reasons.some((r) => r.value.endsWith(' mi')));
  const fallback = weekendPicks({ ...base, home: { ...base.home, fromHike: false } })[0];
  assert.ok(!fallback.reasons.some((r) => r.value.endsWith(' mi')));
});

test('skips move to the next trail, and skipping all leaves nothing', () => {
  assert.equal(weekendPicks({ ...base, skipped: ['mailbox'] })[0].trail.id, 'serene');
  assert.equal(weekendPicks({ ...base, skipped: ['mailbox', 'serene', 'rattle'] }).length, 0);
});

test('nothing without a Loved trail that has distance and gain', () => {
  assert.equal(weekendPicks({ ...base, loved: [] }).length, 0);
  const bare = { ...SI, distance_km: null };
  assert.equal(weekendPicks({ ...base, trails: [bare, MAILBOX], loved: ['si'] }).length, 0);
});

test('a ranked demo trail with the same name counts as done', () => {
  const demo = { ...trail('trail-mailbox', 'Mailbox Peak', 15, 1300, -121.67, 47.47), source: undefined };
  const picks = weekendPicks({ ...base, trails: [...base.trails, demo], done: ['si', 'trail-mailbox'] });
  assert.ok(!picks.some((p) => p.trail.id === 'mailbox'));
});

test('user trails and demo trails are never suggested unless saved', () => {
  const mine = { ...trail('mine', 'My loop', 12, 1000, -121.72, 47.49), source: 'user' as const };
  assert.ok(!weekendPicks({ ...base, trails: [...base.trails, mine] }).some((p) => p.trail.id === 'mine'));
});

test('without home, nothing is picked', () => {
  assert.equal(weekendPicks({ ...base, home: null }).length, 0);
});
