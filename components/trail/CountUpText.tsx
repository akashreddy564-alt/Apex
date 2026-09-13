import { useEffect, useRef } from 'react';
import { Platform, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Softer than screen entrance; clamp so metrics never overshoot. */
const COUNT_SPRING = {
  damping: 22,
  stiffness: 200,
  mass: 0.9,
  overshootClamping: true,
} as const;

export type CountUpFormat = 'elevation' | 'distance' | 'duration';

interface CountUpTextProps {
  /** Target metric. `null` shows an em dash (no animation). */
  value: number | null;
  format: CountUpFormat;
  /** Stagger delay before the spring starts. */
  delayMs?: number;
  style?: StyleProp<TextStyle>;
}

/** Mirrors `lib/format.ts` with worklet-safe formatting (no locale APIs). */
function formatCountUp(kind: CountUpFormat, raw: number): string {
  'worklet';
  if (kind === 'elevation') {
    const n = Math.round(raw);
    const neg = n < 0;
    const digits = String(Math.abs(n));
    let grouped = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      if (i > 0 && (len - i) % 3 === 0) grouped += ',';
      grouped += digits[i];
    }
    return `${neg ? '-' : ''}${grouped} m`;
  }
  if (kind === 'distance') {
    const decimals = raw >= 10 ? 1 : 2;
    return `${raw.toFixed(decimals)} km`;
  }
  const totalSeconds = Math.max(0, Math.round(raw));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mm}`;
  }
  return `${m}m`;
}

/**
 * UI-thread count-up for telemetry digits. Units stay glued to the number.
 */
export function CountUpText({
  value,
  format,
  delayMs = 0,
  style,
}: CountUpTextProps) {
  const progress = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);
  const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

  const valueTextStyle: StyleProp<TextStyle> = [
    {
      fontFamily: mono,
      padding: 0,
      margin: 0,
      color: '#F4F4F5',
      fontSize: 14,
      lineHeight: 20,
    },
    style,
  ];

  useEffect(() => {
    if (value == null) return;
    progress.value = 0;
    progress.value = withDelay(delayMs, withSpring(value, COUNT_SPRING));
  }, [value, delayMs, progress]);

  const text = useDerivedValue(
    () => formatCountUp(format, progress.value),
    [format],
  );

  useAnimatedReaction(
    () => text.value,
    (data, prev) => {
      if (Platform.OS === 'web' && data !== prev && inputRef.current) {
        // @ts-expect-error web TextInput value
        inputRef.current.value = data;
      }
    },
  );

  const animatedProps = useAnimatedProps(() => {
    const next = text.value;
    return { text: next, defaultValue: next };
  });

  if (value == null) {
    return <Text style={valueTextStyle}>—</Text>;
  }

  return (
    <AnimatedTextInput
      ref={Platform.select({ web: inputRef })}
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps as object}
      style={valueTextStyle}
    />
  );
}
