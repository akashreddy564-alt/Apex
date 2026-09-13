import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrailCard } from '@/components/trail/TrailCard';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';

export default function TrailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const rankings = useRankingStore((s) => s.rankings);

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="border-b border-zinc-800 px-4 pb-4 pt-2">
          <Text className="text-2xl font-semibold tracking-tight text-zinc-50">
            Apex
          </Text>
          <Text className="mt-1 max-w-[28rem] text-[13px] leading-5 text-zinc-400">
            Rank trails like a comparison engine. Log like telemetry. No feed
            noise.
          </Text>
        </View>

        <View className="flex-row border-b border-zinc-800 px-4 py-2">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {trails.length} trails · {rankings.length} ranked
          </Text>
        </View>

        {trails.map((trail) => {
          const rank = rankings.find((r) => r.trail_id === trail.id)?.ordinal_rank;
          return (
            <TrailCard
              key={trail.id}
              trail={trail}
              rank={rank}
              onPress={() => router.push(`/trail/${trail.id}`)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
