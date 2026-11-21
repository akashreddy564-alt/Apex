import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Eyebrow } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BAR_H = 86;
const MIN_BAR = 4;
const LABEL_H = 12;
const LABEL_GAP = 6;
const HEIGHT = 110;

/** One vertical bar, grown from the bottom with GrowBar's delay and timing. */
function Bar({ fraction, index, color }: { fraction: number; index: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const f = useSharedValue(reduceMotion ? fraction : 0);
  useEffect(() => {
    f.value = reduceMotion
      ? fraction
      : withDelay(Math.min(index, 8) * 55, withTiming(fraction, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [fraction, index, reduceMotion, f]);
  const style = useAnimatedStyle(() => ({
    height: Math.max(MIN_BAR, Math.max(0, Math.min(1, f.value)) * BAR_H),
  }));
  return <Animated.View style={[{ width: '100%', borderRadius: 7, backgroundColor: color }, style]} />;
}

/**
 * Monday to Sunday bars for this week, in stored units, with a dashed line at
 * the daily pace (target / 7). Hiked days are in the accent.
 */
export function WeekBars({ totals, targetStored }: { totals: number[]; targetStored: number }) {
  const c = useColors();
  const perDay = Number.isFinite(targetStored) && targetStored > 0 ? targetStored / 7 : 0;
  const peak = Math.max(0, ...totals.filter(Number.isFinite));
  const scale = Math.max(perDay * 1.6, peak, 1);
  const paceBottom = LABEL_H + LABEL_GAP + (perDay / scale) * BAR_H;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
    >
      {/* Behind the bars, so a tall day covers the line. */}
      {perDay > 0 ? (
        <View style={{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, bottom: paceBottom, height: 1 }}>
          <Svg width="100%" height={1} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Line x1="0" y1="0.5" x2="100%" y2="0.5" stroke={c.border} strokeWidth={1} strokeDasharray="4 4" />
          </Svg>
          <View style={{ position: 'absolute', left: 0, bottom: 4 }}>
            <Eyebrow>Daily pace</Eyebrow>
          </View>
        </View>
      ) : null}
      {DAYS.map((day, i) => {
        const v = Number.isFinite(totals[i]) ? Math.max(0, totals[i]) : 0;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <Bar fraction={v / scale} index={i} color={v > 0 ? c.accent : c.raised} />
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 10,
                lineHeight: LABEL_H,
                marginTop: LABEL_GAP,
                color: c.fgFaint,
              }}
            >
              {day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
