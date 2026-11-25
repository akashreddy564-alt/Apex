import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, Skeleton } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useTrailOwnerLabels } from '@/hooks/useTrailOwnerLabel';
import { TrailCoverCard } from '@/components/trail/TrailCoverCard';
import { CATALOG_CREDIT, isCatalogTrail } from '@/lib/catalog';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { trailCover } from '@/lib/trailCover';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { displayXL } from '@/theme/tokens';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

/** True once the saved trails (yours and the catalog) have been read from disk. */
function useTrailsReady(): boolean {
  const persist = useTrailCache.persist;
  const [ready, setReady] = useState(() => persist?.hasHydrated?.() ?? true);
  useEffect(() => {
    if (ready || !persist) return;
    if (persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return persist.onFinishHydration(() => setReady(true));
  }, [persist, ready]);
  return ready;
}

export default function TrailsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const ownerLabel = useTrailOwnerLabels();
  const rankings = useRankingStore((s) => s.rankings);
  const logs = useTrailCache((s) => s.logs);
  const ready = useTrailsReady();

  return (
    <View className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="border-b border-raised px-4 pb-4 pt-2">
          <Text style={{ ...displayXL, color: c.fg }}>Trails</Text>
        </View>

        <View className="flex-row border-b border-raised px-4 py-2">
          <Eyebrow>{ready ? `${trails.length} trails · ${rankings.length} ranked` : 'Loading trails'}</Eyebrow>
        </View>

        <View style={{ gap: 12, paddingHorizontal: 14, paddingTop: 14 }}>
          {!ready ? <Skeleton shape="card" count={3} /> : null}
          {(ready ? trails : []).map((trail, index) => {
            const placement = describePlacement(rankings, trail.id);
            return (
              <TrailCoverCard
                key={trail.id}
                trail={trail}
                index={index}
                addedBy={ownerLabel(trail)}
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
          <Text className="px-4 pt-5 font-ui text-[11px] text-fg-faint">{CATALOG_CREDIT}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
