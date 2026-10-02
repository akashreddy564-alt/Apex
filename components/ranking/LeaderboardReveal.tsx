import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { BUCKET_BANDS, placementScoreLabel, type Bucket } from '@/lib/ranking';
import type { LeaderboardEntry } from '@/types/trail';

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

interface LeaderboardRevealProps {
  entries: LeaderboardEntry[];
  ordinalRank: number;
  score: number;
  /** Full bucket size, including rows that are not on screen. */
  count: number;
  bucket: Bucket;
  onUndo: () => void;
  onPlace: () => void;
}

function Row({
  entry,
  index,
  count,
}: {
  entry: LeaderboardEntry;
  index: number;
  count: number;
}) {
  const scale = useSharedValue(entry.isNew ? 0.96 : 1);

  useEffect(() => {
    if (entry.isNew) {
      scale.value = withDelay(80, withSpring(1, SPRING));
    }
  }, [entry.isNew, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).springify().damping(20)}
      style={style}
      className={`flex-row items-center gap-3 border-b border-zinc-800 px-1 py-3 ${
        entry.isNew ? 'bg-accent-faint' : ''
      }`}
    >
      <Text
        className={`w-8 text-[15px] ${entry.isNew ? 'text-accent' : 'text-zinc-500'}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {entry.ordinal}
      </Text>
      <Text
        className={`flex-1 text-[15px] ${
          entry.isNew ? 'font-medium text-zinc-50' : 'text-zinc-200'
        }`}
        numberOfLines={1}
      >
        {entry.trail.name}
      </Text>
      <Text
        className="text-[15px] text-zinc-100"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {placementScoreLabel(entry.ranking.bucket, count, entry.score)}
      </Text>
    </Animated.View>
  );
}

export function LeaderboardReveal({
  entries,
  ordinalRank,
  score,
  bucket,
  count,
  onUndo,
  onPlace,
}: LeaderboardRevealProps) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const label = BUCKET_BANDS[bucket].label;

  return (
    <View className="flex-1">
      <Text
        className="text-center text-[34px] text-zinc-50"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {placementScoreLabel(bucket, count, score)}
      </Text>
      <Text className="mt-1 text-center text-[15px] text-zinc-200">
        #{ordinalRank} in {label} · {placementScoreLabel(bucket, count, score)}
      </Text>

      <View className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 px-3">
        {entries.map((entry, index) => (
          <Row key={entry.trail.id} entry={entry} index={index} count={count} />
        ))}
      </View>

      <View className="mt-8 flex-row gap-2">
        <Pressable
          onPress={onUndo}
          className="flex-1 items-center border border-zinc-800 py-3 active:bg-zinc-900"
          style={{ borderRadius: 12 }}
        >
          <Text className="text-[15px] text-zinc-300">Undo</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onPlace();
          }}
          className="flex-1 items-center border border-accent bg-accent/15 py-3 active:bg-accent/25"
          style={{ borderRadius: 12 }}
        >
          <Text className="text-[15px] text-accent">Place</Text>
        </Pressable>
      </View>
    </View>
  );
}
