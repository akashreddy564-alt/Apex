import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseOnboarding, suggestedGoal, toggleInterest } from './onboarding.ts';
import { GOAL_PRESETS } from './weeklyGoal.ts';

test('every suggested goal is one of the goal presets', () => {
  for (const band of ['short', 'medium', 'long', null] as const) {
    assert.ok(GOAL_PRESETS.distance.includes(suggestedGoal(band, 'distance')));
    assert.ok(GOAL_PRESETS.elevation.includes(suggestedGoal(band, 'elevation')));
  }
});

test('longer hikers get bigger goals', () => {
  assert.ok(suggestedGoal('long', 'distance') > suggestedGoal('short', 'distance'));
  assert.equal(suggestedGoal(null, 'distance'), suggestedGoal('medium', 'distance'));
});

test('toggleInterest adds and removes', () => {
  assert.deepEqual(toggleInterest([], 'Lakes'), ['Lakes']);
  assert.deepEqual(toggleInterest(['Lakes', 'Summits'], 'Lakes'), ['Summits']);
});

test('parseOnboarding keeps only known values', () => {
  assert.deepEqual(parseOnboarding({ seen: true, band: 'long', interests: ['Lakes', 'Bowling'] }), {
    seen: true,
    band: 'long',
    interests: ['Lakes'],
  });
  assert.deepEqual(parseOnboarding(undefined), { seen: false, band: null, interests: [] });
  assert.deepEqual(parseOnboarding({ seen: 'yes', band: 'huge', interests: 'Lakes' }), {
    seen: false,
    band: null,
    interests: [],
  });
});
