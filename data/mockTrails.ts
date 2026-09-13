import type { ElevationSample, Trail } from '@/types/trail';

function profile(
  samples: Array<[distance_m: number, elevation_m: number]>,
): ElevationSample[] {
  return samples.map(([distance_m, elevation_m]) => ({ distance_m, elevation_m }));
}

function line(
  coords: [number, number][],
): Trail['path'] {
  return { type: 'LineString', coordinates: coords };
}

const now = new Date().toISOString();

export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';

export const MOCK_TRAILS: Trail[] = [
  {
    id: 'trail-diablo',
    name: 'Mt. Diablo Summit',
    region: 'East Bay, CA',
    distance_km: 12.4,
    elevation_gain_m: 980,
    peak_elevation_m: 1173,
    avg_moving_time_seconds: 4 * 3600 + 12 * 60,
    path: line([
      [-121.914, 37.862],
      [-121.905, 37.871],
      [-121.914, 37.881],
    ]),
    elevation_profile: profile([
      [0, 220],
      [1200, 340],
      [2400, 480],
      [3600, 610],
      [4800, 720],
      [6000, 850],
      [7200, 960],
      [8400, 1080],
      [9600, 1140],
      [10800, 1173],
      [12400, 1170],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-tam',
    name: 'East Peak via Matt Davis',
    region: 'Mt. Tamalpais, CA',
    distance_km: 14.1,
    elevation_gain_m: 760,
    peak_elevation_m: 784,
    avg_moving_time_seconds: 3 * 3600 + 48 * 60,
    path: line([
      [-122.596, 37.907],
      [-122.58, 37.92],
      [-122.577, 37.929],
    ]),
    elevation_profile: profile([
      [0, 120],
      [1500, 210],
      [3000, 320],
      [4500, 410],
      [6000, 500],
      [7500, 590],
      [9000, 680],
      [11000, 740],
      [14100, 784],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-halfdome',
    name: 'Half Dome Cables',
    region: 'Yosemite, CA',
    distance_km: 23.2,
    elevation_gain_m: 1460,
    peak_elevation_m: 2694,
    avg_moving_time_seconds: 9 * 3600 + 20 * 60,
    path: line([
      [-119.557, 37.733],
      [-119.53, 37.746],
      [-119.533, 37.746],
    ]),
    elevation_profile: profile([
      [0, 1220],
      [2000, 1380],
      [4000, 1520],
      [6000, 1680],
      [9000, 1900],
      [12000, 2100],
      [15000, 2280],
      [18000, 2450],
      [21000, 2620],
      [23200, 2694],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-raineer',
    name: 'Skyline Loop',
    region: 'Mt. Rainier, WA',
    distance_km: 8.9,
    elevation_gain_m: 520,
    peak_elevation_m: 2073,
    avg_moving_time_seconds: 2 * 3600 + 55 * 60,
    path: line([
      [-121.74, 46.786],
      [-121.73, 46.79],
      [-121.735, 46.8],
    ]),
    elevation_profile: profile([
      [0, 1640],
      [1000, 1720],
      [2500, 1850],
      [4000, 1960],
      [5500, 2040],
      [7000, 2073],
      [8900, 1980],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-angel',
    name: 'Angel Island Perimeter',
    region: 'SF Bay, CA',
    distance_km: 9.6,
    elevation_gain_m: 310,
    peak_elevation_m: 240,
    avg_moving_time_seconds: 2 * 3600 + 10 * 60,
    path: line([
      [-122.435, 37.86],
      [-122.43, 37.87],
      [-122.44, 37.865],
    ]),
    elevation_profile: profile([
      [0, 10],
      [1200, 40],
      [2400, 90],
      [3600, 150],
      [4800, 200],
      [6000, 240],
      [7200, 180],
      [8400, 80],
      [9600, 15],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-mission',
    name: 'Mission Peak',
    region: 'Fremont, CA',
    distance_km: 9.8,
    elevation_gain_m: 650,
    peak_elevation_m: 770,
    avg_moving_time_seconds: 2 * 3600 + 40 * 60,
    path: line([
      [-121.88, 37.504],
      [-121.88, 37.512],
      [-121.88, 37.519],
    ]),
    elevation_profile: profile([
      [0, 120],
      [1000, 220],
      [2500, 360],
      [4000, 480],
      [5500, 600],
      [7000, 700],
      [8500, 760],
      [9800, 770],
    ]),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'trail-lands',
    name: "Lands End Coastal",
    region: 'San Francisco, CA',
    distance_km: 5.2,
    elevation_gain_m: 180,
    peak_elevation_m: 95,
    avg_moving_time_seconds: 1 * 3600 + 15 * 60,
    path: line([
      [-122.51, 37.78],
      [-122.505, 37.785],
      [-122.51, 37.79],
    ]),
    elevation_profile: profile([
      [0, 20],
      [800, 45],
      [1600, 70],
      [2400, 95],
      [3200, 60],
      [4000, 35],
      [5200, 25],
    ]),
    created_at: now,
    updated_at: now,
  },
];

export function getTrailById(id: string): Trail | undefined {
  return MOCK_TRAILS.find((t) => t.id === id);
}
