import { openTopoDataLookup, osmRouteLookup, resolveRoute, routeSourceLabel } from '@/lib/routeSource';

const recorded = {
  type: 'LineString' as const,
  coordinates: [
    [-121.9, 37.5, 100],
    [-121.89, 37.51, 180],
    [-121.88, 37.52, 140],
  ] as [number, number, number][],
};

const trail = {
  type: 'LineString' as const,
  coordinates: [
    [-122.5, 37.8],
    [-122.4, 37.9],
  ] as [number, number][],
};

describe('resolveRoute', () => {
  it('prefers the recording over the trail route', () => {
    const shape = resolveRoute({
      recorded,
      trailPath: trail,
      trailElevation: [
        { distance_m: 0, elevation_m: 10 },
        { distance_m: 100, elevation_m: 20 },
      ],
    });
    expect(shape.origin).toBe('recording');
    expect(shape.credit).toBe('Your recording');
    expect(shape.coordinates).toHaveLength(3);
    expect(shape.elevation?.[0]?.elevation_m).toBe(100);
    expect(shape.elevation?.[2]?.elevation_m).toBe(140);
  });

  it('uses the known trail route and keeps the OpenStreetMap credit', () => {
    const shape = resolveRoute({
      recorded: null,
      trailPath: trail,
      trailElevation: [
        { distance_m: 0, elevation_m: 10 },
        { distance_m: 400, elevation_m: 40 },
      ],
    });
    expect(shape.origin).toBe('trail');
    expect(shape.credit).toBe('© OpenStreetMap');
    expect(shape.coordinates).toEqual(trail.coordinates);
    expect(shape.elevation).toHaveLength(2);
  });

  it('does not invent a line when nothing is known', () => {
    const shape = resolveRoute({ recorded: null, trailPath: null, osm: null });
    expect(shape.origin).toBe('none');
    expect(shape.coordinates).toEqual([]);
    expect(shape.credit).toBeNull();
    expect(shape.elevation).toBeNull();
  });

  it('lets a confirmed OSM relation replace the seeded trail line', async () => {
    expect(await osmRouteLookup.findHikingRoute('trail-mission')).toBeNull();
    expect(await openTopoDataLookup.profile(trail.coordinates)).toBeNull();
    const shape = resolveRoute({
      trailPath: trail,
      osm: {
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    });
    expect(shape.origin).toBe('osm');
    expect(shape.credit).toBe('© OpenStreetMap');
    expect(shape.coordinates).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(shape.elevation).toBeNull();
  });

  it('labels a recording, an OpenStreetMap route, and a missing route', () => {
    expect(routeSourceLabel('recording')).toBe('Your recording');
    expect(routeSourceLabel('trail')).toBe('Trail route · © OpenStreetMap');
    expect(routeSourceLabel('osm')).toBe('Trail route · © OpenStreetMap');
    expect(routeSourceLabel('none')).toBe('Logged without a route');
  });
});
