import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { useTrailBoard } from '@/hooks/useRankLists';
import { formatRankScore } from '@/lib/ranking';
import type { TrailBoardKind } from '@/lib/rankLists';
import { fonts, numericStyle } from '@/theme/tokens';

const EMPTY: Record<TrailBoardKind, string> = {
  friends: 'Top trails show up once two of you have ranked the same one.',
  group: 'Top trails show up once three other members have ranked the same one.',
  org: 'Top trails show up once three other members have ranked the same one.',
};

const FOOTNOTE: Record<TrailBoardKind, string> = {
  friends: 'Average score from everyone who ranked it. A trail needs two of you.',
  group: 'Average score, no names. A trail needs three members besides you.',
  org: 'Average score, no names. A trail needs three members besides you.',
};

/** Trails ranked by the average score of a circle: friends, a group, or a school or company. */
export function TrailBoard({ kind, id }: { kind: TrailBoardKind; id?: string }) {
  const c = useColors();
  const router = useRouter();
  const { data, loading, error, refetch } = useTrailBoard(kind, id);

  if (loading) return <Skeleton shape="row" count={4} />;
  if (error) {
    return (
      <View className="gap-2">
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
        <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
      </View>
    );
  }
  if (data.length === 0) {
    return <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>{EMPTY[kind]}</Text>;
  }
  return (
    <View>
      {data.map((row, index) => (
        <Pressable
          key={row.trailId}
          accessibilityRole="button"
          accessibilityLabel={`Number ${row.place}, ${row.name}, average ${formatRankScore(row.avgScore)} from ${row.rankers}`}
          onPress={() => router.push({ pathname: '/trail/[id]', params: { id: row.trailId } })}
          className={`flex-row items-center gap-3 py-3 active:opacity-70 ${index === 0 ? '' : 'border-t border-raised'}`}
        >
          <Text
            style={{
              fontFamily: fonts.displayExtraBold,
              fontSize: row.place <= 3 ? 26 : 20,
              color: row.place <= 3 ? c.accent : c.fgMuted,
              width: 34,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
            }}
          >
            {row.place}
          </Text>
          <View className="flex-1">
            <Text numberOfLines={1} style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>{row.name}</Text>
            <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12, marginTop: 1 }}>
              {[row.region, `${row.rankers} ranked`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={{ ...numericStyle('semibold'), color: c.fg, fontSize: 17 }}>{formatRankScore(row.avgScore)}</Text>
        </Pressable>
      ))}
      <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11, marginTop: 10 }}>{FOOTNOTE[kind]}</Text>
    </View>
  );
}

export const BOARD_KINDS = [
  { value: 'trails', label: 'Top trails' },
  { value: 'climb', label: 'Climb' },
] as const;
export type BoardKind = (typeof BOARD_KINDS)[number]['value'];
