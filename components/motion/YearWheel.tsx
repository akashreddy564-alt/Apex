import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColors } from '@/hooks/useColors';
import { indexAt } from '@/lib/age';
import { useSettings } from '@/stores/settingsStore';
import { withAlpha } from '@/theme/color';
import { numericStyle } from '@/theme/tokens';

import { haptics } from './haptics';

/** Row height: a 44 pt target per year. */
export const WHEEL_ROW = 44;
/** Rows visible: the chosen year with two above and two below. */
const VISIBLE = 5;
const PAD = WHEEL_ROW * Math.floor(VISIBLE / 2);
/** Each row away from the center tips this far back on the drum. */
const STEP_DEG = 21;
const STEP_RAD = (STEP_DEG * Math.PI) / 180;
/** The drum's radius, so neighbouring rows touch as they curve away. */
const RADIUS = WHEEL_ROW / Math.sin(STEP_RAD);
/** Web sends no scroll-end events and ignores snapToInterval, so it settles after a short pause instead. */
const IS_WEB = Platform.OS === 'web';
const WEB_SETTLE_MS = 120;

function Row({
  value,
  index,
  y,
  reduceMotion,
  onPress,
}: {
  value: number;
  index: number;
  y: SharedValue<number>;
  reduceMotion: boolean;
  onPress: (index: number) => void;
}) {
  const c = useColors();
  const style = useAnimatedStyle(() => {
    // Rows from the center: 0 is chosen, ±1 the next ones out.
    const d = Math.max(-3, Math.min(3, (index * WHEEL_ROW - y.value) / WHEEL_ROW));
    const opacity = interpolate(Math.abs(d), [0, 1, 2, 3], [1, 0.55, 0.28, 0.1], Extrapolation.CLAMP);
    if (reduceMotion) return { opacity };
    // On a real drum a row sits at R·sin(θ), not d rows down, so rows bunch up toward the rim.
    const drop = RADIUS * Math.sin(d * STEP_RAD) - d * WHEEL_ROW;
    return {
      opacity,
      transform: [
        { perspective: 600 },
        { translateY: drop },
        { rotateX: `${-d * STEP_DEG}deg` },
        { scale: 1 - Math.min(Math.abs(d), 3) * 0.04 },
      ],
    };
  });
  return (
    <Pressable
      onPress={() => onPress(index)}
      // The wheel is one adjustable control for screen readers; rows are just touch targets.
      accessible={false}
      importantForAccessibility="no"
      style={{ height: WHEEL_ROW, justifyContent: 'center' }}
    >
      <Animated.Text
        style={[
          { color: c.fg, textAlign: 'center', fontSize: 22, lineHeight: 28, letterSpacing: 0.5, ...numericStyle('medium') },
          style,
        ]}
      >
        {value}
      </Animated.Text>
    </Pressable>
  );
}

/**
 * A birth-year drum: flick it and it coasts, slows and snaps to a year; the
 * phone ticks once per year that passes the center. Rows curve away from
 * the middle like a real wheel and blur out at the rim. Past either end it
 * rubber-bands (iOS bounce). Tap a year to roll to it.
 */
export function YearWheel({
  values,
  value,
  onChange,
  label = 'Birth year',
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const c = useColors();
  const appearance = useSettings((s) => s.appearance);
  const reduceMotion = useReducedMotion();
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const startIndex = Math.max(0, values.indexOf(value));
  const y = useSharedValue(startIndex * WHEEL_ROW);
  const placed = useRef(false);
  const count = values.length;

  const webTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<(offset: number) => void>(() => {});
  const onWebScroll = useCallback((offset: number) => {
    if (webTimer.current) clearTimeout(webTimer.current);
    webTimer.current = setTimeout(() => settleRef.current(offset), WEB_SETTLE_MS);
  }, []);
  useEffect(() => () => {
    if (webTimer.current) clearTimeout(webTimer.current);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
      if (IS_WEB) scheduleOnRN(onWebScroll, e.contentOffset.y);
    },
  });

  // One tick per year crossing the center, however fast the flick.
  useAnimatedReaction(
    () => Math.min(count - 1, Math.max(0, Math.round(y.value / WHEEL_ROW))),
    (next, prev) => {
      if (prev !== null && next !== prev) {
        scheduleOnRN(haptics.select);
      }
    },
  );

  const settle = useCallback(
    (offset: number) => {
      const index = indexAt(offset, WHEEL_ROW, count);
      // Native already landed on a row; web rolls the last few points itself.
      if (IS_WEB && Math.abs(offset - index * WHEEL_ROW) > 0.5) {
        scroll.current?.scrollTo({ y: index * WHEEL_ROW, animated: true });
      }
      const next = values[index];
      if (next !== undefined && next !== value) onChange(next);
    },
    [count, onChange, scroll, value, values],
  );
  settleRef.current = settle;

  const goTo = useCallback(
    (index: number, animated = true) => {
      scroll.current?.scrollTo({ y: index * WHEEL_ROW, animated: animated && !reduceMotion });
      if (!animated) y.value = index * WHEEL_ROW;
    },
    [reduceMotion, scroll, y],
  );

  // Follow outside changes (and land on the start year where contentOffset isn't honoured).
  useEffect(() => {
    if (!placed.current) return;
    const index = values.indexOf(value);
    if (index >= 0 && indexAt(y.value, WHEEL_ROW, count) !== index) goTo(index);
  }, [count, goTo, value, values, y]);

  const step = (by: number) => {
    const index = Math.min(count - 1, Math.max(0, values.indexOf(value) + by));
    goTo(index);
    onChange(values[index]);
  };

  // The sheet's own color, so the rim fades into it with no visible edge.
  const rim = withAlpha(c.bg, 0.7);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ height: WHEEL_ROW * VISIBLE, justifyContent: 'center' }}
    >
      {/* The chosen-year band sits behind the drum so the year reads first. */}
      <View
        pointerEvents="none"
        style={[
          styles.band,
          { backgroundColor: c.surface, borderColor: c.raised, top: PAD },
        ]}
      />
      <Animated.ScrollView
        ref={scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        scrollsToTop={false}
        snapToInterval={WHEEL_ROW}
        // "normal" keeps a flick's momentum: it coasts through years before it snaps.
        decelerationRate="normal"
        bounces
        contentOffset={{ x: 0, y: startIndex * WHEEL_ROW }}
        contentContainerStyle={{ paddingVertical: PAD }}
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          goTo(startIndex, false);
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // A slow drag with no flick never sends momentum events.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
        nestedScrollEnabled
      >
        {values.map((year, index) => (
          <Row key={year} value={year} index={index} y={y} reduceMotion={reduceMotion} onPress={(i) => goTo(i)} />
        ))}
      </Animated.ScrollView>
      {/* The rim: years blur and fade as they roll out of view. */}
      <Rim position="top" appearance={appearance} wash={rim} />
      <Rim position="bottom" appearance={appearance} wash={rim} />
    </View>
  );
}

function Rim({ position, appearance, wash }: { position: 'top' | 'bottom'; appearance: string; wash: string }) {
  const edge = { [position]: 0 } as const;
  const style = [styles.rim, edge];
  if (Platform.OS === 'android') {
    return <View pointerEvents="none" style={[style, { backgroundColor: wash }]} />;
  }
  return (
    <BlurView pointerEvents="none" intensity={8} tint={appearance === 'dark' ? 'dark' : 'light'} style={[style, { overflow: 'hidden' }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ROW,
    borderRadius: 12,
    borderWidth: 1,
  },
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ROW * 1.25,
  },
});
