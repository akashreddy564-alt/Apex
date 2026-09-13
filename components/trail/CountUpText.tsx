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

/** Deliberate count — slow enough to read every digit. */
const COUNT_MS = 8000;
const TICK_MS = 40;

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

/**
 * Count-up for telemetry digits. Interval-driven for steady wall-clock
 * pacing on web (rAF can be coalesced under automation / background tabs).
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
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startAt = Date.now() + delayMs;

    let lastLoggedSecond = -1;
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startAt;
      if (elapsed < 0) return;
      const t = Math.min(1, elapsed / COUNT_MS);
      const sec = Math.floor(elapsed / 1000);
      if (sec !== lastLoggedSecond && format === 'elevation' && delayMs === 0) {
        lastLoggedSecond = sec;
        console.log(`[CountUp] Peak Elev t=${t.toFixed(2)} elapsed=${elapsed}ms → ${formatCountUp(format, value * t)}`);
      }
      setDisplay(formatCountUp(format, value * t));
      if (t >= 1 && intervalId != null) {
        console.log(`[CountUp] Peak Elev DONE at ${elapsed}ms`);
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const delayId = setTimeout(() => {
      if (cancelled) return;
      tick();
      intervalId = setInterval(tick, TICK_MS);
    }, Math.max(0, delayMs));

    return () => {
      cancelled = true;
      clearTimeout(delayId);
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [value, delayMs, format]);

  if (value == null) {
    return <Text style={valueTextStyle}>—</Text>;
  }

  return <Text style={valueTextStyle}>{display}</Text>;
}
