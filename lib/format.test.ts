import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatChartDistance,
  formatChartElevation,
  formatCompactDuration,
  formatDistanceKm,
  formatDuration,
  formatElevationM,
  formatOptionalDistance,
  MISSING_METRIC,
} from './format.ts';

describe('chart formatters', () => {
  it('writes distance with one decimal and a space before km', () => {
    assert.equal(formatDistanceKm(0), '0.0 km');
    assert.equal(formatDistanceKm(9.6), '9.6 km');
    assert.equal(formatDistanceKm(9.99), '10.0 km');
    assert.equal(formatDistanceKm(10), '10.0 km');
    assert.equal(formatDistanceKm(12.4), '12.4 km');
    assert.equal(formatDistanceKm(12.44), '12.4 km');
    assert.equal(formatDistanceKm(14.14), '14.1 km');
    assert.equal(formatDistanceKm(1000), '1000.0 km');
    assert.equal(formatOptionalDistance(null), MISSING_METRIC);
    assert.equal(formatOptionalDistance(9.6), '9.6 km');
    assert.equal(formatChartDistance({ value: 0 }), '0.0 km');
    assert.equal(formatChartDistance({ value: 12_400 }), '12.4 km');
    assert.equal(formatChartDistance({ value: '12400' }), '12.4 km');
    assert.equal(formatChartDistance({ value: 1_000_000 }), '1000.0 km');
    assert.equal(formatChartDistance({ value: -1, atRestMeters: 12_400 }), '12.4 km');
    assert.equal(formatChartDistance({ value: -1 }), '\u2013');
    assert.equal(formatChartDistance({ value: -1, atRestMeters: null }), '\u2013');
  });

  it('writes elevation in whole meters with a thousands comma', () => {
    assert.equal(formatElevationM(0), '0 m');
    assert.equal(formatElevationM(240), '240 m');
    assert.equal(formatElevationM(999), '999 m');
    assert.equal(formatElevationM(1000), '1,000 m');
    assert.equal(formatElevationM(1240), '1,240 m');
    assert.equal(formatElevationM(12400), '12,400 m');
    assert.equal(formatChartElevation({ value: '0' }), '0 m');
    assert.equal(formatChartElevation({ value: '240' }), '240 m');
    assert.equal(formatChartElevation({ value: '1240' }), '1,240 m');
    assert.equal(formatChartElevation({ value: '12400.4' }), '12,400 m');
    assert.equal(formatChartElevation({ value: '', atRestMeters: 1240 }), '1,240 m');
    assert.equal(formatChartElevation({ value: '' }), '\u2013');
    assert.equal(formatChartElevation({ value: '', atRestMeters: null }), '\u2013');
  });

  it('groups elevation thousands without using locale', () => {
    assert.equal(formatElevationM(310), '310 m');
    assert.equal(formatElevationM(2073), '2,073 m');
    assert.equal(formatElevationM(1000000), '1,000,000 m');
    assert.equal(formatElevationM(-1200.4), '-1,200 m');
  });

  it('uses hours once the clock passes an hour', () => {
    assert.equal(formatDuration(0), '0m 00s');
    assert.equal(formatDuration(90), '1m 30s');
    assert.equal(formatDuration(3600), '1h 00m');
    assert.equal(formatDuration(3661), '1h 01m');
  });

  it('renders an en dash for a missing time and a compact clock otherwise', () => {
    assert.equal(formatCompactDuration(null), MISSING_METRIC);
    assert.equal(MISSING_METRIC, '\u2013');
    assert.equal(formatCompactDuration(-5), '0m');
    assert.equal(formatCompactDuration(59), '0m');
    assert.equal(formatCompactDuration(90), '1m');
    assert.equal(formatCompactDuration(3600), '1:00');
    assert.equal(formatCompactDuration(3670), '1:01');
    assert.equal(formatCompactDuration(8 * 3600 + 9 * 60), '8:09');
  });
});
