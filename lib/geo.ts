import type { GeoJSONLineString } from '@/types/trail';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

let idCounter = 0;

/**
 * UUID v4. Hermes has shipped a `randomUUID` that returns one constant, so
 * this builds the id from `getRandomValues` or a time-and-counter mix.
 */
export function newId(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    idCounter = (idCounter + 1) >>> 0;
    const seed = Date.now() ^ Math.imul(idCounter, 0x9e3779b1);
    for (let i = 0; i < bytes.length; i++) {
      const mixed = Math.imul(seed ^ (i + 1) * 0x85ebca6b, 0x27d4eb2d) >>> 0;
      bytes[i] = mixed & 0xff;
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
