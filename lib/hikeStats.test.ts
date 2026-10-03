import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MISSING_METRIC } from './format.ts';
import { gpsBlendCorrector, openTopoDataCorrector } from './altitude.ts';
import {
  applyAltitudeStep,
  applyRecordingEvent,
  formatPace,
  nextRecordingPhase,
  paceSecondsPerKm,
  recordingPhase,
  splitClock,
  totalSeconds,
  type RecordingClock,
} from './hikeStats.ts';
import { backgroundRecordingAvailable } from './recordingEnvironment.ts';

test('smoothed altitude ignores jitter inside the threshold and counts loss', () => {
  const corrector = gpsBlendCorrector(1);
  let smoothed: number | null = null;
  let climb = { elevationGainM: 0, elevationLossM: 0, baseline: null as number | null };
  const samples = [100, 101, 110, 112, 100];
  for (const altitude of samples) {
    smoothed = corrector.correct(smoothed, { altitude, latitude: 0, longitude: 0 });
    climb = applyAltitudeStep(climb, smoothed);
  }
  assert.ok(climb.elevationGainM >= 9);
  assert.ok(climb.elevationLossM >= 9);
  assert.equal(openTopoDataCorrector.correct(50, { altitude: 80, latitude: 1, longitude: 2 }), null);
});

test('pace and total time ignore a pause that moving time already excluded', () => {
  assert.equal(paceSecondsPerKm(0, 60), null);
  assert.equal(paceSecondsPerKm(1000, 600), 600);
  assert.equal(formatPace(null), `${MISSING_METRIC}/km`);
  assert.equal(formatPace(Number.NaN), `${MISSING_METRIC}/km`);
  assert.equal(formatPace(600), '10:00 /km');
  assert.equal(totalSeconds(1_000, 11_000), 10);
});

test('a pause is excluded from moving time and kept in the total', () => {
  const started = 0;
  const clock = splitClock(started, 20_000, 50_000, 80_000);
  assert.equal(clock.total, 80);
  assert.equal(clock.paused, 50);
  assert.equal(clock.moving, 30);
  assert.equal(splitClock(started, 0, null, 10_000).moving, 10);
});

test('recording only moves through start, pause, resume, and stop', () => {
  assert.equal(recordingPhase(null), 'idle');
  assert.equal(recordingPhase({ pausedAt: null }), 'recording');
  assert.equal(recordingPhase({ pausedAt: 10 }), 'paused');
  assert.equal(nextRecordingPhase('idle', 'pause'), 'idle');
  assert.equal(nextRecordingPhase('idle', 'start'), 'recording');
  assert.equal(nextRecordingPhase('recording', 'pause'), 'paused');
  assert.equal(nextRecordingPhase('paused', 'resume'), 'recording');
  assert.equal(nextRecordingPhase('paused', 'stop'), 'idle');
  assert.equal(nextRecordingPhase('recording', 'start'), 'recording');
});

test('a second start keeps the open hike and stop clears it', () => {
  const started = applyRecordingEvent(null, 'start', 1_000, (): RecordingClock => ({
    startedAt: 1_000,
    pausedAt: null,
    pausedMs: 0,
  }));
  assert.ok(started);
  const again = applyRecordingEvent(started, 'start', 9_000, () => ({
    startedAt: 9_000,
    pausedAt: null,
    pausedMs: 0,
  }));
  assert.equal(again?.startedAt, 1_000);
  const paused = applyRecordingEvent(started, 'pause', 5_000);
  assert.equal(paused?.pausedAt, 5_000);
  assert.equal(applyRecordingEvent(paused, 'pause', 6_000), paused);
  const resumed = applyRecordingEvent(paused, 'resume', 8_000);
  assert.equal(resumed?.pausedAt, null);
  assert.equal(resumed?.pausedMs, 3_000);
  assert.equal(applyRecordingEvent(resumed, 'stop', 9_000), null);
  assert.equal(applyRecordingEvent(null, 'stop', 9_000), null);
  assert.equal(applyRecordingEvent(null, 'pause', 9_000), null);
});

test('background recording is off in Expo Go and on the web', () => {
  assert.equal(backgroundRecordingAvailable('ios', 'storeClient'), false);
  assert.equal(backgroundRecordingAvailable('web', 'bare'), false);
  assert.equal(backgroundRecordingAvailable('ios', 'bare'), true);
  assert.equal(backgroundRecordingAvailable('android', 'standalone'), true);
});
