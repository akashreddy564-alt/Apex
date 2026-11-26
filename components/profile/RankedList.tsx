import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { RouteThumb } from '@/components/ranking/RouteFigure';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { useColors } from '@/hooks/useColors';
import { useMyRank } from '@/hooks/useMyListOrder';
import { formatRankScore, type Bucket } from '@/lib/ranking';
import { possessive, splitTopTen, type RankedRow } from '@/lib/rankListRules';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

const THUMB = 56;

/** "You: #5" when you've ranked it too, "Not hiked yet" when you haven't. Nothing on your own list. */
function useMarker(self: boolean) {
  const rankOf = useMyRank();
  return (row: RankedRow): string | null => {
    if (self || !row.trailId) return null;
    const rank = rankOf(row.trailId);
    return rank == null ? 'Not hiked yet' : `You: #${rank}`;
  };
}

function useOpen() {
  const router = useRouter();
  return (row: RankedRow) => {
    if (row.trailId) router.push({ pathname: '/trail/[id]', params: { id: row.trailId } });
  };
}

function Thumb({ row }: { row: RankedRow }) {
  const c = useColors();
  if (!row.trailId) {
    return (
      <View style={{ width: THUMB, height: THUMB, borderRadius: 14, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={18} strokeWidth={1.6} color={c.fgMuted} />
      </View>
    );
  }
  if (row.route.length < 2) {
    return <View style={{ width: THUMB, height: THUMB, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border }} />;
  }
  return (
    <View style={{ width: THUMB, height: THUMB, borderRadius: 14, backgroundColor: c.bg, overflow: 'hidden' }}>
      <RouteThumb shape={{ origin: 'trail', coordinates: row.route, credit: null, elevation: null }} size={THUMB} />
    </View>
  );
}

/**
 * Someone's ranked list: the top ten in its own card with big numerals and
 * routes, then the rest of the list as compact rows from #11.
 */
export function RankedList({
  rows,
  firstName,
  self,
}: {
  rows: RankedRow[];
  firstName: string;
  self: boolean;
}) {
  const c = useColors();
  const open = useOpen();
  const marker = useMarker(self);
  const { top, rest } = splitTopTen(rows);
  const bucketSizes = useMemo(() => {
    const sizes: Record<Bucket, number> = { loved: 0, fine: 0, disliked: 0 };
    for (const row of rows) sizes[row.bucket] += 1;
    return sizes;
  }, [rows]);
  const owner = self ? 'Your' : possessive(firstName);

  return (
    <View className="self-stretch">
      <View style={cardStyle(c)} accessibilityLabel={`${owner} top ${top.length}`}>
        <Eyebrow>{top.length >= 10 ? 'Top 10' : `Top ${top.length}`}</Eyebrow>
        <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 22, marginTop: 4 }}>
          {owner} best trails
        </Text>
        {top.map((row, index) => {
          const note = marker(row);
          return (
            <Pressable
              key={`${row.rank}`}
              accessibilityRole={row.trailId ? 'button' : undefined}
              accessibilityLabel={`Number ${row.rank}, ${row.name}, ${formatRankScore(row.score)}${note ? `, ${note}` : ''}`}
              disabled={!row.trailId}
              onPress={() => open(row)}
              className={`flex-row items-center gap-3 active:opacity-70 ${index === 0 ? 'mt-4' : 'mt-3 border-t border-raised pt-3'}`}
            >
              <Text
                style={{
                  fontFamily: fonts.displayExtraBold,
                  fontSize: row.rank === 1 ? 40 : 32,
                  lineHeight: row.rank === 1 ? 46 : 38,
                  color: row.rank <= 3 ? c.accent : c.fg,
                  width: 46,
                  textAlign: 'center',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {row.rank}
              </Text>
              <Thumb row={row} />
              <View className="flex-1">
                <Text numberOfLines={2} style={{ color: row.trailId ? c.fg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                  {row.name}
                </Text>
                {row.region ? (
                  <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 1 }}>
                    {row.region}
                  </Text>
                ) : null}
                {note ? (
                  <Text style={{ color: note.startsWith('You') ? c.accent : c.fg2, fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 3 }}>
                    {note}
                  </Text>
                ) : null}
              </View>
              <ScoreBadge bucket={row.bucket} count={bucketSizes[row.bucket]} score={row.score} size="sm" />
            </Pressable>
          );
        })}
        {top.some((row) => row.route.length >= 2) ? (
          <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11, marginTop: 14 }}>
            Trail lines © OpenStreetMap contributors
          </Text>
        ) : null}
      </View>

      {rest.length > 0 ? (
        <View className="mt-7">
          <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>The rest of the list</Text>
          {rest.map((row) => {
            const note = marker(row);
            return (
              <Pressable
                key={`${row.rank}`}
                accessibilityRole={row.trailId ? 'button' : undefined}
                accessibilityLabel={`Number ${row.rank}, ${row.name}${note ? `, ${note}` : ''}`}
                disabled={!row.trailId}
                onPress={() => open(row)}
                className="mt-1 flex-row items-center gap-3 border-b border-raised py-3 active:opacity-70"
              >
                <Text style={{ ...numericStyle('semibold'), color: c.fgMuted, fontSize: 14, width: 34 }}>#{row.rank}</Text>
                <View className="flex-1">
                  <Text numberOfLines={1} style={{ color: row.trailId ? c.fg : c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>
                    {row.name}
                  </Text>
                  {row.region || note ? (
                    <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12, marginTop: 1 }}>
                      {[row.region, note].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ ...numericStyle('semibold'), color: c.fg2, fontSize: 14 }}>{formatRankScore(row.score)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
