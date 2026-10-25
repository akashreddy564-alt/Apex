import { useIsFocused } from 'expo-router';
import { Gauge, Mountain, TrendingUp } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { MISSING_METRIC, toFeet, toMiles } from '@/lib/format';
import { climbRateFtPerMile, difficultyRating, paceLabel } from '@/lib/trailDifficulty';
import { fonts, type Palette } from '@/theme/tokens';
import type { TrailTelemetry } from '@/types/trail';

/** Quick count with a short stagger; the elevation chart starts after the third. */
export const COUNT_MS = 1000;
export const STAGGER_MS = 120;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Difficulty meter, easiest → very strenuous: a brightness ramp ending in the accent. */
function levelColors(c: Palette): string[] {
  return [c.fgFaint, c.fgMuted, c.fg2, c.fg, c.accent];
}

/** Eased 0→target count that restarts per trail and freezes while unfocused. */
function useCountUp(key: string, target: number | null, delayMs: number): number | null {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  const [value, setValue] = useState(() => (reduceMotion || target == null ? target : 0));
  const progress = useRef(0);
  const seenKey = useRef(key);

  useEffect(() => {
    if (seenKey.current !== key) {
      seenKey.current = key;
      progress.current = 0;
    }
    if (target == null || reduceMotion) {
      progress.current = 1;
      setValue(target);
      return;
    }
    if (!focused || progress.current >= 1) {
      setValue(target * easeOutCubic(progress.current));
      return;
    }
    let frame = 0;
    let start = 0;
    const from = progress.current;
    const wait = from === 0 ? delayMs : 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, from + Math.max(0, now - start - wait) / COUNT_MS);
      progress.current = t;
      setValue(target * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [delayMs, focused, key, reduceMotion, target]);

  return value;
}

function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clock(seconds: number): { value: string; unit: string } {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? { value: `${h}:${String(m).padStart(2, '0')}`, unit: 'h' } : { value: `${m}`, unit: 'min' };
}

function Headline({
  label,
  value,
  unit,
  accent,
  spoken,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  spoken: string;
}) {
  const styles = useStyles();
  const c = useColors();
  return (
    <View style={styles.headline} accessible accessibilityRole="text" accessibilityLabel={spoken}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.bigLine} numberOfLines={1}>
        <Text style={[styles.big, accent && { color: c.accent }]}>{value}</Text>
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function Detail({ icon, label, value, children }: { icon: ReactNode; label: string; value: string; children?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.detail} accessible accessibilityRole="text" accessibilityLabel={`${label}, ${value}`}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
        {children}
      </View>
    </View>
  );
}

export function TrailStats({ trailId, telemetry }: { trailId: string; telemetry: TrailTelemetry }) {
  const styles = useStyles();
  const c = useColors();
  const { distance_km, elevation_gain_m, peak_elevation_m, avg_moving_time_seconds } = telemetry;
  const miles = useCountUp(`${trailId}:mi`, distance_km == null ? null : toMiles(distance_km), 0);
  const gainFt = useCountUp(`${trailId}:ft`, elevation_gain_m == null ? null : toFeet(elevation_gain_m), STAGGER_MS);
  const seconds = useCountUp(`${trailId}:t`, avg_moving_time_seconds, STAGGER_MS * 2);

  const rating = difficultyRating(distance_km, elevation_gain_m);
  const climb = climbRateFtPerMile(distance_km, elevation_gain_m);
  const pace = paceLabel(distance_km, avg_moving_time_seconds);
  const time = seconds == null ? null : clock(seconds);
  const finalTime = avg_moving_time_seconds == null ? null : clock(avg_moving_time_seconds);
  const peak = peak_elevation_m == null ? MISSING_METRIC : `${group(toFeet(peak_elevation_m))} ft`;

  return (
    <View style={styles.card}>
      <View style={styles.headlines}>
        <Headline
          label="DISTANCE"
          value={miles == null ? MISSING_METRIC : miles.toFixed(1)}
          unit={miles == null ? undefined : 'mi'}
          spoken={`Distance, ${distance_km == null ? 'unknown' : `${toMiles(distance_km).toFixed(1)} miles`}`}
        />
        <View style={styles.vrule} />
        <Headline
          label="ELEV GAIN"
          value={gainFt == null ? MISSING_METRIC : group(gainFt)}
          unit={gainFt == null ? undefined : 'ft'}
          accent={gainFt != null}
          spoken={`Elevation gain, ${elevation_gain_m == null ? 'unknown' : `${group(toFeet(elevation_gain_m))} feet`}`}
        />
        <View style={styles.vrule} />
        <Headline
          label="MOVING"
          value={time?.value ?? MISSING_METRIC}
          unit={time?.unit}
          spoken={`Average moving time, ${finalTime ? `${finalTime.value} ${finalTime.unit}` : 'unknown'}`}
        />
      </View>

      <View style={styles.rule} />

      <View style={styles.difficulty} accessible accessibilityRole="text"
        accessibilityLabel={`Difficulty, ${rating ? rating.label : 'unknown'}`}>
        <View style={styles.difficultyTop}>
          <Text style={styles.label}>DIFFICULTY</Text>
          <Text style={[styles.difficultyLabel, rating && { color: levelColors(c)[rating.level] }]}>
            {rating ? rating.label : 'Not rated'}
          </Text>
        </View>
        <View style={styles.meter}>
          {levelColors(c).map((color, i) => (
            <View
              key={color}
              style={[styles.segment, { backgroundColor: rating && i <= rating.level ? color : c.raised }]}
            />
          ))}
        </View>
        <Text style={styles.footnote}>NPS Shenandoah rating{rating ? ` · ${Math.round(rating.score)}` : ''}</Text>
      </View>

      <View style={styles.rule} />

      <View style={styles.details}>
        <Detail icon={<Mountain size={16} strokeWidth={1.75} color={c.fgMuted} />} label="Peak" value={peak} />
        <Detail
          icon={<TrendingUp size={16} strokeWidth={1.75} color={c.fgMuted} />}
          label="Climb"
          value={climb == null ? MISSING_METRIC : `${group(climb)} ft/mi`}
        />
        <Detail
          icon={<Gauge size={16} strokeWidth={1.75} color={c.fgMuted} />}
          label="Pace"
          value={pace === MISSING_METRIC ? pace : `${pace} /mi`}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.raised,
    paddingVertical: 18,
  },
  headlines: { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 6 },
  headline: { flex: 1, paddingHorizontal: 12 },
  vrule: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 },
  label: { color: c.fgFaint, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6 },
  bigLine: { marginTop: 6 },
  big: {
    color: c.fg,
    fontFamily: fonts.uiSemibold,
    fontSize: 27,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  unit: { color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16, marginHorizontal: 18 },
  difficulty: { paddingHorizontal: 18 },
  difficultyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  difficultyLabel: { color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 15 },
  meter: { flexDirection: 'row', gap: 4, marginTop: 10 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  footnote: { marginTop: 8, color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11 },
  details: { flexDirection: 'row', paddingHorizontal: 12 },
  detail: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 6 },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11 },
  detailValue: {
    marginTop: 1,
    color: c.fg,
    fontFamily: fonts.uiMedium,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
});

/** Styles for the current appearance. */
function useStyles() {
  const c = useColors();
  return useMemo(() => makeStyles(c), [c]);
}
