import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrailCoverCard } from '@/components/trail/TrailCoverCard';
import { CATALOG_CREDIT, isCatalogTrail } from '@/lib/catalog';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { trailCover } from '@/lib/trailCover';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { displayXL } from '@/theme/tokens';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export default function TrailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const rankings = useRankingStore((s) => s.rankings);
  const logs = useTrailCache((s) => s.logs);

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="border-b border-zinc-800 px-4 pb-4 pt-2">
          <Text style={displayXL}>Trails</Text>
        </View>

        <View className="flex-row border-b border-zinc-800 px-4 py-2">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {trails.length} trails · {rankings.length} ranked
          </Text>
        </View>

        <View style={{ gap: 12, paddingHorizontal: 14, paddingTop: 14 }}>
          {trails.map((trail, index) => {
            const placement = describePlacement(rankings, trail.id);
            return (
              <TrailCoverCard
                key={trail.id}
                trail={trail}
                index={index}
                cover={trailCover(trail.id, trail.path, logs, MAPBOX_TOKEN)}
                top={placement?.ordinal === 1 && placement.ranking.bucket === 'loved'}
                score={
                  placement
                    ? placementScoreLabel(
                        placement.ranking.bucket,
                        placement.count,
                        placement.score,
                      )
                    : null
                }
                onPress={() => router.push(`/trail/${trail.id}`)}
              />
            );
          })}
        </View>
        {trails.some(isCatalogTrail) ? (
          <Text className="px-4 pt-5 font-ui text-[11px] text-zinc-600">{CATALOG_CREDIT}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
