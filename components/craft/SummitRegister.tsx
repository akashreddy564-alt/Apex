import { useCallback, useId, useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Mask, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ScoreBadge } from '@/components/score/ScoreBadge';
import { formatDistance, formatDuration, formatElevation } from '@/lib/format';
import type { RegisterRank, RegisterReasons } from '@/lib/logRegister';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/stores/settingsStore';
import { fonts, ink, minTypeSize, paper, stamp as STAMP } from '@/theme/tokens';
import type { HikeLog, Trail } from '@/types/trail';
import { withAlpha } from '@/theme/color';

const EDGE = 8;
const BITE = 5;
const PRINT_MS = 1600;
const PRINT_DELAY = 400;
const TRACE_W = 300;
const TRACE_H = 46;

/** Logs that have already printed this session, so returning to the tab doesn't reprint. */
const printed = new Set<string>();

const MUTED = withAlpha(ink, 0.67);
const WHY = withAlpha(ink, 0.6);
const RULE = withAlpha(ink, 0.4);

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "SAT NOV 22 · 7:12 AM" in local time, or null for a bad date. */
function stampDate(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const h = at.getHours();
  const clock = `${h % 12 === 0 ? 12 : h % 12}:${String(at.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${DAYS[at.getDay()]} ${MONTHS[at.getMonth()]} ${at.getDate()} · ${clock}`;
}

function tracePath(profile: Trail['elevation_profile']): string | null {
  if (profile.length < 2) return null;
  const first = profile[0].distance_m;
  const span = profile[profile.length - 1].distance_m - first;
  if (!(span > 0)) return null;
  const els = profile.map((p) => p.elevation_m);
  const lo = Math.min(...els);
  const range = Math.max(...els) - lo || 1;
  return profile
    .map((p, i) => {
      const x = ((p.distance_m - first) / span) * TRACE_W;
      const y = TRACE_H - 2 - ((p.elevation_m - lo) / range) * (TRACE_H - 4);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * A torn-receipt edge: paper with round bites out of its outer side. The bites
 * tile the width exactly. `outline` strokes the edge (light mode, on white).
 */
function Scallops({
  id,
  width,
  side,
  outline,
}: {
  id: string;
  width: number;
  side: 'top' | 'bottom';
  outline?: string;
}) {
  const n = Math.max(1, Math.round(width / (BITE * 2)));
  const r = width / (n * 2);
  const outer = side === 'top' ? 0 : EDGE;
  const inner = side === 'top' ? EDGE : 0;
  // Left to right along the bites; the top edge's arcs bow down, the bottom's up.
  const sweep = side === 'top' ? 0 : 1;
  let edge = `M0.5 ${inner} L0.5 ${outer}`;
  for (let i = 0; i < n; i++) edge += ` A${r} ${r} 0 0 ${sweep} ${(2 * (i + 1) * r).toFixed(2)} ${outer}`;
  edge += ` M${width - 0.5} ${outer} L${width - 0.5} ${inner}`;
  return (
    <Svg width={width} height={EDGE} style={{ display: 'flex' }}>
      <Defs>
        <Mask id={id} x={0} y={0} width={width} height={EDGE} maskUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={width} height={EDGE} fill="#FFFFFF" />
          {Array.from({ length: n }, (_, i) => (
            <Circle key={i} cx={r + i * r * 2} cy={outer} r={r} fill="#000000" />
          ))}
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={width} height={EDGE} fill={paper} mask={`url(#${id})`} />
      {outline ? <Path d={edge} fill="none" stroke={outline} strokeWidth={1} /> : null}
    </Svg>
  );
}

function Rule() {
  return (
    <View style={{ height: 1, marginVertical: 12 }}>
      <Svg width="100%" height={1}>
        <Line x1={0} y1={0.5} x2="100%" y2={0.5} stroke={RULE} strokeWidth={1} strokeDasharray="3 3" />
      </Svg>
    </View>
  );
}

const mono = { fontFamily: fonts.mono, color: ink } as const;

/** One register line, read as a single unit ("Distance, 5.6 mi"). Its reason stays separate. */
function RegisterLine({ label, value, why }: { label: string; value: string | null; why?: string | null }) {
  return (
    <>
      <View
        accessible={value != null}
        accessibilityLabel={value != null ? `${label}, ${value.toLowerCase()}` : undefined}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}
      >
        <Text style={{ ...mono, fontSize: 12 }}>{label.toUpperCase()}</Text>
        {value != null ? (
          <Text style={{ ...mono, fontSize: 12, fontVariant: ['tabular-nums'] }}>{value}</Text>
        ) : (
          // Empty register: a dashed blank where the number will print.
          <View aria-hidden style={{ width: 64, height: 1 }}>
            <Svg width={64} height={1}>
              <Line x1={0} y1={0.5} x2={64} y2={0.5} stroke={RULE} strokeWidth={1} strokeDasharray="3 3" />
            </Svg>
          </View>
        )}
      </View>
      {why ? (
        <Text style={{ ...mono, fontSize: minTypeSize, color: WHY, marginTop: -1, marginBottom: 4 }}>{why}</Text>
      ) : null}
    </>
  );
}

/**
 * The latest hike as a paper summit register: hike number, date, trail name,
 * a summit stamp, the elevation trace, distance / climb / moving time with
 * their reasons, and the rank. It prints in once per hike per session.
 * With no log it is the empty register.
 */
export function SummitRegister({
  log,
  trail,
  number,
  reasons,
  rank,
  onOpen,
}: {
  log: HikeLog | null;
  trail: Trail | null;
  number: number;
  reasons: RegisterReasons;
  rank: RegisterRank | null;
  onOpen?: () => void;
}) {
  const c = useColors();
  // On a white page the paper needs an edge and a lift; on dark it stands on its own.
  const light = useSettings((s) => s.appearance) === 'light';
  const outline = light ? c.raised : undefined;
  const reduceMotion = useReducedMotion();
  const base = `register-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);
  const [printing, setPrinting] = useState(() => log != null && !reduceMotion && !printed.has(log.id));
  const started = useRef(false);
  const progress = useSharedValue(0);
  const height = useSharedValue(0);
  const logId = log?.id ?? null;

  const finish = useCallback(() => setPrinting(false), []);

  const onContent = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== width) setWidth(w);
    height.value = h;
    if (printing && !started.current && h > 0) {
      started.current = true;
      // Recorded as it starts, so a print cut short by leaving the tab doesn't replay.
      if (logId) printed.add(logId);
      progress.value = withDelay(
        PRINT_DELAY,
        withTiming(1, { duration: PRINT_MS, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      );
    }
  };

  // Clip reveal from the top, sliding down out of the "printer".
  const reveal = useAnimatedStyle(() => ({
    height: height.value * progress.value,
    transform: [{ translateY: (1 - progress.value) * -14 }],
  }));

  const distanceKm = log ? (log.distance_km ?? trail?.distance_km ?? null) : null;
  const gainM = log ? (log.elevation_gain_m ?? trail?.elevation_gain_m ?? null) : null;
  const date = log ? stampDate(log.created_at) : null;
  const trace = trail ? tracePath(trail.elevation_profile) : null;
  const peak = trail?.peak_elevation_m ?? null;

  const body = log ? (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: MUTED, textTransform: 'uppercase' }}>
          {'APEX · '}
          <Text>{`No. ${String(number).padStart(4, '0')}`}</Text>
        </Text>
        {date ? <Text style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: MUTED }}>{date}</Text> : null}
      </View>
      <View style={{ paddingRight: peak != null ? 84 : 0, marginTop: 10 }}>
        <Text
          accessibilityRole={onOpen ? 'link' : undefined}
          accessibilityHint={onOpen ? 'Opens the trail' : undefined}
          onPress={onOpen}
          style={{
            fontFamily: fonts.displayExtraBold,
            fontWeight: 'normal',
            fontSize: 26,
            lineHeight: Math.round(26 * 0.88) + 2,
            letterSpacing: -0.025 * 26,
            textTransform: 'uppercase',
            color: ink,
            paddingTop: 2,
          }}
        >
          {trail?.name ?? 'Hike'}
        </Text>
        {trail?.region ? (
          <Text style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: MUTED, marginTop: 4 }}>
            {trail.region.toUpperCase()}
          </Text>
        ) : null}
      </View>
      {peak != null ? (
        <View
          accessible
          accessibilityLabel={`Summit, ${formatElevation(peak)}`}
          style={{
            position: 'absolute',
            right: 14,
            top: 40,
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 2,
            borderColor: withAlpha(STAMP, 0.55),
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-14deg' }],
          }}
        >
          <Text style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.9, color: withAlpha(STAMP, 0.75) }}>
            SUMMIT
          </Text>
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: 0.9,
              color: withAlpha(STAMP, 0.75),
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatElevation(peak).toUpperCase()}
          </Text>
        </View>
      ) : null}
      {trace ? (
        <View aria-hidden style={{ height: TRACE_H, marginTop: 8 }}>
          <Svg width="100%" height={TRACE_H} viewBox={`0 0 ${TRACE_W} ${TRACE_H}`} preserveAspectRatio="none">
            <Path d={trace} fill="none" stroke={ink} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </Svg>
        </View>
      ) : null}
      <Rule />
      {distanceKm != null ? (
        <RegisterLine label="Distance" value={formatDistance(distanceKm).toUpperCase()} why={reasons.distance} />
      ) : null}
      {gainM != null ? (
        <RegisterLine label="Climbed" value={formatElevation(gainM).toUpperCase()} why={reasons.climb} />
      ) : null}
      {log.duration_seconds > 0 ? (
        <RegisterLine label="Moving time" value={formatDuration(log.duration_seconds).toUpperCase()} why={reasons.time} />
      ) : null}
      {rank ? (
        <>
          <Rule />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScoreBadge bucket={rank.bucket} count={rank.count} score={rank.score} size="sm" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...mono, fontSize: minTypeSize, lineHeight: 16, textTransform: 'uppercase' }}>
                {`Ranked #${rank.ordinal} of ${rank.total}`}
              </Text>
              {rank.reason ? (
                <Text style={{ ...mono, fontSize: minTypeSize, lineHeight: 16, color: WHY }}>{rank.reason}</Text>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </>
  ) : (
    <>
      <Text style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: MUTED }}>APEX · SUMMIT REGISTER</Text>
      <Text
        style={{
          fontFamily: fonts.displayExtraBold,
          fontWeight: 'normal',
          fontSize: 26,
          lineHeight: Math.round(26 * 0.88) + 2,
          letterSpacing: -0.025 * 26,
          textTransform: 'uppercase',
          color: ink,
          marginTop: 10,
          paddingTop: 2,
        }}
      >
        Your first hike prints here
      </Text>
      <Rule />
      <RegisterLine label="Distance" value={null} />
      <RegisterLine label="Climbed" value={null} />
      <RegisterLine label="Moving time" value={null} />
      <Rule />
      <Text style={{ ...mono, fontSize: minTypeSize, color: WHY }}>
        Slide to start a hike, or log one you already did.
      </Text>
    </>
  );

  const content = (
    <View onLayout={onContent} style={light ? { boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)' } : undefined}>
      {width > 0 ? (
        <Scallops id={`${base}-top`} width={width} side="top" outline={outline} />
      ) : (
        <View style={{ height: EDGE }} />
      )}
      <View
        style={{
          backgroundColor: paper,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 6,
          borderLeftWidth: outline ? 1 : 0,
          borderRightWidth: outline ? 1 : 0,
          borderColor: outline,
        }}
      >
        {body}
      </View>
      {width > 0 ? (
        <Scallops id={`${base}-bottom`} width={width} side="bottom" outline={outline} />
      ) : (
        <View style={{ height: EDGE }} />
      )}
    </View>
  );

  return (
    // Sighted users can tap anywhere; screen readers get the trail-name link, so
    // the lines and reasons below stay readable one by one.
    <Pressable accessible={false} onPress={onOpen} disabled={!onOpen}>
      {printing ? <Animated.View style={[{ overflow: 'hidden' }, reveal]}>{content}</Animated.View> : content}
    </Pressable>
  );
}
