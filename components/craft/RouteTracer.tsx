import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { projectPoints } from '@/lib/projectPath';
import type { GeoJSONLineString } from '@/types/trail';

const SIZE = 120;
const PAD = 12;

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
    // The shared projection: longitude scaled by cos(latitude), centered in the box.
    // A flat or single-spot route keeps a tiny minimum span, so it never divides by zero.
    const points = projectPoints(coords, SIZE, SIZE, PAD);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
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
    // aria-hidden on a View: RN maps it per platform, and on web an Svg would pass RN a11y props to the DOM.
    <View
      aria-hidden
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {/* Inside the 1 px border, so the viewBox drops the outer pixel. */}
      <Svg width={SIZE - 2} height={SIZE - 2} viewBox={`1 1 ${SIZE - 2} ${SIZE - 2}`}>
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
    </View>
  );
}
