import assert from 'node:assert/strict';
import { test } from 'node:test';

import { weekWidgetTimeline } from './weekWidget.ts';

// Wednesday 2026-11-25, local noon.
const now = new Date(2026, 10, 25, 12, 0, 0);
const goal = { metric: 'distance' as const, target: 16.09344 }; // 10 mi

const logs = [
  { trail_id: 't1', created_at: new Date(2026, 10, 24, 9).toISOString(), distance_km: 8.04672 }, // 5 mi this week
  { trail_id: 't2', created_at: new Date(2026, 10, 18, 9).toISOString(), distance_km: 3 }, // last week
];

test('first entry is this week as it stands', () => {
  const [first] = weekWidgetTimeline(logs, goal, now);
  assert.equal(first.date, now);
  assert.equal(first.props.done, '5');
  assert.equal(first.props.target, '10');
  assert.equal(first.props.unit, 'mi');
  assert.equal(first.props.fraction, 0.5);
  assert.equal(first.props.hikes, 1);
  assert.equal(first.props.streak, 2);
});

test('second entry starts an empty ring at next Monday midnight', () => {
  const [, second] = weekWidgetTimeline(logs, goal, now);
  assert.equal(second.date.getDay(), 1);
  assert.equal(second.date.getHours(), 0);
  assert.equal(second.date.getDate(), 30);
  assert.equal(second.props.fraction, 0);
  assert.equal(second.props.hikes, 0);
  assert.equal(second.props.done, '0');
  // The streak carries into the new week until a week is missed.
  assert.equal(second.props.streak, 2);
});

test('elevation goals show feet', () => {
  const [first] = weekWidgetTimeline([], { metric: 'elevation', target: 914.4 }, now);
  assert.equal(first.props.unit, 'ft');
  assert.equal(first.props.target, '3,000');
});
