import type { GeoJSONLineString } from '@/types/trail';

export interface ProjectedPath {
  d: string;
}

const PAD = 16;

export function projectLine(
  line: GeoJSONLineString,
  width: number,
  height: number,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
): ProjectedPath {
  const spanLon = Math.max(bounds.maxLon - bounds.minLon, 0.00001);
  const spanLat = Math.max(bounds.maxLat - bounds.minLat, 0.00001);
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const spanX = spanLon * Math.max(cosLat, 0.01);
  const innerW = Math.max(1, width - PAD * 2);
  const innerH = Math.max(1, height - PAD * 2);
  const scale = Math.min(innerW / spanX, innerH / spanLat);
  const usedW = spanX * scale;
  const usedH = spanLat * scale;
  const originX = PAD + (innerW - usedW) / 2;
  const originY = PAD + (innerH - usedH) / 2;
  const cmds = line.coordinates.map(([lon, lat], index) => {
    const x = originX + ((lon - bounds.minLon) * cosLat * scale);
    const y = originY + (1 - (lat - bounds.minLat) / spanLat) * usedH;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  });
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
