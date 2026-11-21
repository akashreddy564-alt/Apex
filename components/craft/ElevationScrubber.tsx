import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Circle, Defs, Line, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { DrawIn, Eyebrow, haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { formatDistance, formatElevation } from '@/lib/format';
import { canScrub, routeFraction, scrubAt, ticksCrossed } from '@/lib/scrub';
import { fonts, numericStyle } from '@/theme/tokens';
import type { ElevationSample, TrailShape } from '@/types/trail';

const CHART_H = 120;
const PAD_Y = 12;
const STEP = 0.1;
const ARRIVE_DELAY = 1400;
const ARRIVE_MS = 2200;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Drag along the real elevation profile. Position, elevation and the climb so
 * far read out above it, and `onScrub` reports where that is along the route so
 * a map can follow. After a moment it glides to the summit once.
 */
export function ElevationScrubber({
  profile,
  onScrub,
  shape,
}: {
  profile: ElevationSample[];
  onScrub?: (routeFraction: number) => void;
  shape?: TrailShape | null;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const clipId = `climbed-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);
  const [fraction, setFraction] = useState(0);
  const frac = useSharedValue(0);
  const lastM = useRef(0);
  const lastFraction = useRef(0);

  const scrubbable = canScrub(profile);
  const first = scrubbable ? profile[0].distance_m : 0;
  const total = scrubbable ? profile[profile.length - 1].distance_m - first : 0;

  const geo = useMemo(() => {
    if (!scrubbable || width <= 0 || total <= 0) return null;
    const els = profile.map((p) => p.elevation_m);
    const lo = Math.min(...els);
    const hi = Math.max(...els);
    const range = hi - lo || 1;
    const xs = profile.map((p) => ((p.distance_m - first) / total) * width);
    const ys = profile.map((p) => PAD_Y + (1 - (p.elevation_m - lo) / range) * (CHART_H - PAD_Y * 2));
    const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L${width} ${CHART_H} L0 ${CHART_H} Z`;
    let len = 0;
    for (let i = 1; i < xs.length; i++) len += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    return { xs, ys, lo, range, line, area, length: len * 1.2 + 10 };
  }, [profile, scrubbable, width, first, total]);

  // Runs on the JS thread for every change of position: readout, ticks, callback.
  const apply = useCallback(
    (f: number) => {
      const next = clamp01(f);
      if (next === lastFraction.current) return;
      lastFraction.current = next;
      setFraction(next);
      const point = scrubAt(profile, next);
      if (point) {
        if (ticksCrossed(lastM.current, point.distanceM) > 0) haptics.tapLight();
        lastM.current = point.distanceM;
      }
      onScrub?.(routeFraction(shape, next));
    },
    [profile, onScrub, shape],
  );

  useAnimatedReaction(
    () => frac.value,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(apply, now);
    },
    [apply],
  );

  const setBoth = useCallback(
    (f: number) => {
      const next = clamp01(f);
      cancelAnimation(frac);
      frac.value = next;
      apply(next);
    },
    [apply, frac],
  );

  // Arrival: once, glide from the start to the summit.
  const arrived = useRef(false);
  const summit = useMemo(() => {
    if (!scrubbable || total <= 0) return 0;
    let best = profile[0];
    for (const p of profile) if (p.elevation_m > best.elevation_m) best = p;
    return clamp01((best.distance_m - first) / total);
  }, [profile, scrubbable, first, total]);
  useEffect(() => {
    if (reduceMotion || arrived.current || !geo || summit <= 0) return;
    arrived.current = true;
    frac.value = withDelay(ARRIVE_DELAY, withTiming(summit, { duration: ARRIVE_MS, easing: Easing.inOut(Easing.cubic) }));
    return () => cancelAnimation(frac);
  }, [reduceMotion, geo, summit, frac]);

  const widthSV = useSharedValue(0);
  useEffect(() => {
    widthSV.value = width;
  }, [width, widthSV]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      if (widthSV.value <= 0) return;
      cancelAnimation(frac);
      frac.value = clamp01(e.x / widthSV.value);
    })
    .onUpdate((e) => {
      if (widthSV.value <= 0) return;
      frac.value = clamp01(e.x / widthSV.value);
    });

  if (!scrubbable) return null;

  const point = scrubAt(profile, fraction);
  if (!point) return null;
  const valueText = `${formatDistance(point.distanceM / 1000)}, ${formatElevation(point.elevationM)} elevation, ${formatElevation(point.climbedM)} climbed`;

  const dotY = geo ? PAD_Y + (1 - (point.elevationM - geo.lo) / geo.range) * (CHART_H - PAD_Y * 2) : 0;
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
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.raised,
        borderRadius: 22,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>At</Eyebrow>
          <Text style={num}>{formatDistance(point.distanceM / 1000)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Elevation</Eyebrow>
          <Text style={num}>{formatElevation(point.elevationM)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Climbed</Eyebrow>
          <Text style={num}>{formatElevation(point.climbedM)}</Text>
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: CHART_H, touchAction: 'none', userSelect: 'none' }}
        >
          {geo ? (
            <Svg width={width} height={CHART_H}>
              <Defs>
                <ClipPath id={clipId}>
                  <Rect x={0} y={0} height={CHART_H} width={fraction * width} />
                </ClipPath>
              </Defs>
              <Path d={geo.area} fill={c.fg} fillOpacity={0.08} />
              <Path d={geo.area} fill={c.accent} fillOpacity={0.35} clipPath={`url(#${clipId})`} />
              <DrawIn d={geo.line} stroke={c.fg} strokeWidth={2} length={geo.length} />
              <Line x1={fraction * width} x2={fraction * width} y1={0} y2={CHART_H} stroke={c.fgFaint} strokeWidth={1} />
              <Circle cx={fraction * width} cy={dotY} r={6} fill={c.fg} stroke={c.surface} strokeWidth={2} />
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}
