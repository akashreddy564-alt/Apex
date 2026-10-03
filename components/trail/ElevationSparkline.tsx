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
import { Circle, Line, Path, Svg } from 'react-native-svg';
import {
  LineChart,
  LineChartDimensionsContext,
  useLineChart,
} from 'react-native-wagmi-charts';

import {
  applyElevationUpdate,
  blendProfiles,
  clipWidth,
  SHAPE_EASE_MS,
  shapeEase,
} from '@/lib/elevationMotion';
import { formatChartDistance, formatChartElevation, formatDistanceKm } from '@/lib/format';
import { colors, numericStyle, typeScale } from '@/theme/tokens';
import type { ElevationSample } from '@/types/trail';

/** Accent sage — crisp stroke only, no bloom. */
const LINE_COLOR = colors.sage;
/** Flat sage under the stroke. Same geometry as the line, 12% opacity. */
const FILL_COLOR = rgba(colors.sage, 0.12);
/** Muted foreground. The dash is a flat stroke, not a glow. */
const DASH_COLOR = colors.fgMuted;
/** Near-white tip. No shadow, no blur. */
const BEAD_COLOR = colors.fg;

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  /** Reveal and the scrub haptic index reset when this changes, not when samples do. */
  trailId: string;
  samples: ElevationSample[];
  height?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * Sage fill under the stroke. Wagmi's gradient lives in an SVG that does not
 * receive the chart width, so on web it stops short of the line. This path is
 * the chart's own area, in an SVG of the same width and height as the stroke.
 */
function AreaFill() {
  const { area, width, height } = useContext(LineChartDimensionsContext);
  if (!area || width <= 0 || height <= 0) return null;
  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <Path d={area} fill={FILL_COLOR} />
    </Svg>
  );
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
 * Vertical scrub guide. Wagmi's CursorLine draws its stroke on x = 0 of an
 * SVG that clips anything left of that edge, so on web the line vanishes.
 * This stroke is centered on the scrub point inside an SVG the size of the
 * chart, thin zinc, with the crosshair dot on top.
 */
function ScrubGuide() {
  const { currentX, isActive } = useLineChart();
  const { width, height } = useContext(LineChartDimensionsContext);
  const animatedProps = useAnimatedProps(() => {
    // Center a 1px stroke on a pixel so it isn't split into two faint columns.
    const x = Math.round(currentX.value) + 0.5;
    return {
      x1: x,
      x2: x,
      opacity: isActive.value ? 1 : 0,
    };
  });

  if (width <= 0 || height <= 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <AnimatedLine
        animatedProps={animatedProps}
        y1={0}
        y2={height}
        stroke={colors.fgMuted}
        strokeWidth={1.25}
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
  trailId,
  samples,
  height = 168,
}: ElevationSparklineProps) {
  const lastIndex = useRef<number | null>(null);
  const seenSamples = useRef(samples);
  const seenTrail = useRef<string | null>(null);
  const plottedRef = useRef(samples);
  const [plotted, setPlotted] = useState(samples);
  const [chartWidth, setChartWidth] = useState(0);
  const widthSv = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const reveal = useSharedValue(reducedMotion ? 1 : 0);

  const data = useMemo(
    () =>
      plotted.map((s) => ({
        timestamp: s.distance_m,
        value: s.elevation_m,
      })),
    [plotted],
  );

  useEffect(() => {
    let frame: number | null = null;
    const cancelMorph = () => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
    };

    const trailChanged = seenTrail.current !== trailId;
    const samplesChanged = seenSamples.current !== samples;
    const decision = applyElevationUpdate(
      {
        trailId: seenTrail.current,
        reveal: reveal.value,
        hapticIndex: lastIndex.current,
      },
      {
        trailId,
        samplesChanged,
        reducedMotion: reducedMotion === true,
      },
    );

    if (trailChanged) {
      seenTrail.current = trailId;
      seenSamples.current = samples;
      lastIndex.current = decision.hapticIndex;
      plottedRef.current = samples;
      setPlotted(samples);
      cancelAnimation(reveal);
      reveal.value = decision.reveal;
    } else if (samplesChanged && samples.length >= 2) {
      seenSamples.current = samples;
      const from = plottedRef.current;
      const to = samples;
      if (!decision.easeShape || from.length < 2) {
        plottedRef.current = to;
        setPlotted(to);
      } else {
        const started = globalThis.performance?.now?.() ?? Date.now();
        const tick = (now: number) => {
          const raw = Math.min(1, (now - started) / SHAPE_EASE_MS);
          const next = raw >= 1 ? to : blendProfiles(from, to, shapeEase(raw));
          plottedRef.current = next;
          setPlotted(next);
          if (raw < 1) frame = requestAnimationFrame(tick);
          else frame = null;
        };
        frame = requestAnimationFrame(tick);
      }
    } else if (samplesChanged) {
      seenSamples.current = samples;
    }

    return cancelMorph;
  }, [reducedMotion, reveal, samples, trailId]);

  useEffect(() => {
    if (chartWidth <= 0) return;

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
    reveal.value = fresh ? withDelay(PATH_REVEAL_DELAY_MS, timing) : timing;

    return () => cancelAnimation(reveal);
  }, [chartWidth, focused, reducedMotion, reveal, trailId]);

  const clipStyle = useAnimatedStyle(() => ({
    width: clipWidth(widthSv.value, reveal.value),
  }));

  if (data.length < 2) {
    return (
      <View className="items-center justify-center rounded-xl border border-border bg-surface px-4 py-10">
        <Text className="font-ui text-caption text-fg-faint">No elevation data</Text>
      </View>
    );
  }

  let peakM = plotted[0]?.elevation_m ?? 0;
  for (const sample of plotted) {
    if (sample.elevation_m > peakM) peakM = sample.elevation_m;
  }
  const totalM = plotted[plotted.length - 1]?.distance_m ?? 0;
  const digits = numericStyle();
  const showTrace = !reducedMotion;
  const readoutStyle = {
    ...digits,
    fontSize: typeScale.caption,
    lineHeight: 16,
    height: 16,
    textAlign: 'right' as const,
    width: 96,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
  };

  return (
    <View
      accessibilityLabel="Elevation profile"
      className="overflow-hidden rounded-xl border border-border bg-surface"
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
        <View className="flex-row items-center justify-between border-b border-border px-3 py-2">
          <Text
            className="font-ui text-caption uppercase tracking-widest text-fg-muted"
            style={{ flexShrink: 0 }}
          >
            Elevation profile
          </Text>
          <View className="items-end" style={{ flexShrink: 0 }}>
            <LineChart.PriceText
              format={({ value }) => {
                'worklet';
                return formatChartElevation({ value, atRestMeters: peakM });
              }}
              style={{ ...readoutStyle, color: colors.fgMuted }}
            />
            <LineChart.DatetimeText
              format={({ value }) => {
                'worklet';
                return formatChartDistance({ value, atRestMeters: totalM });
              }}
              style={{ ...readoutStyle, color: colors.fgFaint }}
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
                    <AreaFill />
                    <LineChart.Path
                      color={LINE_COLOR}
                      width={1.75}
                      widthOffset={0}
                      showInactivePath={false}
                      pathProps={{
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        ...(Platform.OS === 'web' ? {} : { isTransitionEnabled: false }),
                      }}
                    />
                    {showTrace ? <FlowingTrace reveal={reveal} /> : null}
                    <RevealHead reveal={reveal} />
                  </View>
                </Animated.View>
                <ScrubGuide />
                <LineChart.CursorCrosshair
                  color={colors.highlight}
                  outerSize={14}
                  size={6}
                />
                {Platform.OS === 'web' ? <LineChart.HoverTrap /> : null}
              </LineChart>
            ) : (
              <View style={{ height }} />
            )}
          </View>
        </View>

        <View className="flex-row justify-between px-3 pb-2">
          <Text className="text-caption text-fg-faint" style={digits}>
            {formatDistanceKm(0)}
          </Text>
          <Text className="text-caption text-fg-faint" style={digits}>
            {formatDistanceKm(plotted[plotted.length - 1].distance_m / 1000)}
          </Text>
        </View>
      </LineChart.Provider>
    </View>
  );
}
