import { useEffect, useState } from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';

export type CountUpFormat = 'elevation' | 'distance' | 'duration';

interface CountUpTextProps {
  /** Target metric. `null` shows an em dash (no animation). */
  value: number | null;
  format: CountUpFormat;
  /** Stagger delay before the count starts. */
  delayMs?: number;
  style?: StyleProp<TextStyle>;
}

const COUNT_MS = 1100;

/** Mirrors `lib/format.ts` (no locale APIs — deterministic on web/SSR). */
function formatCountUp(kind: CountUpFormat, raw: number): string {
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

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Count-up for telemetry digits. rAF-driven so every intermediate frame
 * paints on web and native (Reanimated text props are unreliable on web).
 */
export function CountUpText({
  value,
  format,
  delayMs = 0,
  style,
}: CountUpTextProps) {
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

    setDisplay(formatCountUp(format, 0));
    let raf = 0;
    let cancelled = false;
    const startAt = performance.now() + delayMs;

    const tick = (now: number) => {
      if (cancelled) return;
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / COUNT_MS);
      setDisplay(formatCountUp(format, value * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [value, delayMs, format]);

  if (value == null) {
    return <Text style={valueTextStyle}>—</Text>;
  }

  return <Text style={valueTextStyle}>{display}</Text>;
}
