import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getYForX } from 'react-native-redash';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, Path, Svg } from 'react-native-svg';
import {
  LineChart,
  LineChartDimensionsContext,
  useLineChart,
} from 'react-native-wagmi-charts';

import { formatElevationM } from '@/lib/format';
import type { ElevationSample } from '@/types/trail';

/** Accent sage — crisp stroke only, no bloom. */
const LINE_COLOR = '#8B9A6D';
/** zinc-400. The dash is a flat stroke, not a glow. */
const DASH_COLOR = '#A1A1AA';
/** Near-white tip. No shadow, no blur. */
const BEAD_COLOR = '#F4F4F5';

/** Slow left→right map-out along distance. */
const PATH_REVEAL_MS = 10000;
/** Brief beat before the wipe so the chart doesn't flash. */
const PATH_REVEAL_DELAY_MS = 400;
/** One pass of the traveling dash along the stroke. */
const TRACE_PERIOD_MS = 3200;
const TRACE_DASH = 22;
const TRACE_GAP = 148;
const TRACE_CYCLE = TRACE_DASH + TRACE_GAP;
/** Keep the leading bead fully inside the reveal clip. */
const BEAD_R = 3.25;
const BEAD_INSET = 1;

interface ElevationSparklineProps {
  samples: ElevationSample[];
  height?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function formatDistFromTimestamp(timestamp: string | number): string {
  const meters = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (Number.isNaN(meters)) return '—';
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Short zinc segment that crawls the sage stroke while the profile is
 * mapping out. It is tied to the reveal clock, so it stops when the wipe
 * finishes. Solid dash, no blur. Hidden while the scrub cursor is active.
 */
function FlowingTrace({ reveal }: { reveal: SharedValue<number> }) {
  const { path, width, height } = useContext(LineChartDimensionsContext);
  const { isActive } = useLineChart();

  const animatedProps = useAnimatedProps(() => {
    const moving = reveal.value > 0 && reveal.value < 1 && !isActive.value;
    const cycles = PATH_REVEAL_MS / TRACE_PERIOD_MS;
    return {
      strokeDashoffset: -reveal.value * cycles * TRACE_CYCLE,
      strokeOpacity: moving ? 1 : 0,
    };
  });

  if (!path || width <= 0 || height <= 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <AnimatedPath
        d={path}
        stroke={DASH_COLOR}
        strokeWidth={1.75}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${TRACE_DASH} ${TRACE_GAP}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

/**
 * Leading bead. Its center sits one radius inside the clip so the circle is
 * not cut in half. It travels with the reveal and stays at the end of the
 * line. Hidden while scrubbing, so the crosshair stays the only cursor.
 */
function RevealHead({ reveal }: { reveal: SharedValue<number> }) {
  const { parsedPath, pathWidth, width, height } = useContext(
    LineChartDimensionsContext,
  );
  const { isActive } = useLineChart();

  const animatedProps = useAnimatedProps(() => {
    const edge = reveal.value * pathWidth;
    const cx = edge - BEAD_R - BEAD_INSET;
    const y = getYForX(parsedPath, Math.max(0, cx)) ?? 0;
    const visible =
      !isActive.value &&
      reveal.value > 0 &&
      edge >= BEAD_R * 2 + BEAD_INSET;
    return {
      cx: Math.max(0, cx),
      cy: y,
      opacity: visible ? 1 : 0,
    };
  });

  if (width <= 0 || height <= 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <AnimatedCircle
        animatedProps={animatedProps}
        r={BEAD_R}
        fill={BEAD_COLOR}
      />
    </Svg>
  );
}

/**
 * Scrubbable distance × elevation profile.
 * Wagmi LineChart timestamp channel carries distance_m.
 * The reveal clip wraps only the stroke, dash, and bead — the crosshair sits
 * outside it so it can be read before the wipe finishes.
 */
export function ElevationSparkline({
  samples,
  height = 168,
}: ElevationSparklineProps) {
  const lastIndex = useRef<number | null>(null);
  const seenSamples = useRef(samples);
  const [chartWidth, setChartWidth] = useState(0);
  const widthSv = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const reveal = useSharedValue(reducedMotion ? 1 : 0);

  const data = useMemo(
    () =>
      samples.map((s) => ({
        timestamp: s.distance_m,
        value: s.elevation_m,
      })),
    [samples],
  );

  if (seenSamples.current !== samples) {
    seenSamples.current = samples;
    cancelAnimation(reveal);
    reveal.value = reducedMotion ? 1 : 0;
  }

  useEffect(() => {
    if (chartWidth <= 0 || data.length < 2) return;

    if (reducedMotion) {
      cancelAnimation(reveal);
      reveal.value = 1;
      return;
    }
    if (!focused) {
      cancelAnimation(reveal);
      return;
    }

    const remaining = 1 - reveal.value;
    if (remaining <= 0.001) return;

    const duration = Math.max(1, PATH_REVEAL_MS * remaining);
    const timing = withTiming(1, { duration, easing: Easing.linear });
    const fresh = reveal.value <= 0.001;
    reveal.value = fresh
      ? withDelay(PATH_REVEAL_DELAY_MS, timing)
      : timing;

    return () => cancelAnimation(reveal);
  }, [chartWidth, data.length, focused, reducedMotion, reveal, samples]);

  const clipStyle = useAnimatedStyle(() => ({
    width: Math.max(0, widthSv.value * reveal.value),
  }));

  if (data.length < 2) {
    return (
      <View className="items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-10">
        <Text className="font-mono text-xs text-zinc-500">No elevation data</Text>
      </View>
    );
  }

  const endKm = (samples[samples.length - 1].distance_m / 1000).toFixed(1);
  const mono = 'SpaceMono';
  const showTrace = !reducedMotion;

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
              format={({ value }) => {
                const n = Number(value);
                return Number.isNaN(n) ? String(value) : formatElevationM(n);
              }}
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
              if (next > 0 && next !== chartWidth) {
                widthSv.value = next;
                setChartWidth(next);
              }
            }}
          >
            {chartWidth > 0 ? (
              <LineChart
                width={chartWidth}
                height={height}
                style={{ width: chartWidth, height }}
              >
                <Animated.View
                  testID="elevation-reveal-clip"
                  style={[
                    {
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                    },
                    clipStyle,
                  ]}
                >
                  <View style={{ width: chartWidth, height, pointerEvents: 'none' }}>
                    <LineChart.Path
                      color={LINE_COLOR}
                      width={1.75}
                      showInactivePath={false}
                      pathProps={{
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                      }}
                    />
                    {showTrace ? <FlowingTrace reveal={reveal} /> : null}
                    <RevealHead reveal={reveal} />
                  </View>
                </Animated.View>
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
