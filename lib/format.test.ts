import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatChartDistance,
  formatChartElevation,
  formatDistanceKm,
  formatElevationM,
} from './format.ts';

describe('chart formatters', () => {
  it('writes distance with one decimal and a space before km', () => {
    assert.equal(formatDistanceKm(0), '0.0 km');
    assert.equal(formatDistanceKm(12.4), '12.4 km');
    assert.equal(formatDistanceKm(12.44), '12.4 km');
    assert.equal(formatDistanceKm(1000), '1000.0 km');
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
});
