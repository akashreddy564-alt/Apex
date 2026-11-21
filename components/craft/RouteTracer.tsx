import { useMemo } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import type { GeoJSONLineString } from '@/types/trail';

const SIZE = 120;
const PAD = 12;
const BOX = SIZE - PAD * 2;
// Degrees of latitude are drawn taller than longitude at these latitudes.
const LAT_SCALE = 1.25;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Position along the projected line at a 0..1 fraction. Worklet: reads plain arrays only. */
function pointAt(xs: number[], ys: number[], cum: number[], fraction: number) {
  'worklet';
  const total = cum[cum.length - 1];
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  const target = f * total;
  for (let i = 1; i < cum.length; i++) {
    if (target <= cum[i] || i === cum.length - 1) {
      const span = cum[i] - cum[i - 1];
      const t = span > 0 ? Math.min(1, Math.max(0, (target - cum[i - 1]) / span)) : 1;
      return { x: xs[i - 1] + (xs[i] - xs[i - 1]) * t, y: ys[i - 1] + (ys[i] - ys[i - 1]) * t };
    }
  }
  return { x: xs[0], y: ys[0] };
}

/** A 120 x 120 outline of the route with a dot that follows `fraction` (0..1). */
export function RouteTracer({ path, fraction }: { path: GeoJSONLineString; fraction: SharedValue<number> | number }) {
  const c = useColors();
  const coords = path?.coordinates ?? [];

  const geo = useMemo(() => {
    if (coords.length < 2) return null;
    const lons = coords.map((p) => p[0]);
    const lats = coords.map((p) => p[1]);
    const minX = Math.min(...lons);
    const minY = Math.min(...lats);
    const w = Math.max(...lons) - minX;
    const h = (Math.max(...lats) - minY) * LAT_SCALE;
    const sc = Math.max(w, h) > 0 ? BOX / Math.max(w, h) : 1;
    const xs = coords.map((p) => PAD + (p[0] - minX) * sc + (BOX - w * sc) / 2);
    const ys = coords.map((p) => SIZE - PAD - (p[1] - minY) * sc * LAT_SCALE - (BOX - h * sc) / 2);
    const cum = [0];
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    return { xs, ys, cum, d, total: cum[cum.length - 1] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const xs = geo?.xs ?? [0, 0];
  const ys = geo?.ys ?? [0, 0];
  const cum = geo?.cum ?? [0, 0];
  const total = geo?.total ?? 0;
  const isNumber = typeof fraction === 'number';

  const dotProps = useAnimatedProps(() => {
    const f = isNumber ? (fraction as number) : (fraction as SharedValue<number>).value;
    const p = pointAt(xs, ys, cum, f);
    return { cx: p.x, cy: p.y };
  });
  const doneProps = useAnimatedProps(() => {
    const f = isNumber ? (fraction as number) : (fraction as SharedValue<number>).value;
    const safe = Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0;
    return { strokeDashoffset: total * (1 - safe) + 0.001, strokeOpacity: safe > 0 ? 1 : 0 };
  });

  if (!geo) return null;
  const start = pointAt(geo.xs, geo.ys, geo.cum, 0);
  const now = pointAt(geo.xs, geo.ys, geo.cum, typeof fraction === 'number' ? fraction : 0);
  const line = { fill: 'none', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}
    >
      <Path d={geo.d} stroke={c.border} {...line} />
      <AnimatedPath
        d={geo.d}
        stroke={c.fg}
        {...line}
        strokeDasharray={`${geo.total} ${geo.total}`}
        animatedProps={doneProps}
      />
      <Circle cx={start.x} cy={start.y} r={3} fill={c.fgFaint} />
      <AnimatedCircle cx={now.x} cy={now.y} r={5} fill={c.fg} stroke={c.bg} strokeWidth={2} animatedProps={dotProps} />
    </Svg>
  );
}
