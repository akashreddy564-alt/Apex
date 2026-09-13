import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrailCard } from '@/components/trail/TrailCard';
import { useRankings } from '@/hooks/useRankings';

export default function RankingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { top10, leaderboard } = useRankings();

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="border-b border-zinc-800 px-4 pb-4 pt-2">
          <Text className="text-lg font-medium text-zinc-50">Personal ranking</Text>
          <Text className="mt-1 font-mono text-[11px] text-zinc-500">
            Elo + ordinal · top 10 highlighted
          </Text>
        </View>

        {leaderboard.length === 0 ? (
          <View className="px-4 py-16">
            <Text className="text-center text-sm text-zinc-400">
              No ranked trails yet.
            </Text>
            <Text className="mt-2 text-center font-mono text-[11px] text-zinc-600">
              Finish a hike in Log to start pairwise ranking.
            </Text>
          </View>
        ) : (
          <>
            <View className="border-b border-zinc-800 px-4 py-2">
              <Text className="font-mono text-[10px] uppercase tracking-widest text-accent">
                Top {Math.min(10, top10.length)}
              </Text>
            </View>
            {top10.map((entry) => (
              <TrailCard
                key={entry.trail.id}
                trail={entry.trail}
                rank={entry.ranking.ordinal_rank}
                onPress={() => router.push(`/trail/${entry.trail.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
