import { haversineMeters } from '@/lib/geo';
import type { ElevationSample, GeoJSONLineString } from '@/types/trail';

export type RouteOrigin = 'recording' | 'trail' | 'osm' | 'none';

export interface RouteShape {
  origin: RouteOrigin;
  coordinates: [number, number][];
  /** Card label. An OSM route must keep the OpenStreetMap credit. */
  credit: 'Your recording' | '© OpenStreetMap' | null;
  elevation: ElevationSample[] | null;
}

/** A confirmed hiking relation from our own database. Not the public Overpass API. */
export interface OsmRouteLookup {
  findHikingRoute(trailId: string): Promise<{ coordinates: [number, number][] } | null>;
}

/** USGS elevation along a line. Not wired. */
export interface TerrainElevationLookup {
  profile(coordinates: [number, number][]): Promise<ElevationSample[] | null>;
}

export const osmRouteLookup: OsmRouteLookup = {
  async findHikingRoute() {
    return null;
  },
};

export const openTopoDataLookup: TerrainElevationLookup = {
  async profile() {
    return null;
  },
};

type Line = Pick<GeoJSONLineString, 'coordinates'> | null | undefined;

function pairs(line: Line): [number, number][] {
  if (!line) return [];
  return line.coordinates
    .filter((coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map((coord) => [coord[0], coord[1]] as [number, number]);
}

function elevationFromRecording(line: Line): ElevationSample[] | null {
  if (!line) return null;
  const samples: ElevationSample[] = [];
  let distance = 0;
  let previous: [number, number] | null = null;
  for (const coord of line.coordinates) {
    const altitude = coord[2];
    if (previous) {
      distance += haversineMeters(
        { longitude: previous[0], latitude: previous[1] },
        { longitude: coord[0], latitude: coord[1] },
      );
    }
    previous = [coord[0], coord[1]];
    if (typeof altitude === 'number' && Number.isFinite(altitude)) {
      samples.push({ distance_m: distance, elevation_m: altitude });
    }
  }
  return samples.length >= 2 ? samples : null;
}

/**
 * (a) the hiker's recording, (b) a confirmed OSM relation, (c) the trail's
 * known route, (d) nothing. The empty shape must not be drawn as a path.
 */
export function resolveRoute(input: {
  recorded?: Line;
  osm?: { coordinates: [number, number][] } | null;
  trailPath?: Line;
  trailElevation?: ElevationSample[] | null;
}): RouteShape {
  const recorded = pairs(input.recorded);
  if (recorded.length >= 2) {
    return {
      origin: 'recording',
      coordinates: recorded,
      credit: 'Your recording',
      elevation: elevationFromRecording(input.recorded),
    };
  }

  const osm = input.osm?.coordinates.filter(
    (coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]),
  );
  if (osm && osm.length >= 2) {
    return {
      origin: 'osm',
      coordinates: osm,
      credit: '© OpenStreetMap',
      elevation: null,
    };
  }

  const trail = pairs(input.trailPath);
  if (trail.length >= 2) {
    const elevation = input.trailElevation ?? null;
    return {
      origin: 'trail',
      coordinates: trail,
      credit: '© OpenStreetMap',
      elevation: elevation && elevation.length >= 2 ? elevation : null,
    };
  }

  return { origin: 'none', coordinates: [], credit: null, elevation: null };
}
