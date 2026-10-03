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
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { displayM, numericStyle } from '@/theme/tokens';

const ENTRANCE = { damping: 20, stiffness: 240, mass: 0.85 };

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trail = useTrailCache((s) => s.getTrail(String(id)));
  const ranking = useRankingStore((s) => s.getRanking(String(id)));

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
        <View>
          <Text style={displayM} numberOfLines={2}>
            {trail.name}
          </Text>
          <Text className="mt-1 font-ui text-caption text-fg-2">{trail.region}</Text>
          {ranking?.ordinal_rank != null ? (
            <Text className="mt-3 text-caption text-sage" style={numericStyle()}>
              Personal rank #{ranking.ordinal_rank} · Elo{' '}
              {Math.round(ranking.elo_rating)}
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

        <View className="rounded-xl border border-border bg-surface p-3">
          <Text className="font-ui text-caption uppercase tracking-widest text-fg-muted">
            Path
          </Text>
          <Text className="mt-2 text-caption text-fg-2" style={numericStyle()}>
            GeoJSON LineString · {trail.path.coordinates.length} vertices · PostGIS
            geography ready
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
