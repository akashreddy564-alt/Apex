import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrailCard } from '@/components/trail/TrailCard';
import { useRankings } from '@/hooks/useRankings';
import { formatRankScore } from '@/lib/ranking';
import { displayM } from '@/theme/tokens';

export default function RankingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sections } = useRankings();

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="border-b border-zinc-800 px-4 pb-4 pt-2">
          <Text style={displayM}>Personal ranking</Text>
        </View>

        {sections.length === 0 ? (
          <View className="px-4 py-16">
            <Text className="text-center text-[15px] text-zinc-300">No ranked hikes yet.</Text>
            <Text className="mt-2 text-center text-[13px] text-zinc-400">
              Finish a hike in Log to place it.
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.bucket}>
              <View className="border-b border-zinc-800 px-4 py-3">
                <Text className="text-[15px] text-zinc-200">
                  {section.label} · {section.entries.length}
                </Text>
              </View>
              {section.entries.map((entry) => (
                <TrailCard
                  key={entry.trail.id}
                  trail={entry.trail}
                  rank={entry.ordinal}
                  score={formatRankScore(entry.score)}
                  onPress={() => router.push(`/trail/${entry.trail.id}`)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
