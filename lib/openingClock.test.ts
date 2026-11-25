import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { createOpeningClock } from './openingClock.ts';

function setup(held = false) {
  mock.timers.enable({ apis: ['setTimeout'] });
  const calls: string[] = [];
  const clock = createOpeningClock({
    readyFallbackMs: 1500,
    autoContinueMs: 4500,
    onReady: () => calls.push('ready'),
    onLeave: () => calls.push('leave'),
    held,
  });
  return { clock, calls };
}

describe('createOpeningClock', () => {
  it('moves on by itself when the photo never reports in', () => {
    const { calls } = setup();
    mock.timers.tick(1500);
    assert.deepEqual(calls, ['ready']);
    mock.timers.tick(4500);
    assert.deepEqual(calls, ['ready', 'leave']);
    mock.timers.reset();
  });

  it('counts the 4.5 s from when the photo shows', () => {
    const { clock, calls } = setup();
    mock.timers.tick(300);
    clock.ready();
    mock.timers.tick(4499);
    assert.deepEqual(calls, ['ready']);
    mock.timers.tick(1);
    assert.deepEqual(calls, ['ready', 'leave']);
    mock.timers.reset();
  });

  it('reports ready and leaves once each', () => {
    const { clock, calls } = setup();
    clock.ready();
    clock.ready();
    clock.tap();
    clock.tap();
    mock.timers.tick(10_000);
    assert.deepEqual(calls, ['ready', 'leave']);
    mock.timers.reset();
  });

  it('does nothing after dispose', () => {
    const { clock, calls } = setup();
    clock.dispose();
    mock.timers.tick(10_000);
    assert.deepEqual(calls, []);
    mock.timers.reset();
  });

  it('waits for the intro: ignores taps and starts the 4.5 s on release', () => {
    const { clock, calls } = setup(true);
    clock.ready();
    clock.tap();
    mock.timers.tick(10_000);
    assert.deepEqual(calls, ['ready']);
    clock.release();
    mock.timers.tick(4499);
    assert.deepEqual(calls, ['ready']);
    mock.timers.tick(1);
    assert.deepEqual(calls, ['ready', 'leave']);
    mock.timers.reset();
  });

  it('starts the 4.5 s at ready when released before the photo shows', () => {
    const { clock, calls } = setup(true);
    clock.release();
    mock.timers.tick(1500);
    mock.timers.tick(4500);
    assert.deepEqual(calls, ['ready', 'leave']);
    mock.timers.reset();
  });
});
