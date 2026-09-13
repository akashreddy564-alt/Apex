import { useLocalSearchParams, useNavigation } from 'expo-router';
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

const ENTRANCE = { damping: 20, stiffness: 240, mass: 0.85 };

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const trail = useTrailCache((s) => s.getTrail(String(id)));
  const ranking = useRankingStore((s) => s.getRanking(String(id)));

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withSpring(1, ENTRANCE);
  }, [id, progress]);

  useEffect(() => {
    if (trail) {
      navigation.setOptions({ title: trail.name });
    }
  }, [navigation, trail]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!trail) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="font-mono text-xs text-zinc-500">Trail not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ padding: 16 }}>
      <Animated.View style={entranceStyle} className="gap-5">
        <View>
          <Text className="text-xl font-medium text-zinc-50">{trail.name}</Text>
          <Text className="mt-1 font-mono text-xs text-zinc-500">{trail.region}</Text>
          {ranking?.ordinal_rank != null ? (
            <Text className="mt-3 font-mono text-[11px] text-accent">
              Personal rank #{ranking.ordinal_rank} · Elo{' '}
              {Math.round(ranking.elo_rating)}
            </Text>
          ) : (
            <Text className="mt-3 font-mono text-[11px] text-zinc-600">
              Unranked — log this trail to place it
            </Text>
          )}
        </View>

        <TelemetryRow
          telemetry={{
            peak_elevation_m: trail.peak_elevation_m,
            elevation_gain_m: trail.elevation_gain_m,
            distance_km: trail.distance_km,
            avg_moving_time_seconds: trail.avg_moving_time_seconds,
          }}
        />

        <ElevationSparkline samples={trail.elevation_profile} />

        <View
          className="border border-zinc-800 bg-zinc-900 p-3"
          style={{ borderRadius: 12 }}
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Path
          </Text>
          <Text className="mt-2 font-mono text-[11px] leading-5 text-zinc-400">
            GeoJSON LineString · {trail.path.coordinates.length} vertices · PostGIS
            geography ready
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
