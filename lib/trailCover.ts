/**
 * The image behind a trail card: the newest hike photo of that trail, else a
 * label-free satellite shot with the route drawn on it, else nothing.
 * Pure, so it runs under node tests (no `@/` imports).
 */

type Coordinate = [number, number] | [number, number, number];

type LineString = { type: 'LineString'; coordinates: Coordinate[] };

type CoverLog = { trail_id: string; photos: string[]; created_at: string };

export type TrailCover = { kind: 'photo'; uri: string } | { kind: 'map'; uri: string };

/** Route colour on the satellite image (Bone). */
const ROUTE_COLOR = 'EDE6D6';
const MAX_POINTS = 300;

/** Logical pixels; Mapbox serves @2x. Its static API caps each side at 1280. */
export type CoverSize = { width: number; height: number };
const CARD_SIZE: CoverSize = { width: 600, height: 340 };

/** Google encoded polyline, precision 5. Input is [lng, lat]. */
export function encodePolyline(coordinates: Coordinate[]): string {
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  const push = (delta: number) => {
    let v = delta < 0 ? ~(delta << 1) : delta << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of coordinates) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    push(la - prevLat);
    push(ln - prevLng);
    prevLat = la;
    prevLng = ln;
  }
  return out;
}

function thin(coordinates: Coordinate[]): Coordinate[] {
  if (coordinates.length <= MAX_POINTS) return coordinates;
  const step = (coordinates.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => coordinates[Math.round(i * step)]);
}

export function mapCoverUrl(
  path: LineString,
  token: string | undefined,
  size: CoverSize = CARD_SIZE,
): string | null {
  if (!token || path.coordinates.length < 2) return null;
  const line = encodeURIComponent(encodePolyline(thin(path.coordinates)));
  return (
    'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/' +
    `path-4+${ROUTE_COLOR}-0.9(${line})/auto/${size.width}x${size.height}@2x` +
    `?padding=60&access_token=${token}`
  );
}

export function trailCover(
  trailId: string,
  path: LineString,
  logs: CoverLog[],
  token: string | undefined,
  size: CoverSize = CARD_SIZE,
): TrailCover | null {
  let newest: CoverLog | null = null;
  for (const log of logs) {
    if (log.trail_id !== trailId) continue;
    if (!log.photos.some((p) => !p.startsWith('sb:'))) continue;
    if (!newest || log.created_at > newest.created_at) newest = log;
  }
  const photo = newest?.photos.find((p) => !p.startsWith('sb:'));
  if (photo) return { kind: 'photo', uri: photo };
  const map = mapCoverUrl(path, token, size);
  return map ? { kind: 'map', uri: map } : null;
}
