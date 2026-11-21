import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * An SVG line that draws itself once. `length` is the path's length in
 * the SVG's units (a generous overestimate is fine).
 */
export function DrawIn({
  d,
  stroke,
  strokeWidth = 2,
  duration = 900,
  delay = 0,
  length,
}: {
  d: string;
  stroke: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  length: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion
      ? 1
      : withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, progress, reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));

  const shared = {
    d,
    stroke,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: `${length} ${length}`,
  };
  if (reduceMotion) return <Path {...shared} strokeDashoffset={0} />;
  return <AnimatedPath {...shared} animatedProps={animatedProps} />;
}
