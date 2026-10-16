import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatChartDistance,
  formatChartElevation,
  formatCompactDuration,
  formatDistance,
  formatDuration,
  formatElevation,
  formatElevationRange,
  formatOptionalDistance,
  formatOptionalElevation,
  MISSING_METRIC,
  milesToKm,
  paceSecondsPerMile,
  toFeet,
  toMiles,
} from './format.ts';

describe('chart formatters', () => {
  it('writes distance in miles with one decimal and a space before mi', () => {
    assert.equal(formatDistance(0), '0.0 mi');
    assert.equal(formatDistance(9.6), '6.0 mi');
    assert.equal(formatDistance(10), '6.2 mi');
    assert.equal(formatDistance(12.4), '7.7 mi');
    assert.equal(formatDistance(23.2), '14.4 mi');
    assert.equal(formatDistance(1000), '621.4 mi');
    assert.equal(formatOptionalDistance(null), MISSING_METRIC);
    assert.equal(formatOptionalDistance(Number.NaN), MISSING_METRIC);
    assert.equal(formatOptionalDistance(9.6), '6.0 mi');
    assert.equal(formatChartDistance({ value: 0 }), '0.0 mi');
    assert.equal(formatChartDistance({ value: 12_400 }), '7.7 mi');
    assert.equal(formatChartDistance({ value: '12400' }), '7.7 mi');
    assert.equal(formatChartDistance({ value: 1_000_000 }), '621.4 mi');
    assert.equal(formatChartDistance({ value: -1, atRestMeters: 12_400 }), '7.7 mi');
    assert.equal(formatChartDistance({ value: -1 }), '\u2013');
    assert.equal(formatChartDistance({ value: -1, atRestMeters: null }), '\u2013');
  });

  it('writes elevation in whole feet with a thousands comma', () => {
    assert.equal(formatElevation(0), '0 ft');
    assert.equal(formatElevation(240), '787 ft');
    assert.equal(formatElevation(999), '3,278 ft');
    assert.equal(formatElevation(1000), '3,281 ft');
    assert.equal(formatElevation(1240), '4,068 ft');
    assert.equal(formatOptionalElevation(null), MISSING_METRIC);
    assert.equal(formatOptionalElevation(1240), '4,068 ft');
    assert.equal(formatChartElevation({ value: '0' }), '0 ft');
    assert.equal(formatChartElevation({ value: '240' }), '787 ft');
    assert.equal(formatChartElevation({ value: '12400.4' }), '40,684 ft');
    assert.equal(formatChartElevation({ value: '', atRestMeters: 1240 }), '4,068 ft');
    assert.equal(formatChartElevation({ value: '' }), '\u2013');
    assert.equal(formatChartElevation({ value: '', atRestMeters: null }), '\u2013');
  });

  it('groups elevation thousands without using locale', () => {
    assert.equal(formatElevation(310), '1,017 ft');
    assert.equal(formatElevation(2073), '6,801 ft');
    assert.equal(formatElevation(1000000), '3,280,840 ft');
    assert.equal(formatElevation(-1200.4), '-3,938 ft');
  });

  it('writes an elevation range with one unit at the end', () => {
    assert.equal(formatElevationRange(1220, 2694), '4,003–8,839 ft');
  });

  it('turns typed miles back into stored kilometres', () => {
    assert.equal(milesToKm(1), 1.609344);
    assert.equal(milesToKm(0), 0);
  });

  it('converts pace per kilometre to pace per mile', () => {
    assert.equal(Math.round(paceSecondsPerMile(600)!), 966);
    assert.equal(paceSecondsPerMile(null), null);
  });

  it('converts metric values for split value and unit displays', () => {
    assert.equal(toMiles(1.609344), 1);
    assert.equal(Math.round(toFeet(1000)), 3281);
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
