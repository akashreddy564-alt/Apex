import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Leaderboard, PeriodSwitch } from '@/components/groups/Leaderboard';
import { BOARD_KINDS, TrailBoard, type BoardKind } from '@/components/groups/TrailBoard';
import { Eyebrow, Skeleton } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { Segmented } from '@/components/social/Segmented';
import { useColors } from '@/hooks/useColors';
import { useFriendBoard } from '@/hooks/useGroups';
import { periodLabel, type Period } from '@/lib/groupRules';
import { cardStyle, fonts } from '@/theme/tokens';

/** Social's friends board: your friends' top trails first, then who climbed the most. */
export function FriendsBoard() {
  const c = useColors();
  const router = useRouter();
  const [kind, setKind] = useState<BoardKind>('trails');
  const [period, setPeriod] = useState<Period>('week');
  const { board, loading, error, refetch } = useFriendBoard(period);
  const alone = !loading && !error && board.length <= 1;

  return (
    <View className="mx-4 mt-8" style={cardStyle(c)}>
      <Eyebrow>Friends</Eyebrow>
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18, marginTop: 6 }}>
        {kind === 'trails' ? 'Your friends’ top trails' : `Who climbed the most ${periodLabel(period)}`}
      </Text>
      <View className="mt-4">
        <Segmented options={BOARD_KINDS} value={kind} onChange={setKind} />
      </View>
      {kind === 'trails' ? (
        <View className="mt-3">
          <TrailBoard kind="friends" />
        </View>
      ) : (
        <>
          <View className="mt-3">
            <PeriodSwitch period={period} onChange={setPeriod} />
          </View>
          {error ? (
            <View className="mt-4 gap-2">
              <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
              <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
            </View>
          ) : null}
          {loading ? (
            <View className="mt-3">
              <Skeleton shape="row" count={3} />
            </View>
          ) : null}
          {alone ? (
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 14 }}>
              Add friends and their recorded climbs show up here next to yours.
            </Text>
          ) : null}
          {!alone && board.length > 0 ? (
            <View className="mt-3">
              <Leaderboard
                rows={board}
                title={null}
                onPressRow={(row) => router.push({ pathname: '/friend/[id]', params: { id: row.userId } })}
                footnote="Recorded hikes only. Weeks run Monday to Sunday."
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
