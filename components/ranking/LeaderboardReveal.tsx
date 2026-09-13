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

import type { LeaderboardEntry } from '@/types/trail';

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

interface LeaderboardRevealProps {
  entries: LeaderboardEntry[];
  ordinalRank: number;
  onConfirm: () => void;
}

function Row({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const scale = useSharedValue(entry.isNew ? 0.92 : 1);

  useEffect(() => {
    if (entry.isNew) {
      scale.value = withDelay(120 + index * 40, withSpring(1, SPRING));
    }
  }, [entry.isNew, index, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45).springify().damping(20)}
      style={style}
      className={`flex-row items-center gap-3 border-b border-zinc-800 px-1 py-3 ${
        entry.isNew ? 'bg-accent-faint' : ''
      }`}
    >
      <Text
        className={`w-7 font-mono text-xs ${
          entry.isNew ? 'text-accent' : 'text-zinc-500'
        }`}
      >
        {(entry.ranking.ordinal_rank ?? index + 1).toString().padStart(2, '0')}
      </Text>
      <View className="flex-1">
        <Text
          className={`text-[14px] ${
            entry.isNew ? 'font-semibold text-zinc-50' : 'text-zinc-200'
          }`}
        >
          {entry.trail.name}
        </Text>
        <Text className="font-mono text-[10px] text-zinc-500">
          Elo {Math.round(entry.ranking.elo_rating)}
        </Text>
      </View>
      {entry.isNew ? (
        <Text className="font-mono text-[10px] uppercase tracking-widest text-accent">
          New
        </Text>
      ) : null}
    </Animated.View>
  );
}

export function LeaderboardReveal({
  entries,
  ordinalRank,
  onConfirm,
}: LeaderboardRevealProps) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View className="flex-1">
      <Text className="text-center text-[15px] text-zinc-200">
        Locked at #{ordinalRank}
      </Text>
      <Text className="mt-1 text-center font-mono text-[11px] text-zinc-500">
        Personal top {Math.min(10, entries.length)}
      </Text>

      <View className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 px-3">
        {entries.map((entry, index) => (
          <Row key={entry.trail.id} entry={entry} index={index} />
        ))}
      </View>

      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onConfirm();
        }}
        className="mt-8 items-center border border-accent bg-accent/15 py-3 active:bg-accent/25"
        style={{ borderRadius: 12 }}
      >
        <Text className="font-mono text-sm text-accent">Confirm ranking</Text>
      </Pressable>
    </View>
  );
}
