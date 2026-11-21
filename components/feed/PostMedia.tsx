import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Polyline, Svg } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { usePhotoUri } from '@/hooks/usePhotoUri';
import { projectPoints } from '@/lib/projectPath';
import { mapCoverUrl } from '@/lib/trailCover';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
/** Mapbox's static API caps each side at 1280. */
const MAP_MAX = 1280;

function RouteSlide({ route, width, height }: { route: [number, number][]; width: number; height: number }) {
  const c = useColors();
  const url =
    route.length >= 2
      ? mapCoverUrl({ type: 'LineString', coordinates: route }, MAPBOX_TOKEN, {
          width: Math.min(MAP_MAX, Math.round(width)),
          height: Math.min(MAP_MAX, Math.round(height)),
        })
      : null;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel="Route map"
        contentFit="cover"
        transition={150}
        style={{ width, height, backgroundColor: c.surface }}
      />
    );
  }

  // No map key: the line alone, drawn the way Rankings draws routes.
  const points = projectPoints(route, width, height, 28);
  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const start = points[0];
  const end = points[points.length - 1];
  return (
    <View accessible accessibilityLabel="Route" style={{ width, height, backgroundColor: c.surface }}>
      <Svg width={width} height={height}>
        <Polyline points={line} fill="none" stroke={c.mapLine} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        {start ? <Circle cx={start.x} cy={start.y} r={4} fill={c.surface} stroke={c.mapLine} strokeWidth={2} /> : null}
        {end ? <Circle cx={end.x} cy={end.y} r={3.5} fill={c.mapLine} /> : null}
      </Svg>
    </View>
  );
}

function PhotoSlide({ stored, width, height }: { stored: string; width: number; height: number }) {
  const c = useColors();
  const uri = usePhotoUri(stored);
  return (
    <View style={{ width, height, backgroundColor: c.raised }}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel="Hike photo"
          contentFit="cover"
          transition={150}
          recyclingKey={stored}
          style={{ width, height }}
        />
      ) : null}
    </View>
  );
}

/**
 * The swipeable strip on a post: the route map first, then the hiker's
 * photos. No photos means just the map; neither means no strip.
 */
export function PostMedia({
  route,
  photos,
  width,
  height,
  radius = 14,
  onTap,
  onDoubleTap,
}: {
  route: [number, number][];
  photos: string[];
  width: number;
  height: number;
  radius?: number;
  onTap?: () => void;
  /** Double-tap to like, as on Instagram. Only ever likes, never unlikes. */
  onDoubleTap?: () => void;
}) {
  const c = useColors();
  const [page, setPage] = useState(0);
  const reduceMotion = useReducedMotion();
  const burst = useSharedValue(0);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    transform: [{ scale: 0.6 + burst.value * 0.5 }],
  }));

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .enabled(Boolean(onDoubleTap))
    .runOnJS(true)
    .onEnd((_event, success) => {
      if (!success || !onDoubleTap) return;
      onDoubleTap();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      burst.value = reduceMotion
        ? withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 500 }))
        : withSequence(withSpring(1, { damping: 9, stiffness: 320 }), withTiming(0, { duration: 420 }));
    });
  const singleTap = Gesture.Tap()
    .enabled(Boolean(onTap))
    .runOnJS(true)
    .onEnd((_event, success) => {
      if (success) onTap?.();
    });
  // A single tap waits to be sure it isn't the first half of a double.
  const taps = Gesture.Exclusive(doubleTap, singleTap);

  const hasRoute = route.length >= 2;
  const count = (hasRoute ? 1 : 0) + photos.length;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== page) setPage(next);
  };

  if (count === 0) return null;
  if (width <= 0) return <View style={{ height }} />;

  return (
    <GestureDetector gesture={taps}>
      <View
        // Owns its taps, so the card around it doesn't also open on a double-tap.
        onStartShouldSetResponder={() => Boolean(onTap || onDoubleTap)}
        style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: c.surface }}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={count > 1}
          onScroll={onScroll}
          scrollEventThrottle={32}
          nestedScrollEnabled
        >
          {hasRoute ? <RouteSlide route={route} width={width} height={height} /> : null}
          {photos.map((photo, index) => (
            <PhotoSlide key={`${index}:${photo}`} stored={photo} width={width} height={height} />
          ))}
        </ScrollView>
        {count > 1 ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={{
              position: 'absolute',
              bottom: 10,
              alignSelf: 'center',
              flexDirection: 'row',
              gap: 5,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 10,
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
          >
            {Array.from({ length: count }, (_, index) => (
              <View
                key={index}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: index === page ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </View>
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
            burstStyle,
          ]}
        >
          <Heart size={86} strokeWidth={0} color="#FFFFFF" fill="#FFFFFF" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
