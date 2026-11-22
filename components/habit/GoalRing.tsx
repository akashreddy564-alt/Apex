import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Path, Svg } from 'react-native-svg';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';
import { formatAmount, formatProgress, type GoalMetric } from '@/lib/weeklyGoal';
import { numericStyle } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CELEBRATED_KEY = 'apex-goal-celebrated';

interface RingProps {
  fraction: number;
  size: number;
  stroke: number;
  complete: boolean;
  /** Arc color: climb brown or distance blue. Goal met turns it streak green. */
  color?: string;
}

/** The ring itself. The arc eases to its new length when progress changes. */
export function Ring({ fraction, size, stroke, complete, color }: RingProps) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = useSharedValue(reduceMotion ? fraction : 0);

  useEffect(() => {
    shown.value = reduceMotion
      ? fraction
      : withTiming(fraction, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        });
  }, [fraction, reduceMotion, shown]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - shown.value),
  }));

  const mid = size / 2;
  // A check mark scaled to the ring, drawn in the same SVG so nothing has to stack over it.
  const k = size / 24;
  const check = `M${7 * k} ${12.5 * k} L${10.5 * k} ${16 * k} L${17 * k} ${8.5 * k}`;

  return (
    <Svg width={size} height={size}>
      <Circle cx={mid} cy={mid} r={radius} stroke={c.raised} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={mid}
        cy={mid}
        r={radius}
        stroke={complete ? c.streak : (color ?? c.accent)}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill={complete ? c.streak : 'none'}
        strokeDasharray={`${circumference} ${circumference}`}
        transform={`rotate(-90 ${mid} ${mid})`}
        animatedProps={arc}
      />
      {complete ? (
        <Path
          d={check}
          stroke={c.surface}
          strokeWidth={Math.max(2, 2.6 * k)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}

function unit(metric: GoalMetric) {
  return metric === 'elevation' ? 'ft' : 'mi';
}

/**
 * Progress toward this week's goal, beside the streak. Hidden until the
 * first hike, like the streak and reminders. The first time it fills in a
 * week it pops with a haptic. Tapping it opens the goal.
 */
export function GoalRing() {
  const c = useColors();
  const router = useRouter();
  const { goal, progress, hasHiked } = useWeeklyGoal();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!progress.complete) return;
    let cancelled = false;
    void AsyncStorage.getItem(CELEBRATED_KEY)
      .then((seen) => {
        if (cancelled || seen === progress.weekOf) return;
        haptics.success();
        if (!reduceMotion) {
          scale.value = withSequence(withSpring(1.2, { damping: 6, stiffness: 260 }), withTiming(1, { duration: 220 }));
        }
        void AsyncStorage.setItem(CELEBRATED_KEY, progress.weekOf);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [progress.complete, progress.weekOf, reduceMotion, scale]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!hasHiked) return null;

  const label = `Weekly goal, ${formatProgress(goal.metric, progress.done, progress.target)}${
    progress.complete ? ', done' : ''
  }`;

  return (
    <Animated.View style={pop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens your weekly goal"
        onPress={() => router.push('/goal')}
        hitSlop={8}
        className="flex-row items-center active:opacity-70"
        style={{
          gap: 6,
          paddingLeft: 5,
          paddingRight: 10,
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Ring
          fraction={progress.fraction}
          size={18}
          stroke={3}
          complete={progress.complete}
          color={goal.metric === 'elevation' ? c.climb : c.distance}
        />
        <Text style={{ ...numericStyle('semibold'), color: c.fg2, fontSize: 13 }}>
          {formatAmount(goal.metric, progress.done)} {unit(goal.metric)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
