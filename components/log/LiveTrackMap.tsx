import { useState } from 'react';
import { Text, View } from 'react-native';
import { Circle, Polyline, Svg } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { projectPoints } from '@/lib/projectPath';
import { withAlpha } from '@/theme/color';
import { fonts } from '@/theme/tokens';
import type { ElevationSample, GeoJSONLineString } from '@/types/trail';

interface TrackPoint {
  longitude: number;
  latitude: number;
  altitude?: number | null;
}

/** Below this rise between fixes a step counts as flat, so GPS jitter doesn't flicker the color. */
const CLIMB_STEP_M = 0.3;

/**
 * The recorded track split into runs that climb and runs that don't, each
 * sharing its end point with the next so the line stays joined.
 */
export function climbRuns<T>(xy: T[], altitudes: (number | null | undefined)[]): { up: boolean; points: T[] }[] {
  const runs: { up: boolean; points: T[] }[] = [];
  for (let i = 1; i < xy.length; i++) {
    const a = altitudes[i - 1];
    const b = altitudes[i];
    const up = a != null && b != null && b - a > CLIMB_STEP_M;
    const last = runs[runs.length - 1];
    if (last && last.up === up) last.points.push(xy[i]);
    else runs.push({ up, points: [xy[i - 1], xy[i]] });
  }
  return runs;
}

interface LiveTrackMapProps {
  width: number;
  height: number;
  trailPath: GeoJSONLineString | null;
  elevation: ElevationSample[] | null;
  recorded: TrackPoint[];
  trailName: string;
}

function asPoints(line: GeoJSONLineString | null): TrackPoint[] {
  if (!line) return [];
  return line.coordinates
    .filter((coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map((coord) => ({ longitude: coord[0], latitude: coord[1] }));
}

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

function polyline(points: { x: number; y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

/** Recorded track over the known route, brown where you climbed. The dashed line is the trail, not a guess. */
export function LiveTrackMap({
  width,
  height,
  trailPath,
  elevation,
  recorded,
  trailName,
}: LiveTrackMapProps) {
  const c = useColors();
  const [laidOut, setLaidOut] = useState({ width, height });
  const boxW = laidOut.width || width;
  const boxH = height;
  const trail = asPoints(trailPath);
  const recordedPoints = recorded.filter(
    (point) => Number.isFinite(point.longitude) && Number.isFinite(point.latitude),
  );
  const frame = trail.length >= 2 ? trail : recordedPoints;
  const frameCoords: [number, number][] = (trail.length >= 2 ? [...trail, ...recordedPoints] : recordedPoints).map(
    (point) => [point.longitude, point.latitude],
  );
  const projected = projectPoints(frameCoords, boxW, boxH, 28);
  const trailXY = trail.length >= 2 ? projected.slice(0, trail.length) : [];
  const recordedXY = recordedPoints.length >= 1 ? projected.slice(trail.length >= 2 ? trail.length : 0) : [];
  const peak =
    trailXY.length >= 2 ? trailXY[peakIndex(trailXY.length, elevation)] : null;
  const start = trailXY[0] ?? recordedXY[0];
  const current = recordedXY[recordedXY.length - 1];
  const showRoute = trailXY.length >= 2;

  return (
    <View
      style={{ height: boxH, backgroundColor: c.bg }}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== laidOut.width) setLaidOut({ width: next, height: boxH });
      }}
    >
      <Svg width={boxW} height={boxH}>
        {peak ? (
          <>
            <Circle cx={peak.x} cy={peak.y} r={78} stroke={withAlpha(c.climb, 0.12)} strokeWidth={1} fill="none" />
            <Circle cx={peak.x} cy={peak.y} r={52} stroke={withAlpha(c.climb, 0.16)} strokeWidth={1} fill="none" />
            <Circle cx={peak.x} cy={peak.y} r={28} stroke={withAlpha(c.climb, 0.22)} strokeWidth={1.2} fill="none" />
          </>
        ) : null}
        {showRoute ? (
          <Polyline
            points={polyline(trailXY)}
            fill="none"
            stroke={c.border}
            strokeWidth={2.5}
            strokeDasharray="2 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {recordedXY.length >= 2 ? (
          <>
            <Polyline
              points={polyline(recordedXY)}
              fill="none"
              stroke={c.bg}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Climbing stretches in contour brown, the rest in ink, so the map shows where the work was. */}
            {climbRuns(recordedXY, recordedPoints.map((point) => point.altitude)).map((run, i) => (
              <Polyline
                key={i}
                points={polyline(run.points)}
                fill="none"
                stroke={run.up ? c.climb : c.accent}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </>
        ) : null}
        {start && showRoute ? (
          <Circle
            cx={start.x}
            cy={start.y}
            r={5.5}
            fill={c.bg}
            stroke={c.fgMuted}
            strokeWidth={2.2}
          />
        ) : null}
        {peak && showRoute ? (
          <Circle
            cx={peak.x}
            cy={peak.y}
            r={4.5}
            fill={c.bg}
            stroke={c.fgFaint}
            strokeWidth={2}
          />
        ) : null}
        {current ? (
          <Circle cx={current.x} cy={current.y} r={9} fill={c.fg} stroke={c.bg} strokeWidth={3} />
        ) : null}
      </Svg>
      {peak && showRoute ? (
        <Text
          style={{
            position: 'absolute',
            left: Math.min(peak.x + 10, boxW - 120),
            top: Math.max(8, peak.y - 18),
            fontSize: 12,
            color: c.fgMuted,
            fontFamily: fonts.ui,
          }}
        >
          {trailName}
        </Text>
      ) : null}
      {showRoute ? (
        <Text
          style={{
            position: 'absolute',
            right: 12,
            bottom: 8,
            fontSize: 11,
            color: c.fgFaint,
            fontFamily: fonts.ui,
          }}
        >
          © OpenStreetMap
        </Text>
      ) : null}
      {frame.length < 2 && recordedPoints.length < 2 ? (
        <Text
          style={{
            position: 'absolute',
            left: 16,
            bottom: 12,
            fontSize: 13,
            color: c.fgMuted,
            fontFamily: fonts.ui,
          }}
        >
          Waiting for a GPS fix
        </Text>
      ) : null}
    </View>
  );
}
