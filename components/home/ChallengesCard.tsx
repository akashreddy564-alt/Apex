import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import Animated, { LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GrowBar, haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useMyChallenges } from '@/hooks/useChallenges';
import {
  challengeAmount,
  challengeFraction,
  daysLeft,
  formatChallengeProgress,
  monthChallenges,
  type ChallengeMetric,
} from '@/lib/challenges';
import { useTrailCache } from '@/stores/trailCache';
import type { Palette } from '@/theme/tokens';
import { cardStyle, fonts } from '@/theme/tokens';

export function challengeTone(c: Palette, metric: ChallengeMetric): string {
  return metric === 'climb' ? c.climb : metric === 'distance' ? c.distance : c.streak;
}

/** This month's three challenges on Home: your progress, and whether you've joined. */
export function ChallengesCard() {
  const c = useColors();
  const router = useRouter();
  const logs = useTrailCache((s) => s.logs);
  const { joined } = useMyChallenges();
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((n) => n + 1), []));
  const now = useMemo(() => new Date(), [visit]); // eslint-disable-line react-hooks/exhaustive-deps
  const challenges = useMemo(() => monthChallenges(now), [now]);
  const left = daysLeft(challenges[0]!, now);

  const label = { color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 } as const;
  const [open, setOpen] = useState(false);
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  const joinedCount = challenges.filter((ch) => joined.has(ch.key)).length;
  // Overall progress across the month's challenges, for the folded row's little bar.
  const overall =
    challenges.reduce((sum, ch) => sum + Math.min(1, challengeFraction(ch, challengeAmount(ch, logs))), 0) / Math.max(1, challenges.length);

  return (
    <Animated.View
      layout={LinearTransition.duration(240)}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12, paddingVertical: 12 }]}
      accessibilityLabel={`${challenges[0]!.month} challenges`}
    >
      {/* Folded by default: one row, so the feed below stays in view. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${challenges[0]!.month} challenges, ${joinedCount} of ${challenges.length} joined`}
        accessibilityHint={open ? 'Folds the challenges' : 'Shows the challenges'}
        onPress={() => {
          haptics.select();
          setOpen((o) => !o);
        }}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={label}>{challenges[0]!.month.toUpperCase()} CHALLENGES</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 14, marginTop: 3 }}>
            {joinedCount > 0 ? `${joinedCount} of ${challenges.length} joined` : `${challenges.length} to join`}
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui }}>{` · ${left === 1 ? 'last day' : `${left} days left`}`}</Text>
          </Text>
        </View>
        {!open ? (
          <View style={{ width: 54 }}>
            <GrowBar fraction={overall} color={c.climb} track={c.raised} index={0} />
          </View>
        ) : null}
        <Animated.View style={chevron}>
          <ChevronDown size={18} strokeWidth={1.8} color={c.fgMuted} />
        </Animated.View>
      </Pressable>
      {open ? challenges.map((challenge, index) => {
        const amount = challengeAmount(challenge, logs);
        const fraction = challengeFraction(challenge, amount);
        const done = fraction >= 1;
        const isIn = joined.has(challenge.key);
        const tone = done ? c.streak : challengeTone(c, challenge.metric);
        return (
          <Pressable
            key={challenge.key}
            accessibilityRole="button"
            accessibilityLabel={`${challenge.title}. ${formatChallengeProgress(challenge, amount)}.${isIn ? ' Joined.' : ''}`}
            accessibilityHint="Opens the challenge and your friends’ board"
            onPress={() => router.push({ pathname: '/challenge/[key]', params: { key: challenge.key } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ marginTop: index === 0 ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }} numberOfLines={1}>
                  {challenge.title}
                </Text>
                {isIn ? (
                  <Text style={{ color: done ? c.streak : c.fg2, fontFamily: fonts.uiMedium, fontSize: 12 }}>
                    {done ? 'Done' : 'Joined'}
                  </Text>
                ) : (
                  <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>Join</Text>
                )}
                <ChevronRight size={15} strokeWidth={1.8} color={c.fgFaint} />
              </View>
              <View style={{ marginTop: 7 }}>
                <GrowBar fraction={fraction} color={tone} track={c.raised} index={index} />
              </View>
              <Text style={{ marginTop: 5, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12 }}>
                {formatChallengeProgress(challenge, amount)}
              </Text>
            </View>
          </Pressable>
        );
      }) : null}
    </Animated.View>
  );
}
