import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ElevationSparkline } from '@/components/trail/ElevationSparkline';
import { TelemetryRow } from '@/components/trail/TelemetryRow';
import { TrailMap } from '@/components/trail/TrailMap';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { displayM, numericStyle } from '@/theme/tokens';

const ENTRANCE = { damping: 20, stiffness: 240, mass: 0.85 };

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trail = useTrailCache((s) => s.getTrail(String(id)));
  const recorded = useTrailCache((s) => {
    let best: (typeof s.logs)[number] | null = null;
    let bestTime = Number.NEGATIVE_INFINITY;
    for (const entry of s.logs) {
      if (entry.trail_id !== String(id) || !entry.recorded_path) continue;
      const time = Date.parse(entry.created_at);
      const stamp = Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
      if (!best || stamp >= bestTime) {
        best = entry;
        bestTime = stamp;
      }
    }
    return best?.recorded_path ?? null;
  });
  const rankings = useRankingStore((s) => s.rankings);
  const placement = describePlacement(rankings, String(id));

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withSpring(1, ENTRANCE);
  }, [id, progress]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!trail) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="font-ui text-caption text-fg-faint">Trail not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16 }}>
      <Animated.View style={entranceStyle} className="gap-5">
        <TrailMap canonical={trail.path} recorded={recorded} />
        <View>
          <Text style={displayM} numberOfLines={2}>
            {trail.name}
          </Text>
          <Text className="mt-1 font-ui text-caption text-fg-2">{trail.region}</Text>
          {placement ? (
            <Text className="mt-3 text-caption text-fg-2" style={numericStyle()}>
              {placementScoreLabel(
                placement.ranking.bucket,
                placement.count,
                placement.score,
                placement.ordinal,
              )}
            </Text>
          ) : (
            <Text className="mt-3 font-ui text-caption text-fg-faint">
              Unranked — log this trail to place it
            </Text>
          )}
        </View>

        <TelemetryRow
          trailId={trail.id}
          telemetry={{
            peak_elevation_m: trail.peak_elevation_m,
            elevation_gain_m: trail.elevation_gain_m,
            distance_km: trail.distance_km,
            avg_moving_time_seconds: trail.avg_moving_time_seconds,
          }}
        />

        <ElevationSparkline
          trailId={trail.id}
          samples={trail.elevation_profile}
        />
      </Animated.View>
    </ScrollView>
  );
}
