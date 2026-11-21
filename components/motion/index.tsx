/**
 * Apex's motion kit. Small, consistent pieces in the spirit of Motion
 * (whileTap, enter transitions), NumberFlow (rolling numbers) and Bklit's
 * charts (bars that grow in), built on Reanimated so they run on the UI
 * thread at 60 fps. Every piece honours Reduce Motion.
 *
 * Motion is for feedback, arrival and a few quiet loops. Only loaders, skeleton shimmer and the start slider's sheen loop, and all of them stop under Reduce Motion.
 */
import { cssInterop } from 'nativewind';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const PRESS = { damping: 18, stiffness: 420, mass: 0.6 };

type PressScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** How far it sinks while held. Cards 0.985, buttons 0.96. */
  to?: number;
  children: ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Let NativeWind classes (className) style it like a plain Pressable.
cssInterop(AnimatedPressable, { className: 'style' });

/** A Pressable that sinks a little under the finger and springs back. */
export function PressScale({ to = 0.97, style, onPressIn, onPressOut, children, ...rest }: PressScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withSpring(to, PRESS);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, PRESS);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Rise-in for list items on first appearance. Only the first few stagger,
 * so a long list never waits on its animation.
 */
export function riseIn(index: number) {
  return FadeInDown.delay(Math.min(index, 6) * 45)
    .duration(380)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ transform: [{ translateY: 14 }] });
}

/**
 * A number that rolls from its last value to the new one, like NumberFlow.
 * The first value counts up from zero; later changes roll from the previous.
 */
export function CountUp({
  value,
  format,
  style,
  duration = 900,
  accessibilityRole,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  accessibilityRole?: 'header' | 'text';
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const from = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = from.current;
    const began = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - began) / duration);
      // Ease out quart: fast, then settles.
      const eased = 1 - (1 - t) ** 4;
      const next = start + (value - start) * eased;
      setShown(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduceMotion, value]);

  return (
    // The final value is announced, not every frame.
    <Text accessibilityRole={accessibilityRole} accessibilityLabel={format(value)} style={style}>
      {format(shown)}
    </Text>
  );
}

/** A bar that grows to its width, staggered by row, like Bklit's bar chart. */
export function GrowBar({
  fraction,
  color,
  index = 0,
  height = 6,
  track,
}: {
  fraction: number;
  color: string;
  index?: number;
  height?: number;
  track: string;
}) {
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(reduceMotion ? fraction : 0);
  useEffect(() => {
    width.value = reduceMotion
      ? fraction
      : withDelay(Math.min(index, 8) * 55, withTiming(fraction, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [fraction, index, reduceMotion, width]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, width.value)) * 100}%` }));
  return (
    <Animated.View style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: track }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, bar]} />
    </Animated.View>
  );
}

export { haptics } from './haptics';
export { Odometer } from './Odometer';
export { DrawIn } from './DrawIn';
export { ContourTexture } from './ContourTexture';
export { ContourLoader } from './ContourLoader';
export { Skeleton } from './Skeleton';
export { ReasonLine } from './ReasonLine';
export { Eyebrow } from './Eyebrow';
export { SlideToStart } from './SlideToStart';
