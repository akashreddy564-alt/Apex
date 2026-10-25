import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import type { Trail } from '@/types/trail';

interface TrailCardProps {
  trail: Trail;
  rank?: number | null;
  /** One-decimal 0–10 score, already formatted. */
  score?: string | null;
  /** Replaces the plain score, e.g. a ScoreBadge. */
  trailing?: ReactNode;
  onPress?: () => void;
}

export function TrailCard({ trail, rank, score, trailing, onPress }: TrailCardProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      className="active:bg-surface/80 flex-row items-center gap-3 border-b border-raised px-4 py-3.5"
    >
      {rank != null ? (
        <Text
          className="w-8 text-[15px] text-fg-faint"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {rank}
        </Text>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-medium text-fg">{trail.name}</Text>
        <Text className="font-mono text-[11px] text-fg-faint">
          {trail.region} · {formatOptionalDistance(trail.distance_km)} · ↑
          {formatOptionalElevation(trail.elevation_gain_m)}
        </Text>
      </View>
      {trailing ?? null}
      {!trailing && score ? (
        <Text
          className="text-[15px] text-fg"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {score}
        </Text>
      ) : null}
      <ChevronRight size={16} strokeWidth={1.5} color={c.borderStrong} />
    </Pressable>
  );
}
