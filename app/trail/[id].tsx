import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DifficultyCard } from '@/components/craft/DifficultyCard';
import { ElevationScrubber } from '@/components/craft/ElevationScrubber';
import { RouteTracer } from '@/components/craft/RouteTracer';
import { Eyebrow, SlideToStart } from '@/components/motion';
import { TrailStats } from '@/components/trail/TrailStats';
import { TrailHero, heroHeight } from '@/components/trail/TrailHero';
import { TrailMap } from '@/components/trail/TrailMap';
import { trailNotes } from '@/data/trailNotes';
import { useColors } from '@/hooks/useColors';
import { useTrailTracker } from '@/hooks/useTrailTracker';
import { CATALOG_CREDIT, isCatalogTrail } from '@/lib/catalog';
import { formatDistance } from '@/lib/format';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { trailCover } from '@/lib/trailCover';
import { useRankingStore } from '@/stores/rankingStore';
import { usePendingStart } from '@/stores/pendingStart';
import { useTrailCache } from '@/stores/trailCache';
import { fonts } from '@/theme/tokens';

const ENTRANCE = { damping: 20, stiffness: 240, mass: 0.85 };
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
/** SlideToStart's track height. */
const SLIDER_H = 62;
const SLIDER_GAP = 16;

export default function TrailDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tracker = useTrailTracker();
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
  // The scrubber writes the route fraction here on the UI thread; the tracer reads it.
  const along = useSharedValue(0);

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

  const notes = trailNotes(trail.id);
  const cover = trailCover(trail.id, recorded ?? trail.path, logs, MAPBOX_TOKEN, {
    width: Math.min(640, Math.round(width)),
    height: Math.min(640, heroHeight(windowHeight)),
  });
  const sliderBottom = insets.bottom + SLIDER_GAP;
  const showSlider = !tracker.isTracking;
  const routeHeading =
    trail.distance_km != null
      ? `${formatDistance(trail.distance_km)}${trail.shape === 'out-and-back' ? ' round trip' : ''}`
      : null;
  const hasRoute = (trail.path?.coordinates?.length ?? 0) >= 2;
  const card = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.raised,
    borderRadius: 22,
    padding: 16,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{
          paddingBottom: showSlider ? sliderBottom + SLIDER_H + 24 : insets.bottom + 40,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <TrailHero
          trailId={trail.id}
          name={trail.name}
          region={trail.region}
          shape={trail.shape}
          flags={notes.flags}
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

        <Animated.View style={[entranceStyle, { gap: 12, paddingHorizontal: 16, paddingTop: 14 }]}>
          <ElevationScrubber profile={trail.elevation_profile} shape={trail.shape} progress={along} />

          {hasRoute || routeHeading || notes.route ? (
            <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              {hasRoute ? <RouteTracer path={trail.path} fraction={along} /> : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Eyebrow>Route</Eyebrow>
                {routeHeading ? (
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 'normal',
                      fontSize: 22,
                      lineHeight: 23,
                      letterSpacing: -0.33,
                      color: c.fg,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {routeHeading}
                  </Text>
                ) : null}
                {notes.route ? (
                  <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fgMuted }}>
                    {notes.route}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <TrailMap canonical={trail.path} recorded={recorded} />

          {isCatalogTrail(trail) ? (
            <Text style={{ marginTop: -4, color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11 }}>
              {CATALOG_CREDIT}
            </Text>
          ) : null}

          <DifficultyCard trail={trail} />

          <View style={{ marginTop: 10 }}>
            <TrailStats
              trailId={trail.id}
              showDifficulty={false}
              telemetry={{
                peak_elevation_m: trail.peak_elevation_m,
                elevation_gain_m: trail.elevation_gain_m,
                distance_km: trail.distance_km,
                avg_moving_time_seconds: trail.avg_moving_time_seconds,
              }}
            />
          </View>

          {placement ? null : (
            <Text style={{ marginTop: 10, color: c.fgFaint, fontFamily: fonts.ui, fontSize: 13 }}>
              Log this trail to place it in your rankings.
            </Text>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {showSlider ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: sliderBottom }}>
          <SlideToStart
            label="Slide to start this hike"
            a11yLabel="Start this hike"
            onComplete={() => {
              usePendingStart.getState().request(trail.id);
              router.push('/log');
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
