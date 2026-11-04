import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Flame } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { weeklyStreak } from '@/lib/streak';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle } from '@/theme/tokens';

const SEEN_KEY = 'apex-streak-seen';

/**
 * Weeks in a row with a hike. Turns amber from Friday when this week still
 * needs one. The first time it shows a bigger number, it pops with a haptic,
 * so the payoff lands wherever they next look.
 */
export function StreakChip() {
  const c = useColors();
  const logs = useTrailCache((s) => s.logs);
  const streak = useMemo(() => weeklyStreak(logs.map((log) => log.created_at)), [logs]);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak.weeks === 0) return;
    let cancelled = false;
    void AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        if (cancelled) return;
        const seen = Number(raw ?? 0);
        if (streak.weeks > seen && streak.hikedThisWeek) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
          if (!reduceMotion) {
            scale.value = withSequence(withSpring(1.25, { damping: 6, stiffness: 260 }), withTiming(1, { duration: 220 }));
          }
        }
        if (streak.weeks !== seen) void AsyncStorage.setItem(SEEN_KEY, String(streak.weeks));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reduceMotion, scale, streak.hikedThisWeek, streak.weeks]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (streak.weeks === 0) return null;

  // Friday on, an unfinished week is worth flagging.
  const urgent = streak.atRisk && [5, 6, 0].includes(new Date().getDay());
  const color = urgent ? c.fine : c.accent;
  const label = `${streak.weeks}-week hiking streak${streak.atRisk ? ', hike by Sunday to keep it' : ''}`;

  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: color,
        },
        pop,
      ]}
    >
      <Flame size={14} strokeWidth={2} color={color} fill={streak.hikedThisWeek ? color : 'transparent'} />
      <Text style={{ ...numericStyle('semibold'), color, fontSize: 13 }}>
        {streak.weeks} {streak.weeks === 1 ? 'week' : 'weeks'}
      </Text>
      {urgent ? (
        <Text style={{ color, fontFamily: fonts.uiMedium, fontSize: 12 }}>
          · {new Date().getDay() === 0 ? 'hike today' : 'hike by Sun'}
        </Text>
      ) : null}
    </Animated.View>
  );
}
