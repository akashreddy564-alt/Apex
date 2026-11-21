/**
 * Short "value + reason" lines for trail and hike screens. Pure, so node tests
 * can run it (no `@/` imports). A line is left out rather than say something
 * the data does not support.
 */
import { climbRateFtPerMile } from './trailDifficulty.ts';

const FEET_PER_METRE = 3.28084;
const KM_PER_MILE = 1.609344;
const METRES_PER_MILE = 1609.344;

export interface Reason {
  value: string;
  text: string;
}

type ProfilePoint = { distance_m: number; elevation_m: number };

type TrailInput = {
  distance_km: number | null;
  elevation_gain_m: number | null;
  peak_elevation_m: number | null;
  elevation_profile: ProfilePoint[];
};

type HikeInput = {
  id: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  duration_seconds: number;
};

function feet(m: number): string {
  return Math.round(m * FEET_PER_METRE).toLocaleString('en-US');
}

/** Where the climb is concentrated: summit distance in miles, or null if it is not "nearly all". */
function frontLoadedMiles(profile: ProfilePoint[]): string | null {
  if (profile.length < 2) return null;
  const total = profile[profile.length - 1].distance_m;
  if (!(total > 0)) return null;
  let summit = 0;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i].elevation_m > profile[summit].elevation_m) summit = i;
  }
  if (profile[summit].distance_m > total * 0.55) return null;
  let all = 0;
  let before = 0;
  for (let i = 1; i < profile.length; i++) {
    const step = profile[i].elevation_m - profile[i - 1].elevation_m;
    if (step > 0) {
      all += step;
      if (i <= summit) before += step;
    }
  }
  if (!(all > 0) || before < all * 0.8) return null;
  return (profile[summit].distance_m / METRES_PER_MILE).toFixed(1);
}

export function difficultyReasons(t: TrailInput): Reason[] {
  const out: Reason[] = [];
  if (t.elevation_gain_m != null) {
    const miles = frontLoadedMiles(t.elevation_profile);
    out.push({
      value: `${feet(t.elevation_gain_m)} ft`,
      text: miles ? `of climbing, nearly all of it in the first ${miles} mi` : 'of climbing',
    });
  }
  const rate = climbRateFtPerMile(t.distance_km, t.elevation_gain_m);
  if (rate != null) out.push({ value: String(rate), text: 'feet of climb per mile on average' });
  if (t.peak_elevation_m != null) {
    const base = t.elevation_profile[0]?.elevation_m;
    const aboveFt = base == null ? 0 : (t.peak_elevation_m - base) * FEET_PER_METRE;
    out.push({
      value: `${feet(t.peak_elevation_m)} ft`,
      text:
        aboveFt > 0
          ? `at the summit, about ${(Math.round(aboveFt / 10) * 10).toLocaleString('en-US')} ft above the trailhead`
          : 'at the summit',
    });
  }
  return out;
}

function beatsAll(value: number | null, others: (number | null)[]): boolean {
  if (value == null) return false;
  const known = others.filter((v): v is number => v != null);
  return known.length >= 2 && known.every((v) => value > v);
}

export function hikeReasons(
  hike: HikeInput,
  others: HikeInput[],
): { distance: string | null; climb: string | null; time: string | null } {
  const rest = others.filter((o) => o.id !== hike.id);
  const distance = beatsAll(hike.distance_km, rest.map((o) => o.distance_km)) ? 'Your longest hike yet' : null;
  const climb = beatsAll(hike.elevation_gain_m, rest.map((o) => o.elevation_gain_m)) ? 'Your biggest climb yet' : null;

  let time: string | null = null;
  if (hike.distance_km != null && hike.distance_km > 0 && hike.duration_seconds > 0) {
    const paces = rest
      .filter((o) => o.distance_km != null && o.distance_km > 0 && o.duration_seconds > 0)
      .map((o) => o.duration_seconds / 60 / ((o.distance_km as number) / KM_PER_MILE));
    if (paces.length >= 2) {
      const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
      const mine = hike.duration_seconds / 60 / (hike.distance_km / KM_PER_MILE);
      const minutes = Math.round((avg - mine) * (hike.distance_km / KM_PER_MILE));
      if (Math.abs(minutes) >= 3) {
        time = `${Math.abs(minutes)} min ${minutes > 0 ? 'faster' : 'slower'} than your usual pace`;
      }
    }
  }
  return { distance, climb, time };
}

export function rankReason(above: string | null, below: string | null): string | null {
  if (above && below) return `Above ${above}, below ${below}`;
  if (above) return `Above ${above}`;
  if (below) return `Below ${below}`;
  return null;
}
