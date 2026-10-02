import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gpsBlendCorrector, openTopoDataCorrector } from './altitude.ts';
import { applyAltitudeStep, formatPace, paceSecondsPerKm, totalSeconds } from './hikeStats.ts';
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
  assert.equal(formatPace(600), '10:00 /km');
  assert.equal(totalSeconds(1_000, 11_000), 10);
});

test('background recording is off in Expo Go and on the web', () => {
  assert.equal(backgroundRecordingAvailable('ios', 'storeClient'), false);
  assert.equal(backgroundRecordingAvailable('web', 'bare'), false);
  assert.equal(backgroundRecordingAvailable('ios', 'bare'), true);
  assert.equal(backgroundRecordingAvailable('android', 'standalone'), true);
});
