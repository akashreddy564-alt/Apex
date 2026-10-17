import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ElevationSparkline } from '@/components/trail/ElevationSparkline';
import { TrailStats } from '@/components/trail/TrailStats';
import { TrailHero, heroHeight } from '@/components/trail/TrailHero';
import { TrailMap } from '@/components/trail/TrailMap';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { trailCover } from '@/lib/trailCover';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { colors, fonts } from '@/theme/tokens';

const ENTRANCE = { damping: 20, stiffness: 240, mass: 0.85 };
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

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
  const logs = useTrailCache((s) => s.logs);
  const rankings = useRankingStore((s) => s.rankings);
  const placement = describePlacement(rankings, String(id));
  const { width, height: windowHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

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

  const cover = trailCover(trail.id, recorded ?? trail.path, logs, MAPBOX_TOKEN, {
    width: Math.min(640, Math.round(width)),
    height: Math.min(640, heroHeight(windowHeight)),
  });

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <TrailHero
        name={trail.name}
        region={trail.region}
        cover={cover}
        placementLabel={
          placement
            ? placementScoreLabel(
                placement.ranking.bucket,
                placement.count,
                placement.score,
                placement.ordinal,
              )
            : null
        }
        top={placement?.ordinal === 1 && placement.ranking.bucket === 'loved'}
        scrollY={scrollY}
      />

      <Animated.View style={[entranceStyle, { gap: 22, paddingHorizontal: 16, paddingTop: 18 }]}>
        <TrailStats
          trailId={trail.id}
          telemetry={{
            peak_elevation_m: trail.peak_elevation_m,
            elevation_gain_m: trail.elevation_gain_m,
            distance_km: trail.distance_km,
            avg_moving_time_seconds: trail.avg_moving_time_seconds,
          }}
        />

        <ElevationSparkline trailId={trail.id} samples={trail.elevation_profile} />

        <TrailMap canonical={trail.path} recorded={recorded} />

        {placement ? null : (
          <Text style={{ color: colors.fgFaint, fontFamily: fonts.ui, fontSize: 13 }}>
            Log this trail to place it in your rankings.
          </Text>
        )}
      </Animated.View>
    </Animated.ScrollView>
  );
}
