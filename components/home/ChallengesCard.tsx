import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GrowBar } from '@/components/motion';
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

  return (
    <View style={[cardStyle(c), { marginHorizontal: 16, marginTop: 14 }]} accessibilityLabel={`${challenges[0]!.month} challenges`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[label, { flex: 1 }]}>{challenges[0]!.month.toUpperCase()} CHALLENGES</Text>
        <Text style={label}>{left === 1 ? 'LAST DAY' : `${left} DAYS LEFT`}</Text>
      </View>
      {challenges.map((challenge, index) => {
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
      })}
    </View>
  );
}
