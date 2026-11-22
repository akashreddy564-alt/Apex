import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';
import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import type { Trail } from '@/types/trail';

interface TrailCardProps {
  trail: Trail;
  rank?: number | null;
  /** The rank number's color, e.g. its Rankings bucket. */
  rankColor?: string;
  /** One-decimal 0–10 score, already formatted. */
  score?: string | null;
  /** Replaces the plain score, e.g. a ScoreBadge. */
  trailing?: ReactNode;
  /** One short reason under the meta, e.g. "Above Mission Peak". Hidden when null. */
  reason?: string | null;
  onPress?: () => void;
}

export function TrailCard({ trail, rank, rankColor, score, trailing, reason, onPress }: TrailCardProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      className="active:bg-surface/80 flex-row items-center gap-3 border-b border-raised px-4 py-3.5"
    >
      {rank != null ? (
        <Text
          className="w-8 text-[15px] text-fg-faint"
          style={{ fontVariant: ['tabular-nums'], ...(rankColor ? { color: rankColor, fontFamily: fonts.uiSemibold } : null) }}
        >
          {rank}
        </Text>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-medium text-fg">{trail.name}</Text>
        <Text className="font-mono text-[11px] text-fg-faint">
          {trail.region} · <Text style={{ color: c.distance }}>{formatOptionalDistance(trail.distance_km)}</Text> ·{' '}
          <Text style={{ color: c.climb }}>↑{formatOptionalElevation(trail.elevation_gain_m)}</Text>
        </Text>
        {reason ? (
          <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fg2 }}>
            {reason}
          </Text>
        ) : null}
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
