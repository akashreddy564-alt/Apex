import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Eyebrow, haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { angleToDisplay, DIAL_RANGE, DIAL_START_DEG, DIAL_SWEEP_DEG, displayToFraction } from '@/lib/goalDial';
import type { GoalMetric } from '@/lib/weeklyGoal';
import { fonts } from '@/theme/tokens';

const SIZE = 280;
const C = SIZE / 2;
/** Outer edge of the ticks. The arc and knob ride just outside them. */
const RAD = 120;
const ARC_R = RAD + 8;
const KNOB_R = 9;
const TICKS = 60;
const DISC_INSET = 64;
/** Movement needed before a touch on the ring turns the dial. */
const SLOP = 4;
const DISPLAY_SIZE = 40;

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number) => ({
  x: C + Math.cos(rad(deg)) * r,
  y: C + Math.sin(rad(deg)) * r,
});

/** "3,000" or "10". */
function formatDisplay(metric: GoalMetric, value: number): string {
  if (metric === 'distance') return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Tick label: "2.8k" ft, or whole miles. */
function tickLabel(metric: GoalMetric, value: number): string {
  if (metric === 'distance') return String(Math.round(value));
  const k = value / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

/**
 * True when a point (in the dial's own coordinates) is on the ring band:
 * outside the centre disc and inside the dial's circle. Only touches that
 * start there can turn the dial, so a scroll from the disc or corners stays a scroll.
 */
export function inRingBand(x: number, y: number): boolean {
  'worklet';
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const r = Math.hypot(x - C, y - C);
  return r >= C - DISC_INSET && r <= C;
}

function clampDisplay(metric: GoalMetric, value: number): number {
  const { min, max } = DIAL_RANGE[metric];
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

/**
 * An altimeter-style dial for the weekly target, in display units (ft or mi).
 * Turning it snaps to the metric's step with a selection tick, and calls
 * `onChange` on each new snap. A value outside the range shows clamped but is
 * not reported until the dial is turned.
 */
export function GoalDial({
  metric,
  display,
  onChange,
}: {
  metric: GoalMetric;
  display: number;
  onChange: (display: number) => void;
}) {
  const c = useColors();
  const gradId = `dialDisc-${useId().replace(/:/g, '')}`;
  const { min, max, step } = DIAL_RANGE[metric];
  const shown = clampDisplay(metric, display);
  const [turned, setTurned] = useState(false);

  // The last value shown or reported, so a snap only fires when what's shown changes.
  const last = useRef(shown);
  useEffect(() => {
    last.current = shown;
  }, [shown]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const metricRef = useRef(metric);
  metricRef.current = metric;

  const angle = useSharedValue(0);
  const pending = useSharedValue(false);

  const report = useCallback((next: number) => {
    if (next === last.current) return;
    last.current = next;
    onChangeRef.current(next);
  }, []);

  // Coalesced: one queued JS call at a time, reading the latest angle when it runs.
  const sync = useCallback(() => {
    pending.value = false;
    const next = angleToDisplay(metricRef.current, angle.value);
    if (next !== last.current) haptics.select();
    report(next);
  }, [angle, pending, report]);

  const begin = useCallback(() => setTurned(true), []);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const pan = useMemo(() => {
    const track = (x: number, y: number) => {
      'worklet';
      const dx = x - C;
      const dy = y - C;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx * dx + dy * dy < 1) return;
      angle.value = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (!pending.value) {
        pending.value = true;
        scheduleOnRN(sync);
      }
    };
    // Manual activation: a touch must start on the ring band and move a few
    // px before the dial takes it, so a touch-down alone never writes.
    return Gesture.Pan()
      .manualActivation(true)
      .shouldCancelWhenOutside(false)
      .onTouchesDown((e, manager) => {
        const t = e.allTouches[0];
        if (!t || e.numberOfTouches > 1 || !inRingBand(t.x, t.y)) {
          manager.fail();
          return;
        }
        startX.value = t.x;
        startY.value = t.y;
      })
      .onTouchesMove((e, manager) => {
        const t = e.allTouches[0];
        if (!t) return;
        const dx = t.x - startX.value;
        const dy = t.y - startY.value;
        if (dx * dx + dy * dy >= SLOP * SLOP) manager.activate();
      })
      .onStart((e) => {
        scheduleOnRN(begin);
        track(e.x, e.y);
      })
      .onUpdate((e) => {
        track(e.x, e.y);
      })
      .onEnd((e, success) => {
        // A cancelled turn (the page took the touch) keeps the last snap it reached.
        if (success) track(e.x, e.y);
      });
  }, [angle, pending, sync, begin, startX, startY]);

  const step1 = (dir: 1 | -1) => {
    const base = min + (dir > 0 ? Math.floor((shown - min) / step) : Math.ceil((shown - min) / step)) * step;
    report(Math.min(max, Math.max(min, base + dir * step)));
  };

  const ticks = useMemo(() => {
    const out: {
      key: number;
      long: boolean;
      a: { x: number; y: number };
      b: { x: number; y: number };
      label?: { x: number; y: number; text: string };
    }[] = [];
    for (let i = 0; i <= TICKS; i++) {
      const deg = DIAL_START_DEG + (i * DIAL_SWEEP_DEG) / TICKS;
      const long = i % 5 === 0;
      const tick = {
        key: i,
        long,
        a: at(deg, RAD - (long ? 14 : 7)),
        b: at(deg, RAD),
      };
      if (i % 15 === 0) {
        const p = at(deg, RAD - 28);
        out.push({
          ...tick,
          label: {
            x: p.x,
            y: p.y + 3.5,
            text: tickLabel(metric, min + (i / TICKS) * (max - min)),
          },
        });
      } else out.push(tick);
    }
    return out;
  }, [metric, min, max]);

  const f = displayToFraction(metric, shown);
  const sweep = f * DIAL_SWEEP_DEG;
  const s = at(DIAL_START_DEG, ARC_R);
  const e = at(DIAL_START_DEG + sweep, ARC_R);
  const arc = sweep > 0.01 ? `M${s.x} ${s.y} A${ARC_R} ${ARC_R} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}` : null;
  const unitWords = metric === 'elevation' ? 'feet' : 'miles';

  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Weekly target"
          accessibilityValue={{
            text: `${formatDisplay(metric, shown)} ${unitWords} a week`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(ev) => {
            const name = ev.nativeEvent.actionName;
            if (name === 'increment') step1(1);
            else if (name === 'decrement') step1(-1);
          }}
          style={{
            width: SIZE,
            height: SIZE,
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Defs>
              <RadialGradient id={gradId} cx="50%" cy="30%" r="70%">
                <Stop offset="0" stopColor={c.raised} />
                <Stop offset="1" stopColor={c.surface} />
              </RadialGradient>
            </Defs>
            {ticks.map((t) => (
              <Line
                key={t.key}
                x1={t.a.x}
                y1={t.a.y}
                x2={t.b.x}
                y2={t.b.y}
                stroke={t.long ? c.fgFaint : c.border}
                strokeWidth={t.long ? 1.6 : 1}
              />
            ))}
            {ticks.map((t) =>
              t.label ? (
                <SvgText
                  key={`l${t.key}`}
                  x={t.label.x}
                  y={t.label.y}
                  textAnchor="middle"
                  fontFamily={fonts.mono}
                  fontSize={10}
                  fill={c.fgFaint}
                >
                  {t.label.text}
                </SvgText>
              ) : null,
            )}
            <Circle cx={C} cy={C} r={C - DISC_INSET} fill={`url(#${gradId})`} stroke={c.border} strokeWidth={1} />
            {arc ? <Path d={arc} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" /> : null}
            <Circle cx={e.x} cy={e.y} r={KNOB_R} fill={c.accent} stroke={c.bg} strokeWidth={3} />
          </Svg>
          <View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: DISC_INSET,
              top: DISC_INSET,
              right: DISC_INSET,
              bottom: DISC_INSET,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Eyebrow>Weekly target</Eyebrow>
            <Text
              style={{
                color: c.fg,
                fontFamily: fonts.displayExtraBold,
                fontWeight: 'normal',
                fontSize: DISPLAY_SIZE,
                lineHeight: Math.round(DISPLAY_SIZE * 0.88) + 4,
                letterSpacing: -0.025 * DISPLAY_SIZE,
                textTransform: 'uppercase',
                fontVariant: ['tabular-nums'],
                marginTop: 6,
              }}
            >
              {formatDisplay(metric, shown)}
            </Text>
            <Text
              style={{
                color: c.fgMuted,
                fontFamily: fonts.ui,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {metric === 'elevation' ? 'feet of climbing' : 'miles'}
            </Text>
          </View>
        </View>
      </GestureDetector>
      <Text
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={{
          color: c.fgFaint,
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 1.2,
          marginTop: -48,
        }}
      >
        {turned ? `SNAPS TO ${formatDisplay(metric, step)} ${metric === 'elevation' ? 'FT' : 'MI'}` : 'TURN THE DIAL'}
      </Text>
    </View>
  );
}
