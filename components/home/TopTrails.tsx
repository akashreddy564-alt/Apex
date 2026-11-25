import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScoreBadge } from '@/components/score/ScoreBadge';
import { useColors } from '@/hooks/useColors';
import { fetchCatalogTrails } from '@/lib/catalogRemote';
import { topTrails } from '@/lib/homeDashboard';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { cardStyle, fonts } from '@/theme/tokens';

const SLOTS = 3;

/**
 * Your best three ranked trails, Beli style, with "All N" to Rankings.
 * Empty places stay as dashed #n slots, so a new hiker sees where their
 * rankings will land. A ranked trail the phone hasn't fetched yet loads.
 */
export function TopTrails() {
  const c = useColors();
  const router = useRouter();
  const all = useRankingStore((s) => s.rankings);
  const trails = useTrailCache((s) => s.trails);
  const rankings = useMemo(() => all.filter((row) => row.hike_type === DEFAULT_HIKE_TYPE), [all]);
  const top = useMemo(() => topTrails(rankings, SLOTS), [rankings]);
  const byId = useMemo(() => new Map(trails.map((t) => [t.id, t])), [trails]);

  const missing = top.map((row) => row.trail_id).filter((id) => !byId.has(id));
  const missingKey = missing.join(',');
  useEffect(() => {
    if (missingKey) void fetchCatalogTrails(missingKey.split(','));
  }, [missingKey]);

  const inBucket = (bucket: string) => rankings.filter((row) => row.bucket === bucket).length;
  const slots = Array.from({ length: SLOTS - top.length }, (_, i) => top.length + i + 1);

  return (
    <View style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }} accessibilityRole="header">
          Your top trails
        </Text>
        {rankings.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`All ${rankings.length} ranked trails`}
            onPress={() => router.push('/rankings')}
            hitSlop={10}
          >
            <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>All {rankings.length}</Text>
          </Pressable>
        ) : null}
      </View>
      {top.length === 0 ? (
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
          Rank your first hike and it lands here
        </Text>
      ) : null}

      {top.map((row, index) => {
        const trail = byId.get(row.trail_id);
        return (
          <Pressable
            key={row.trail_id}
            accessibilityRole="button"
            accessibilityLabel={`Number ${index + 1}, ${trail?.name ?? 'loading trail'}`}
            disabled={!trail}
            onPress={() => router.push(`/trail/${row.trail_id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: index === top.length - 1 && slots.length === 0 ? 0 : 1,
                borderBottomColor: c.raised,
              }}
            >
              <Text style={{ width: 28, color: c.fg, fontFamily: fonts.poster, fontSize: 18, lineHeight: 28, marginVertical: -4 }}>
                {index + 1}
              </Text>
              <Text style={{ flex: 1, color: trail ? c.fg : c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }} numberOfLines={1}>
                {trail?.name ?? 'Loading trail'}
              </Text>
              <ScoreBadge bucket={row.bucket} count={inBucket(row.bucket)} score={row.score} size="sm" />
            </View>
          </Pressable>
        );
      })}

      {slots.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {slots.map((n) => (
            <View
              key={n}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.border,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: c.fgMuted, fontFamily: fonts.poster, fontSize: 16, lineHeight: 25, marginVertical: -3 }}>#{n}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
