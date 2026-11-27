import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { challengeTone } from '@/components/home/ChallengesCard';
import { GrowBar, haptics, Skeleton } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useAuth } from '@/hooks/useAuth';
import { useChallengeBoard, useChallengeToggle, useMyChallenges } from '@/hooks/useChallenges';
import { useColors } from '@/hooks/useColors';
import {
  challengeAmount,
  challengeFraction,
  daysLeft,
  formatChallengeAmount,
  formatChallengeProgress,
  parseChallengeKey,
} from '@/lib/challenges';
import { posterLineStyle } from '@/lib/posterFit';
import { useTrailCache } from '@/stores/trailCache';
import { cardStyle, fonts } from '@/theme/tokens';

/** One challenge: your progress, Join or Leave, and the friends who joined. */
export default function ChallengeScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const challenge = useMemo(() => (key ? parseChallengeKey(key) : null), [key]);
  const c = useColors();
  const router = useRouter();
  const { session } = useAuth();
  const logs = useTrailCache((s) => s.logs);
  const { joined } = useMyChallenges();
  const toggle = useChallengeToggle();
  const isIn = challenge ? joined.has(challenge.key) : false;
  const board = useChallengeBoard(challenge?.key ?? '', isIn);

  if (!challenge) {
    return (
      <View className="flex-1 bg-bg px-5 pt-6">
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15 }}>That challenge doesn’t exist.</Text>
      </View>
    );
  }

  const amount = challengeAmount(challenge, logs);
  const fraction = challengeFraction(challenge, amount);
  const done = fraction >= 1;
  const tone = done ? c.streak : challengeTone(c, challenge.metric);
  const now = new Date();
  const left = daysLeft(challenge, now);
  const past = challenge.end.getTime() <= now.getTime();
  const others = board.rows.filter((row) => !row.isMe);

  const join = () => {
    haptics.tapLight();
    toggle.mutate({ key: challenge.key, join: true });
  };
  const leave = () => {
    haptics.tapMedium();
    toggle.mutate({ key: challenge.key, join: false });
  };
  const invite = () => {
    void Share.share({ message: `I’m doing “${challenge.title}” on Apex. Join me: apex://challenge/${encodeURIComponent(challenge.key)}` });
  };

  const label = { color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 } as const;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: '' }} />
      <Text style={label}>
        {challenge.month.toUpperCase()} CHALLENGE · {past ? 'ENDED' : left === 1 ? 'LAST DAY' : `${left} DAYS LEFT`}
      </Text>
      <Text
        accessibilityRole="header"
        style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 34, marginTop: 8 }}
      >
        {challenge.title}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
        Recorded hikes count. Friends who join show up on the board with you.
      </Text>

      <View style={[cardStyle(c), { marginTop: 18 }]}>
        <Text style={label}>{done ? 'DONE' : 'YOU'}</Text>
        <Text style={[{ color: tone, fontFamily: fonts.poster, fontSize: 40, marginTop: 4 }, posterLineStyle(40, 0, 0.92, true)]}>
          {formatChallengeAmount(challenge.metric, amount)}
        </Text>
        <View style={{ marginTop: 10 }}>
          <GrowBar fraction={fraction} color={tone} track={c.raised} height={8} />
        </View>
        <Text style={{ marginTop: 6, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
          {formatChallengeProgress(challenge, amount)}
          {done ? ' · You did it.' : ''}
        </Text>
      </View>

      <View style={{ marginTop: 18, gap: 10 }}>
        {!session ? (
          <PrimaryButton label="Sign in to join" onPress={() => router.push('/account')} />
        ) : isIn ? (
          <>
            <PrimaryButton label="Invite friends" onPress={invite} />
            <SecondaryButton label="Leave challenge" onPress={leave} busy={toggle.isPending && toggle.variables?.join === false} />
          </>
        ) : past ? null : (
          <PrimaryButton label="Join challenge" onPress={join} busy={toggle.isPending && toggle.variables?.join === true} />
        )}
        {toggle.error ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>{toggle.error.message}</Text>
        ) : null}
      </View>

      {isIn ? (
        <View style={{ marginTop: 28 }}>
          <Text accessibilityRole="header" style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
            Friends in this challenge
          </Text>
          {board.loading ? (
            <View style={{ marginTop: 12 }}>
              <Skeleton shape="row" count={3} />
            </View>
          ) : null}
          {board.error ? (
            <Text style={{ marginTop: 8, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{board.error}</Text>
          ) : null}
          {!board.loading && !board.error && others.length === 0 ? (
            <Text style={{ marginTop: 8, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>
              No friends have joined yet. Invite them and race each other to the end of {challenge.month}.
            </Text>
          ) : null}
          {others.length > 0
            ? board.rows.map((row, index) => (
                <Pressable
                  key={row.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.place}. ${row.isMe ? 'You' : row.displayName}, ${formatChallengeAmount(challenge.metric, row.amount)}`}
                  onPress={() => router.push({ pathname: '/friend/[id]', params: { id: row.userId } })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: c.raised,
                    }}
                  >
                    <Text style={{ width: 22, color: c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 14 }}>{row.place}</Text>
                    <Avatar name={row.displayName || row.username} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }} numberOfLines={1}>
                        {row.isMe ? 'You' : row.displayName}
                      </Text>
                      <View style={{ marginTop: 5 }}>
                        <GrowBar
                          fraction={challengeFraction(challenge, row.amount)}
                          color={challengeFraction(challenge, row.amount) >= 1 ? c.streak : challengeTone(c, challenge.metric)}
                          track={c.raised}
                          index={index}
                          height={4}
                        />
                      </View>
                    </View>
                    <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 13 }}>
                      {formatChallengeAmount(challenge.metric, row.amount)}
                    </Text>
                  </View>
                </Pressable>
              ))
            : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
