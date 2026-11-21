/**
 * The weekend pick: one trail a week, chosen from how you rank hikes.
 * Pure, so node tests can run it (no `@/` imports).
 * See docs/superpowers/specs/2026-11-21-weekend-pick-design.md.
 */

export interface PickTrail {
  id: string;
  name: string;
  region: string;
  /** 'catalog' trails are suggested; 'user' and demo trails only when saved. */
  source?: 'catalog' | 'user' | string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  /** [lon, lat] of the trailhead or the path's first point. */
  start: [number, number] | null;
}

export interface PickReason {
  value: string;
  text: string;
}

export interface WeekendPick {
  trail: PickTrail;
  reasons: PickReason[];
}

export interface PickInput {
  trails: PickTrail[];
  /** Loved trail ids, best first. */
  loved: string[];
  /** Trails already hiked or ranked. */
  done: string[];
  /** Saved trail ids. */
  saved: string[];
  /** Where you hike. `fromHike` is false when it falls back to a Loved trailhead. */
  home: { lat: number; lon: number; fromHike: boolean } | null;
  /** Skipped this week. */
  skipped: string[];
}

const RADIUS_MI = 150;
const SAVED_BONUS = 0.5;
const PER_100_MI = 0.2;
const LIKE_THRESHOLD = 0.6;
const EARTH_RADIUS_MI = 3958.8;
const KM_PER_MILE = 1.609344;
const FEET_PER_METRE = 3.28084;

/** Wednesday through Sunday, local time. */
export function isPickDay(now: Date): boolean {
  const day = now.getDay();
  return day === 0 || day >= 3;
}

/** The local Monday that starts `now`'s week, as YYYY-MM-DD. Skips reset when it changes. */
export function pickWeekKey(now: Date): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

function measured(t: PickTrail): t is PickTrail & { distance_km: number; elevation_gain_m: number } {
  return (t.distance_km ?? 0) > 0 && (t.elevation_gain_m ?? 0) > 0;
}

/** Two names for the same trail, e.g. a demo "Half Dome" and the catalog "Half Dome via the Mist Trail". */
function sameName(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

function feet(m: number): string {
  return Math.round(m * FEET_PER_METRE).toLocaleString('en-US');
}

function miles(km: number): string {
  const mi = km / KM_PER_MILE;
  return mi >= 10 ? String(Math.round(mi)) : mi.toFixed(1);
}

/** Every candidate, best first. The first is this week's pick; skips move down the list. */
export function weekendPicks(input: PickInput): WeekendPick[] {
  const { home } = input;
  if (!home) return [];
  const byId = new Map(input.trails.map((t) => [t.id, t]));
  const loved = input.loved.flatMap((id) => {
    const t = byId.get(id);
    return t && measured(t) ? [t] : [];
  });
  if (loved.length === 0) return [];

  const saved = new Set(input.saved);
  const skipped = new Set(input.skipped);
  const doneNames = input.done.flatMap((id) => {
    const t = byId.get(id);
    return t ? [t.name] : [];
  });
  const done = new Set(input.done);

  const scored = input.trails.flatMap((t) => {
    if (done.has(t.id) || skipped.has(t.id) || !measured(t) || !t.start) return [];
    if (t.source !== 'catalog' && !saved.has(t.id)) return [];
    if (doneNames.some((name) => sameName(name, t.name))) return [];
    const away = milesBetween(home, { lon: t.start[0], lat: t.start[1] });
    if (away > RADIUS_MI) return [];

    let match = loved[0];
    let gap = Infinity;
    for (const l of loved) {
      const d =
        Math.abs(Math.log(t.distance_km / l.distance_km)) + Math.abs(Math.log(t.elevation_gain_m / l.elevation_gain_m));
      if (d < gap) {
        gap = d;
        match = l;
      }
    }
    const isSaved = saved.has(t.id);
    const score = gap - (isSaved ? SAVED_BONUS : 0) + (away / 100) * PER_100_MI;

    const reasons: PickReason[] = [];
    if (isSaved) reasons.push({ value: 'Saved', text: 'You saved this one from a friend’s hike.' });
    if (gap < LIKE_THRESHOLD) {
      reasons.push({
        value: `Like ${match.name}`,
        text: `Close in length and climb to a trail you loved: ${feet(match.elevation_gain_m)} ft over ${miles(match.distance_km)} mi.`,
      });
    }
    if (home.fromHike) {
      reasons.push({ value: `${Math.max(1, Math.round(away))} mi`, text: 'From where you last hiked.' });
    }
    return [{ trail: t, reasons: reasons.slice(0, 2), score }];
  });

  scored.sort((a, b) => a.score - b.score || (a.trail.id < b.trail.id ? -1 : 1));
  return scored.map(({ trail, reasons }) => ({ trail, reasons }));
}
