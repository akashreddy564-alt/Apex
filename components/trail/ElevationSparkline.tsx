import * as Haptics from 'expo-haptics';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getYForX } from 'react-native-redash';
import { Circle, Path, Svg } from 'react-native-svg';
import {
  LineChart,
  LineChartDimensionsContext,
} from 'react-native-wagmi-charts';

import type { ElevationSample } from '@/types/trail';

/** Accent sage — crisp stroke only, no bloom. */
const LINE_COLOR = '#8B9A6D';
/** Solid bead that rides the stroke. No shadow, no blur. */
const TRACE_COLOR = '#F4F4F5';

/** Slow left→right map-out along distance. */
const PATH_REVEAL_MS = 10000;
/** Brief beat before the wipe so the chart doesn't flash. */
const PATH_REVEAL_DELAY_MS = 400;
const TICK_MS = 32;
/** One pass of the traveling dash along the stroke. */
const TRACE_PERIOD_MS = 3200;
const TRACE_DASH = 22;
const TRACE_GAP = 148;

interface ElevationSparklineProps {
  samples: ElevationSample[];
  height?: number;
}

function formatElev(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${Math.round(n)} m`;
}

function formatDistFromTimestamp(timestamp: string | number): string {
  const meters = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (Number.isNaN(meters)) return '—';
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Short zinc segment that crawls the sage stroke. Solid dash, no blur.
 * Wall-clock interval so the segment keeps moving while the reveal
 * re-renders the chart (a UI-thread dash was getting reset each tick).
 */
function FlowingTrace() {
  const { path, width, height } = useContext(LineChartDimensionsContext);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const cycle = TRACE_DASH + TRACE_GAP;
    const id = setInterval(() => {
      const t = (Date.now() % TRACE_PERIOD_MS) / TRACE_PERIOD_MS;
      setOffset(-t * cycle);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (!path || width <= 0 || height <= 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <Path
        d={path}
        stroke={TRACE_COLOR}
        strokeWidth={1.75}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${TRACE_DASH} ${TRACE_GAP}`}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/**
 * Leading bead while the profile is still mapping out. Hidden once the
 * wipe finishes so the crosshair stays the only cursor.
 */
function RevealHead({
  progress,
  active,
}: {
  progress: number;
  active: boolean;
}) {
  const { parsedPath, pathWidth, width, height } = useContext(
    LineChartDimensionsContext,
  );

  if (!active || width <= 0 || height <= 0 || progress <= 0) return null;
  if (!parsedPath?.curves?.length) return null;

  const x = progress * pathWidth;
  const y = getYForX(parsedPath, x) ?? 0;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <Circle cx={x} cy={y} r={3.25} fill={TRACE_COLOR} />
    </Svg>
  );
}

/**
 * Scrubbable distance × elevation profile.
 * Wagmi LineChart timestamp channel carries distance_m.
 * Mount reveal clips left→right so the path maps out along distance.
 * A solid dash keeps traveling the stroke (no glow).
 */
export function ElevationSparkline({
  samples,
  height = 168,
}: ElevationSparklineProps) {
  const lastIndex = useRef<number | null>(null);
  const lockedWidth = useRef(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [clipWidth, setClipWidth] = useState(0);
  const [reveal, setReveal] = useState(0);

  const data = useMemo(
    () =>
      samples.map((s) => ({
        timestamp: s.distance_m,
        value: s.elevation_m,
      })),
    [samples],
  );

  useEffect(() => {
    lastIndex.current = null;
    lockedWidth.current = 0;
    setChartWidth(0);
    setClipWidth(0);
    setReveal(0);
  }, [samples]);

  useEffect(() => {
    if (chartWidth <= 0 || data.length < 2) return;

    setClipWidth(0);
    setReveal(0);
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startAt = Date.now() + PATH_REVEAL_DELAY_MS;

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startAt;
      if (elapsed < 0) return;
      const t = Math.min(1, elapsed / PATH_REVEAL_MS);
      setClipWidth(chartWidth * t);
      setReveal(t);
      if (t >= 1 && intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const delayId = setTimeout(() => {
      if (cancelled) return;
      tick();
      intervalId = setInterval(tick, TICK_MS);
    }, PATH_REVEAL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(delayId);
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [samples, chartWidth, data.length]);

  if (data.length < 2) {
    return (
      <View className="items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-10">
        <Text className="font-mono text-xs text-zinc-500">No elevation data</Text>
      </View>
    );
  }

  const endKm = (samples[samples.length - 1].distance_m / 1000).toFixed(1);
  const mono = 'SpaceMono';

  return (
    <View
      accessibilityLabel="Elevation profile"
      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
    >
      <LineChart.Provider
        data={data}
        onCurrentIndexChange={(index) => {
          if (lastIndex.current !== index) {
            lastIndex.current = index;
            void Haptics.selectionAsync();
          }
        }}
      >
        <View className="flex-row items-end justify-between border-b border-zinc-800 px-3 py-2">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Elevation profile
          </Text>
          <View className="items-end">
            <LineChart.PriceText
              format={({ value }) => formatElev(String(value))}
              style={{ color: '#A1A1AA', fontFamily: mono, fontSize: 12 }}
            />
            <LineChart.DatetimeText
              format={({ value }) => formatDistFromTimestamp(value)}
              style={{ color: '#71717A', fontFamily: mono, fontSize: 10 }}
            />
          </View>
        </View>

        <View className="px-2">
          <View
            onLayout={(e) => {
              const next = Math.round(e.nativeEvent.layout.width);
              // Lock width once so layout jitter doesn't restart / stall the wipe.
              if (next > 0 && lockedWidth.current === 0) {
                lockedWidth.current = next;
                setChartWidth(next);
              }
            }}
          >
            {chartWidth > 0 ? (
              <View style={{ width: clipWidth, overflow: 'hidden' }}>
                <View style={{ width: chartWidth }}>
                  <LineChart width={chartWidth} height={height}>
                    <LineChart.Path
                      color={LINE_COLOR}
                      width={1.75}
                      showInactivePath={false}
                      pathProps={{
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                      }}
                    />
                    <FlowingTrace />
                    <RevealHead progress={reveal} active={reveal < 1} />
                    <LineChart.CursorCrosshair
                      color="#E4E4E7"
                      outerSize={14}
                      size={6}
                    >
                      <LineChart.Tooltip
                        cursorGutter={12}
                        textStyle={{
                          color: '#FAFAFA',
                          fontFamily: mono,
                          fontSize: 11,
                          backgroundColor: '#18181B',
                          borderColor: '#27272A',
                          borderWidth: 1,
                          overflow: 'hidden',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      />
                    </LineChart.CursorCrosshair>
                    {Platform.OS === 'web' ? <LineChart.HoverTrap /> : null}
                  </LineChart>
                </View>
              </View>
            ) : (
              <View style={{ height }} />
            )}
          </View>
        </View>

        <View className="flex-row justify-between px-3 pb-2">
          <Text className="font-mono text-[10px] text-zinc-600">0 km</Text>
          <Text className="font-mono text-[10px] text-zinc-600">{endKm} km</Text>
        </View>
      </LineChart.Provider>
    </View>
  );
}
