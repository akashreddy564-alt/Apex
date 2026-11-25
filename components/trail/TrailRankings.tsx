import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScoreBadge } from '@/components/score/ScoreBadge';
import { useColors } from '@/hooks/useColors';
import { useTrailPeopleRankings, type PersonRanking } from '@/hooks/useFollows';
import { difficultyLabel, mostCommonDifficulty } from '@/lib/difficulty';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { cardStyle, fonts } from '@/theme/tokens';

const BUCKET_LABEL = { loved: 'Loved', fine: 'Fine', disliked: 'Didn’t like' } as const;

function Row({
  name,
  tag,
  bucket,
  score,
  count,
  difficulty,
  onPress,
}: {
  name: string;
  tag: string | null;
  bucket: PersonRanking['bucket'];
  score: number;
  count: number;
  difficulty: number | null;
  onPress?: () => void;
}) {
  const c = useColors();
  const rating = difficultyLabel(difficulty);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}, ${BUCKET_LABEL[bucket]}, ${score.toFixed(2)}${rating ? `, rated ${rating}` : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.raised }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: c.climb, fontFamily: fonts.uiSemibold, fontSize: 12 }}>{name.replace(/^@/, '').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 14 }} numberOfLines={1}>
            {name}
            {tag ? <Text style={{ color: c.fgMuted, fontFamily: fonts.ui }}>{`  ${tag}`}</Text> : null}
          </Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {BUCKET_LABEL[bucket]}
            {rating ? ` · ${rating}` : ''}
          </Text>
        </View>
        <ScoreBadge bucket={bucket} count={count} score={score} size="sm" />
      </View>
    </Pressable>
  );
}

/**
 * Who ranked this trail: you first, then friends and people you follow, each
 * with their score, bucket and difficulty rating, and the rating most of them
 * gave. Nothing shows until someone (you included) has ranked it.
 */
export function TrailRankings({ trailId }: { trailId: string }) {
  const c = useColors();
  const router = useRouter();
  const { people } = useTrailPeopleRankings(trailId);
  const all = useRankingStore((s) => s.rankings);
  const mine = useMemo(
    () => all.find((row) => row.trail_id === trailId && row.hike_type === DEFAULT_HIKE_TYPE) ?? null,
    [all, trailId],
  );
  const inBucket = (bucket: string) => all.filter((row) => row.bucket === bucket && row.hike_type === DEFAULT_HIKE_TYPE).length;

  const consensus = mostCommonDifficulty(people.map((p) => p.difficulty));
  if (!mine && people.length === 0) return null;

  return (
    <View style={[cardStyle(c), { marginTop: 12 }]}>
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }} accessibilityRole="header">
        Rankings
      </Text>
      {consensus != null ? (
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
          {people.length === 1 ? 'Rated' : 'Most rate it'} {difficultyLabel(consensus)}
        </Text>
      ) : null}
      <View style={{ marginTop: 8 }}>
        {mine ? (
          <Row name="You" tag={null} bucket={mine.bucket} score={mine.score} count={inBucket(mine.bucket)} difficulty={mine.difficulty ?? null} />
        ) : null}
        {people.map((person) => (
          <Row
            key={person.personId}
            name={person.displayName || `@${person.username}`}
            tag={person.isFriend ? 'Friend' : 'Following'}
            bucket={person.bucket}
            score={person.score}
            count={3}
            difficulty={person.difficulty}
            onPress={() => router.push({ pathname: '/friend/[id]', params: { id: person.personId } })}
          />
        ))}
      </View>
    </View>
  );
}
