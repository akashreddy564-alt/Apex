import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { forecastUrl, hikingArea, weekendFromResponse } from './forecast.ts';

describe('hikingArea', () => {
  it('rounds the start of the newest hike to about a kilometre', () => {
    const logs = [
      { created_at: '2026-10-01T09:00:00Z', trail_id: 'old', recorded_path: null },
      { created_at: '2026-10-25T09:00:00Z', trail_id: 't', recorded_path: { coordinates: [[-121.7712, 47.4881]] as [number, number][] } },
    ];
    assert.deepEqual(hikingArea(logs, []), { lat: 47.49, lon: -121.77 });
  });

  it('falls back to the trail line, then to nothing', () => {
    const logs = [{ created_at: '2026-10-25T09:00:00Z', trail_id: 't', recorded_path: null }];
    assert.deepEqual(hikingArea(logs, [{ id: 't', path: { coordinates: [[-112.95, 37.27]] } }]), { lat: 37.27, lon: -112.95 });
    assert.equal(hikingArea(logs, []), null);
  });

  it('asks for Fahrenheit daily highs and rain chance', () => {
    assert.match(forecastUrl({ lat: 47.49, lon: -121.77 }), /latitude=47\.49&longitude=-121\.77.*temperature_unit=fahrenheit/);
  });
});

describe('weekendFromResponse', () => {
  const body = {
    daily: {
      time: ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'],
      temperature_2m_max: [60, 61, 66.2, 52],
      precipitation_probability_max: [0, 10, 5, 70],
      weather_code: [0, 1, 0, 61],
    },
  };

  it('picks the coming Saturday and Sunday', () => {
    assert.deepEqual(weekendFromResponse(body, new Date('2026-11-05T19:00:00')), {
      saturday: { highF: 66.2, precipPct: 5, code: 0 },
      sunday: { highF: 52, precipPct: 70, code: 61 },
    });
  });

  it('is null for a broken response', () => {
    assert.equal(weekendFromResponse({ nope: 1 }, new Date()), null);
  });
});
