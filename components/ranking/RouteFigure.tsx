import { Text, View } from 'react-native';
import { Circle, Line, Path, Polyline, Svg } from 'react-native-svg';

import { projectPoints } from '@/lib/projectPath';
import type { RouteShape } from '@/lib/routeSource';
import { colors, fonts } from '@/theme/tokens';
import type { ElevationSample } from '@/types/trail';

function peakIndex(count: number, elevation: ElevationSample[] | null): number {
  if (count < 1) return 0;
  if (!elevation || elevation.length < 2) return count - 1;
  let best = elevation[0];
  for (const sample of elevation) {
    if (sample.elevation_m > best.elevation_m) best = sample;
  }
  const total = elevation[elevation.length - 1]?.distance_m ?? 0;
  if (total <= 0) return count - 1;
  return Math.min(count - 1, Math.round((best.distance_m / total) * (count - 1)));
}

function pointsAttr(points: { x: number; y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

/** This trail's own route. An empty shape draws the dashed placeholder, never a fake line. */
export function RouteThumb({ shape, size = 124 }: { shape: RouteShape; size?: number }) {
  if (shape.origin === 'none' || shape.coordinates.length < 2) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Svg width={84} height={14}>
          <Circle cx={6} cy={7} r={4} fill="none" stroke={colors.fgFaint} strokeWidth={1.6} />
          <Line
            x1={12}
            x2={72}
            y1={7}
            y2={7}
            stroke={colors.borderStrong}
            strokeWidth={1.6}
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <Circle cx={78} cy={7} r={4} fill="none" stroke={colors.fgFaint} strokeWidth={1.6} />
        </Svg>
        <Text style={{ fontSize: 12, color: colors.fgMuted, fontFamily: fonts.ui }}>No route</Text>
      </View>
    );
  }

  const projected = projectPoints(shape.coordinates, size, size, 10);
  const start = projected[0];
  const peak = projected[peakIndex(projected.length, shape.elevation)];
  const line = pointsAttr(projected);

  return (
    <Svg width={size} height={size}>
      <Polyline
        points={line}
        fill="none"
        stroke={colors.bg}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={line}
        fill="none"
        stroke={colors.sage}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {start ? (
        <Circle cx={start.x} cy={start.y} r={4} fill={colors.surface} stroke={colors.sage} strokeWidth={2} />
      ) : null}
      {peak ? <Circle cx={peak.x} cy={peak.y} r={3.5} fill={colors.fg} /> : null}
    </Svg>
  );
}

/** Flat 12% sage fill under the real profile. No invented shape when elevation is missing. */
export function ElevationStrip({
  samples,
  width,
  caption,
}: {
  samples: ElevationSample[] | null;
  width: number;
  caption?: string | null;
}) {
  const height = 48;
  if (!samples || samples.length < 2) {
    return (
      <View
        style={{
          height,
          borderBottomWidth: 1,
          borderBottomColor: colors.raised,
          justifyContent: 'center',
        }}
      >
        {caption ? (
          <Text style={{ fontSize: 13, color: colors.fg2, fontFamily: fonts.ui }} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
    );
  }

  const maxDistance = Math.max(samples[samples.length - 1]?.distance_m ?? 0, 1);
  const elevations = samples.map((sample) => sample.elevation_m);
  const low = Math.min(...elevations);
  const span = Math.max(Math.max(...elevations) - low, 1);
  const coords = samples.map((sample) => {
    const x = (sample.distance_m / maxDistance) * width;
    const y = 4 + (1 - (sample.elevation_m - low) / span) * (height - 10);
    return { x, y };
  });
  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width.toFixed(1)} ${height} L0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={colors.raised} strokeWidth={1} />
      <Path d={area} fill={colors.sage} fillOpacity={0.12} />
      <Path d={line} fill="none" stroke={colors.sage} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
