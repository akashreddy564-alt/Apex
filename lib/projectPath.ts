import type { GeoJSONLineString } from '@/types/trail';

export interface ProjectedPath {
  d: string;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapBounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

const PAD = 16;

/** [longitude, latitude] or [longitude, latitude, altitude]. */
export type MapCoordinate = [number, number] | [number, number, number];

/** One lat/lon projection for the trail map, compare cards, and the live track. */
export function projectPoints(
  coordinates: [number, number][] | [number, number, number][],
  width: number,
  height: number,
  pad: number,
  bounds?: MapBounds,
): MapPoint[] {
  if (coordinates.length === 0 || width <= 0 || height <= 0) return [];
  const box =
    bounds ??
    lineBounds([
      {
        type: 'LineString',
        coordinates,
      },
    ]);
  const spanLon = Math.max(box.maxLon - box.minLon, 0.00001);
  const spanLat = Math.max(box.maxLat - box.minLat, 0.00001);
  const midLat = (box.minLat + box.maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const spanX = spanLon * Math.max(cosLat, 0.01);
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const scale = Math.min(innerW / spanX, innerH / spanLat);
  const usedW = spanX * scale;
  const usedH = spanLat * scale;
  const originX = pad + (innerW - usedW) / 2;
  const originY = pad + (innerH - usedH) / 2;
  return coordinates.map(([lon, lat]) => ({
    x: originX + (lon - box.minLon) * cosLat * scale,
    y: originY + (1 - (lat - box.minLat) / spanLat) * usedH,
  }));
}

export function projectLine(
  line: GeoJSONLineString,
  width: number,
  height: number,
  bounds: MapBounds,
): ProjectedPath {
  const points = projectPoints(
    line.coordinates.map((coord): [number, number] => [coord[0], coord[1]]),
    width,
    height,
    PAD,
    bounds,
  );
  const cmds = points.map(
    (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  );
  return { d: cmds.join(' ') };
}

export function buildTrailMap(
  canonical: GeoJSONLineString,
  recorded: GeoJSONLineString | null,
  width: number,
  height: number,
) {
  const lines = [canonical, recorded].filter(
    (line): line is GeoJSONLineString => !!line && line.coordinates.length >= 2,
  );
  if (lines.length === 0 || width <= 0 || height <= 0) return null;
  const bounds = lineBounds(lines);
  const moving = recorded && recorded.coordinates.length >= 2 ? 'recorded' : 'canonical';
  return {
    canonical:
      canonical.coordinates.length >= 2 ? projectLine(canonical, width, height, bounds) : null,
    recorded:
      recorded && recorded.coordinates.length >= 2
        ? projectLine(recorded, width, height, bounds)
        : null,
    moving,
  };
}

export function lineBounds(lines: GeoJSONLineString[]) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const line of lines) {
    for (const [lon, lat] of line.coordinates) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}
