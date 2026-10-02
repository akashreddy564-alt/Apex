import { useEffect, useRef, type Ref } from 'react';
import { Platform, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { useIsFocused } from 'expo-router';
import { cssInterop } from 'nativewind';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  formatCompactDuration,
  formatDistanceKm,
  formatElevationM,
} from '@/lib/format';

export type CountUpFormat = 'elevation' | 'distance' | 'duration';

interface CountUpTextProps {
  /** Target metric. `null` shows an em dash (no animation). */
  value: number | null;
  format: CountUpFormat;
  /** Stagger delay before the count starts. */
  delayMs?: number;
  style?: StyleProp<TextStyle>;
}

/** Deliberate count — slow enough to read every digit. */
const COUNT_MS = 8000;

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const VALUE_CLASS =
  'm-0 h-5 w-full border-0 bg-transparent p-0 font-mono text-sm leading-5 text-zinc-100 outline-none tabular-nums';

/** NativeWind maps `className` onto `style` so the animated input keeps its props. */
function CountUpFace({
  className: _className,
  style,
  inputRef,
  accessibilityLabel,
  defaultValue,
  animatedProps,
}: {
  className?: string;
  style?: StyleProp<TextStyle>;
  inputRef: Ref<TextInput>;
  accessibilityLabel: string;
  defaultValue: string;
  animatedProps: { text?: string };
}) {
  return (
    <AnimatedTextInput
      ref={inputRef}
      underlineColorAndroid="transparent"
      editable={false}
      accessibilityLabel={accessibilityLabel}
      defaultValue={defaultValue}
      style={style}
      // `text` is a whitelisted native prop, not part of TextInput's types.
      animatedProps={animatedProps as never}
    />
  );
}

cssInterop(CountUpFace, { className: 'style' });

function formatProgress(kind: CountUpFormat, raw: number): string {
  'worklet';
  if (kind === 'elevation') return formatElevationM(raw);
  if (kind === 'distance') return formatDistanceKm(raw);
  return formatCompactDuration(raw);
}

function finalLabel(kind: CountUpFormat, value: number | null): string {
  if (value == null) return '—';
  return formatProgress(kind, value);
}

/**
 * Linear 0→1 progress. Restarts when `resetKey` changes, snaps to 1 when
 * Reduce Motion is on, and freezes while the screen is unfocused.
 */
function useLinearProgress(
  durationMs: number,
  delayMs: number,
  resetKey: string,
  reducedMotion: boolean,
  focused: boolean,
): SharedValue<number> {
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const seenKey = useRef(resetKey);

  if (seenKey.current !== resetKey) {
    seenKey.current = resetKey;
    cancelAnimation(progress);
    progress.value = reducedMotion ? 1 : 0;
  }

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }
    if (!focused) {
      cancelAnimation(progress);
      return;
    }

    const remaining = 1 - progress.value;
    if (remaining <= 0.001) return;

    const duration = Math.max(1, durationMs * remaining);
    const timing = withTiming(1, { duration, easing: Easing.linear });
    const fresh = progress.value <= 0.001;
    progress.value = fresh ? withDelay(Math.max(0, delayMs), timing) : timing;

    return () => cancelAnimation(progress);
  }, [delayMs, durationMs, focused, progress, reducedMotion, resetKey]);

  return progress;
}

/**
 * Count-up for telemetry digits. Shared-value timing (no JS interval) so the
 * screen does not re-render every tick. Pauses while unfocused.
 */
export function CountUpText({
  value,
  format,
  delayMs = 0,
  style,
}: CountUpTextProps) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const inputRef = useRef<TextInput>(null);
  const label = finalLabel(format, value);
  const progress = useLinearProgress(
    COUNT_MS,
    delayMs,
    `${format}:${delayMs}:${value ?? 'null'}`,
    reducedMotion || value == null,
    focused,
  );

  const text = useDerivedValue(() => {
    if (value == null) return '—';
    return formatProgress(format, value * progress.value);
  });

  useAnimatedReaction(
    () => text.value,
    (next, prev) => {
      if (Platform.OS !== 'web' || next === prev || !inputRef.current) return;
      // Web ignores animated `text` props; write the DOM value directly.
      (inputRef.current as unknown as { value: string }).value = next;
    },
  );

  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
  }));

  if (value == null) {
    return (
      <Text
        accessibilityLabel={label}
        className="font-mono text-sm leading-5 text-zinc-100 tabular-nums"
        style={style}
      >
        —
      </Text>
    );
  }

  return (
    <CountUpFace
      inputRef={inputRef}
      accessibilityLabel={label}
      defaultValue={reducedMotion ? label : formatProgress(format, 0)}
      className={VALUE_CLASS}
      style={style}
      animatedProps={animatedProps}
    />
  );
}
