import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import type { Trail } from '@/types/trail';

interface TrailCardProps {
  trail: Trail;
  rank?: number | null;
  /** One-decimal 0–10 score, already formatted. */
  score?: string | null;
  onPress?: () => void;
}

export function TrailCard({ trail, rank, score, onPress }: TrailCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="active:bg-zinc-900/80 flex-row items-center gap-3 border-b border-zinc-800 px-4 py-3.5"
    >
      {rank != null ? (
        <Text
          className="w-8 text-[15px] text-zinc-500"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {rank}
        </Text>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-medium text-zinc-100">{trail.name}</Text>
        <Text className="font-mono text-[11px] text-zinc-500">
          {trail.region} · {formatOptionalDistance(trail.distance_km)} · ↑
          {formatOptionalElevation(trail.elevation_gain_m)}
        </Text>
      </View>
      {score ? (
        <Text
          className="text-[15px] text-zinc-100"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {score}
        </Text>
      ) : null}
      <ChevronRight size={16} strokeWidth={1.5} color="#52525B" />
    </Pressable>
  );
}
