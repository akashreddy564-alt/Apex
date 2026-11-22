import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { ClipPath, Circle, Defs, Line, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { DrawIn, Eyebrow, haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { formatDistance, formatElevation } from '@/lib/format';
import { canScrub, routeFraction, scrubAt, ticksCrossed } from '@/lib/scrub';
import { cardStyle, numericStyle } from '@/theme/tokens';
import type { ElevationSample, TrailShape } from '@/types/trail';

const CHART_H = 120;
const PAD_Y = 12;
const STEP = 0.1;
const ARRIVE_DELAY = 1400;
const ARRIVE_MS = 2200;

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const clamp01 = (n: number) => {
  'worklet';
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
};

/** UI-thread copy of routeFraction (lib/scrub) so the map can follow without React. */
function foldRoute(shape: TrailShape | null | undefined, f: number) {
  'worklet';
  const v = clamp01(f);
  if (shape === 'out-and-back') return v <= 0.5 ? v * 2 : (1 - v) * 2;
  return v;
}

/** y on the profile at x fraction f, over plain arrays. */
function yAt(fx: number[], ys: number[], f: number) {
  'worklet';
  for (let i = 1; i < fx.length; i++) {
    if (f <= fx[i] || i === fx.length - 1) {
      const span = fx[i] - fx[i - 1];
      const t = span > 0 ? Math.min(1, Math.max(0, (f - fx[i - 1]) / span)) : 1;
      return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
    }
  }
  return ys[0];
}

/**
 * Drag along the real elevation profile. Position, elevation and the climb so
 * far read out above it. The dot, rule and fill follow on the UI thread; React
 * only re-renders the readout (coalesced). `progress` receives the ROUTE
 * fraction on the UI thread so a map can follow with no re-render.
 */
export function ElevationScrubber({
  profile,
  onScrub,
  shape,
  progress,
}: {
  profile: ElevationSample[];
  onScrub?: (routeFraction: number) => void;
  shape?: TrailShape | null;
  progress?: SharedValue<number>;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const clipId = `climbed-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);
  // `shown` drives the visible readout; `spoken` drives accessibilityValue and is
  // held still while the arrival glide plays.
  const [shown, setShown] = useState(0);
  const [spoken, setSpoken] = useState(0);
  const frac = useSharedValue(0);
  const widthSV = useSharedValue(0);
  const auto = useSharedValue(false);
  const pending = useSharedValue(false);
  const lastM = useRef(0);
  const lastFraction = useRef(0);
  const mounted = useRef(true);
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;
  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const scrubbable = canScrub(profile);
  const first = scrubbable ? profile[0].distance_m : 0;
  const total = scrubbable ? profile[profile.length - 1].distance_m - first : 0;
  const hasWidth = width > 0;

  const geo = useMemo(() => {
    if (!scrubbable || !hasWidth || total <= 0) return null;
    const els = profile.map((p) => p.elevation_m);
    const lo = Math.min(...els);
    const range = Math.max(...els) - lo || 1;
    const fx = profile.map((p) => (p.distance_m - first) / total);
    const ys = profile.map((p) => PAD_Y + (1 - (p.elevation_m - lo) / range) * (CHART_H - PAD_Y * 2));
    const xs = fx.map((f) => f * width);
    const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L${width} ${CHART_H} L0 ${CHART_H} Z`;
    let len = 0;
    for (let i = 1; i < xs.length; i++) len += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    return { fx, ys, line, area, length: len * 1.2 + 10 };
  }, [profile, scrubbable, hasWidth, width, first, total]);

  useEffect(() => {
    widthSV.value = width;
  }, [width, widthSV]);

  // JS side: readout, haptics, callback. `quiet` (the arrival glide) skips ticks and speech.
  const apply = useCallback(
    (f: number, quiet = false) => {
      if (!mounted.current) return;
      const next = clamp01(f);
      lastFraction.current = next;
      setShown(next);
      const point = scrubAt(profile, next);
      if (point) {
        if (!quiet && ticksCrossed(lastM.current, point.distanceM) > 0) haptics.tapLight();
        lastM.current = point.distanceM;
      }
      if (!quiet) setSpoken(next);
      onScrubRef.current?.(routeFraction(shapeRef.current, next));
    },
    [profile],
  );

  // Coalesced: one queued JS call at a time, reading the latest value when it runs.
  const sync = useCallback(() => {
    pending.value = false;
    apply(frac.value, auto.value);
  }, [apply, frac, auto, pending]);

  useAnimatedReaction(
    () => frac.value,
    (now, prev) => {
      if (progress) progress.value = foldRoute(shape, now);
      if (now !== prev && !pending.value) {
        pending.value = true;
        scheduleOnRN(sync);
      }
    },
    [progress, shape, sync],
  );

  const setBoth = useCallback(
    (f: number) => {
      const next = clamp01(f);
      cancelAnimation(frac);
      auto.value = false;
      frac.value = next;
      if (progress) progress.value = routeFraction(shapeRef.current, next);
      apply(next);
    },
    [apply, auto, frac, progress],
  );

  const summit = useMemo(() => {
    if (!scrubbable || total <= 0) return 0;
    let best = profile[0];
    for (const p of profile) if (p.elevation_m > best.elevation_m) best = p;
    return clamp01((best.distance_m - first) / total);
  }, [profile, scrubbable, first, total]);

  const glideDone = useCallback(() => {
    sync();
  }, [sync]);

  // Arrival: once, after layout. No cleanup here so a re-layout cannot cancel it.
  const arrived = useRef(false);
  useEffect(() => {
    if (reduceMotion || arrived.current || !geo || summit <= 0) return;
    arrived.current = true;
    auto.value = true;
    frac.value = withDelay(
      ARRIVE_DELAY,
      withTiming(summit, { duration: ARRIVE_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          auto.value = false;
          scheduleOnRN(glideDone);
        }
      }),
    );
  }, [reduceMotion, geo, summit, frac, auto, glideDone]);

  // Unmount only. Resets `arrived` so a StrictMode replay restarts the glide.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      arrived.current = false;
      cancelAnimation(frac);
    };
  }, [frac]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-14, 14])
        .onStart((e) => {
          if (widthSV.value <= 0) return;
          cancelAnimation(frac);
          auto.value = false;
          frac.value = clamp01(e.x / widthSV.value);
        })
        .onUpdate((e) => {
          if (widthSV.value <= 0) return;
          frac.value = clamp01(e.x / widthSV.value);
        }),
    [frac, auto, widthSV],
  );

  const fx = geo?.fx ?? [0, 1];
  const gys = geo?.ys ?? [0, 0];
  const clipProps = useAnimatedProps(() => ({ width: clamp01(frac.value) * widthSV.value }));
  const ruleProps = useAnimatedProps(() => {
    const x = clamp01(frac.value) * widthSV.value;
    return { x1: x, x2: x };
  });
  const dotProps = useAnimatedProps(() => {
    const f = clamp01(frac.value);
    return { cx: f * widthSV.value, cy: yAt(fx, gys, f) };
  });

  if (!scrubbable) return null;
  const point = scrubAt(profile, shown);
  const spokenPoint = scrubAt(profile, spoken);
  if (!point || !spokenPoint) return null;
  const valueText = `${formatDistance(spokenPoint.distanceM / 1000)}, ${formatElevation(spokenPoint.elevationM)} elevation, ${formatElevation(spokenPoint.climbedM)} climbed`;
  const num = { ...numericStyle('semibold'), fontSize: 20, color: c.fg } as const;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Elevation profile"
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'increment') setBoth(lastFraction.current + STEP);
        else if (name === 'decrement') setBoth(lastFraction.current - STEP);
      }}
      style={{ ...cardStyle(c), gap: 14 }}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>At</Eyebrow>
          <Text style={[num, { color: c.distance }]}>{formatDistance(point.distanceM / 1000)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Elevation</Eyebrow>
          <Text style={[num, { color: c.climb }]}>{formatElevation(point.elevationM)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Climbed</Eyebrow>
          <Text style={[num, { color: c.climb }]}>{formatElevation(point.climbedM)}</Text>
        </View>
      </View>

      {/* touchAction and userSelect are web-only GestureDetector props: no page scroll or text selection mid-drag. */}
      <GestureDetector gesture={pan} touchAction="none" userSelect="none">
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: CHART_H }}
        >
          {geo ? (
            <Svg width={width} height={CHART_H}>
              <Defs>
                <ClipPath id={clipId}>
                  <AnimatedRect x={0} y={0} height={CHART_H} width={0} animatedProps={clipProps} />
                </ClipPath>
              </Defs>
              <Path d={geo.area} fill={c.fg} fillOpacity={0.08} />
              <Path d={geo.area} fill={c.climb} fillOpacity={0.4} clipPath={`url(#${clipId})`} />
              <DrawIn d={geo.line} stroke={c.fg} strokeWidth={2} length={geo.length} />
              <AnimatedLine x1={0} x2={0} y1={0} y2={CHART_H} stroke={c.fgFaint} strokeWidth={1} animatedProps={ruleProps} />
              <AnimatedCircle cx={0} cy={gys[0]} r={6} fill={c.fg} stroke={c.surface} strokeWidth={2} animatedProps={dotProps} />
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}
