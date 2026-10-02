import { Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { projectLine } from '@/lib/projectPath';
import type { RouteShape } from '@/lib/routeSource';
import { colors } from '@/theme/tokens';

const WIDTH = 280;
const HEIGHT = 72;

function pointsFromPath(d: string): string {
  return d
    .split(/[ML]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

/** Sage route, or a dashed placeholder that is not a path. */
export function RouteSketch({ shape }: { shape: RouteShape }) {
  if (shape.origin === 'none' || shape.coordinates.length < 2) {
    return (
      <View className="mt-3">
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Polyline
            points={`16 ${HEIGHT / 2} ${WIDTH - 16} ${HEIGHT / 2}`}
            fill="none"
            stroke={colors.fgFaint}
            strokeWidth={1.5}
            strokeDasharray="4 6"
          />
        </Svg>
        <Text className="text-[12px] text-fg-muted">No route</Text>
      </View>
    );
  }

  const line = { type: 'LineString' as const, coordinates: shape.coordinates };
  const bounds = shape.coordinates.reduce(
    (box, [lon, lat]) => ({
      minLon: Math.min(box.minLon, lon),
      maxLon: Math.max(box.maxLon, lon),
      minLat: Math.min(box.minLat, lat),
      maxLat: Math.max(box.maxLat, lat),
    }),
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );
  const projected = projectLine(line, WIDTH, HEIGHT, bounds);

  let elevationPoints = '';
  if (shape.elevation && shape.elevation.length >= 2) {
    const heights = shape.elevation.map((sample) => sample.elevation_m);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const span = Math.max(max - min, 1);
    elevationPoints = shape.elevation
      .map((sample, index) => {
        const x = (index / (shape.elevation!.length - 1)) * WIDTH;
        const y = HEIGHT - ((sample.elevation_m - min) / span) * (HEIGHT - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <View className="mt-3">
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Polyline
          points={pointsFromPath(projected.d)}
          fill="none"
          stroke={colors.sage}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {elevationPoints ? (
          <Polyline
            points={elevationPoints}
            fill="none"
            stroke={colors.sage}
            strokeWidth={1.5}
            opacity={0.7}
          />
        ) : null}
      </Svg>
      {shape.credit ? <Text className="text-[12px] text-fg-muted">{shape.credit}</Text> : null}
    </View>
  );
}
