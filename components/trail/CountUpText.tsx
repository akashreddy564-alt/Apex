import { useEffect, useState } from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Softer than screen entrance; clamp so metrics never overshoot. */
const COUNT_SPRING = {
  damping: 24,
  stiffness: 120,
  mass: 1,
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
 * Count-up for telemetry digits. Springs on the UI thread, mirrors into
 * React state so web + native both paint reliably.
 */
export function CountUpText({
  value,
  format,
  delayMs = 0,
  style,
}: CountUpTextProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(() => formatCountUp(format, 0));
  const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

  const valueTextStyle: StyleProp<TextStyle> = [
    {
      fontFamily: mono,
      padding: 0,
      margin: 0,
      color: '#F4F4F5',
      fontSize: 14,
      lineHeight: 20,
      fontVariant: ['tabular-nums'],
    },
    style,
  ];

  useEffect(() => {
    if (value == null) return;
    progress.value = 0;
    setDisplay(formatCountUp(format, 0));
    progress.value = withDelay(delayMs, withSpring(value, COUNT_SPRING));
  }, [value, delayMs, format, progress]);

  useAnimatedReaction(
    () => formatCountUp(format, progress.value),
    (next, prev) => {
      if (next !== prev) {
        scheduleOnRN(setDisplay, next);
      }
    },
    [format],
  );

  if (value == null) {
    return <Text style={valueTextStyle}>—</Text>;
  }

  return <Animated.Text style={valueTextStyle}>{display}</Animated.Text>;
}
