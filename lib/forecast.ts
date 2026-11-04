/**
 * The coming weekend's weather near your last hike, from Open-Meteo (free, no
 * key). Uses where you last hiked, never the phone's location: Apex promises
 * location is only used while recording. Pure parts only, for node tests.
 */

import type { DayForecast } from './nudges.ts';

type Coordinate = [number, number] | [number, number, number];

interface LogLike {
  created_at: string;
  recorded_path: { coordinates: Coordinate[] } | null;
  trail_id: string;
}

interface TrailLike {
  id: string;
  path: { coordinates: Coordinate[] } | null;
}

/**
 * Roughly where you hike: the start of your newest hike, rounded to about a
 * kilometre so the request never carries a precise point.
 */
export function hikingArea(logs: LogLike[], trails: TrailLike[]): { lat: number; lon: number } | null {
  const newest = [...logs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const log of newest) {
    const point =
      log.recorded_path?.coordinates[0] ?? trails.find((trail) => trail.id === log.trail_id)?.path?.coordinates[0];
    if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
      return { lat: Math.round(point[1] * 100) / 100, lon: Math.round(point[0] * 100) / 100 };
    }
  }
  return null;
}

export function forecastUrl(area: { lat: number; lon: number }): string {
  return (
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${area.lat}&longitude=${area.lon}` +
    '&daily=temperature_2m_max,precipitation_probability_max,weather_code' +
    '&temperature_unit=fahrenheit&timezone=auto&forecast_days=10'
  );
}

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The Saturday and Sunday on or after `now`, from Open-Meteo's daily rows. */
export function weekendFromResponse(
  body: unknown,
  now: Date,
): { saturday: DayForecast | null; sunday: DayForecast | null } | null {
  const daily = (body as { daily?: Record<string, unknown[]> } | null)?.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7));
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() + 1);

  const day = (date: Date): DayForecast | null => {
    const index = daily.time.indexOf(localDate(date));
    if (index < 0) return null;
    const highF = Number(daily.temperature_2m_max?.[index]);
    const precipPct = Number(daily.precipitation_probability_max?.[index] ?? 0);
    const code = Number(daily.weather_code?.[index]);
    return Number.isFinite(highF) && Number.isFinite(code)
      ? { highF, precipPct: Number.isFinite(precipPct) ? precipPct : 0, code }
      : null;
  };

  // A Sunday "now" means this weekend is half over; Saturday is already past.
  return { saturday: now.getDay() === 0 ? null : day(saturday), sunday: day(now.getDay() === 0 ? now : sunday) };
}
