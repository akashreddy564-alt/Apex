import type { GeoJSONLineString } from '@/types/trail';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-000000000000';
}

/** PostGIS EWKT. GeoJSON positions are [lon, lat, alt?]. */
export function lineStringToEwkt(line: GeoJSONLineString): string {
  const body = line.coordinates
    .map((position) => {
      const [lon, lat, alt] = position;
      return alt == null ? `${lon} ${lat}` : `${lon} ${lat} ${alt}`;
    })
    .join(', ');
  return `SRID=4326;LINESTRING(${body})`;
}

export function asLineString(value: unknown): GeoJSONLineString | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { type?: unknown; coordinates?: unknown };
  if (record.type !== 'LineString' || !Array.isArray(record.coordinates)) return null;
  const coordinates = record.coordinates.filter(
    (position): position is [number, number] | [number, number, number] =>
      Array.isArray(position) &&
      position.length >= 2 &&
      typeof position[0] === 'number' &&
      typeof position[1] === 'number',
  );
  if (coordinates.length < 2) return null;
  return {
    type: 'LineString',
    coordinates: coordinates as GeoJSONLineString['coordinates'],
  };
}
