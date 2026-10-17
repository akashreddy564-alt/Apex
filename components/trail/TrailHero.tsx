import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { posterLayout } from '@/lib/posterFit';
import type { TrailCover } from '@/lib/trailCover';
import { colors, fonts } from '@/theme/tokens';

const DRIFT_MS = 18_000;
const SIDE = 20;
/** The hero name never grows past this, even for short names. */
const MAX_NAME_SIZE = 64;

/** Hero height for a given window height; shared with the satellite image size. */
export function heroHeight(windowHeight: number): number {
  return Math.round(Math.min(560, Math.max(380, windowHeight * 0.58)));
}

interface TrailHeroProps {
  name: string;
  region: string;
  cover: TrailCover | null;
  /** e.g. "#1 in Loved · 9.7"; null when unranked. */
  placementLabel: string | null;
  top: boolean;
  scrollY: SharedValue<number>;
}

export function TrailHero({ name, region, cover, placementLabel, top, scrollY }: TrailHeroProps) {
  const { width, height: windowHeight } = useWindowDimensions();
  const height = heroHeight(windowHeight);
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  const poster = useMemo(() => {
    const layout = posterLayout(name.toUpperCase(), Math.min(width, 520) - SIDE * 2);
    return { ...layout, fontSize: Math.min(layout.fontSize, MAX_NAME_SIZE) };
  }, [name, width]);

  useEffect(() => {
    if (reduceMotion || !cover) return;
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [cover, drift, reduceMotion]);

  // Scrolling up moves the photo at half speed; pulling down stretches it.
  const parallaxStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        { translateY: y > 0 ? y * 0.5 : y / 2 },
        { scale: interpolate(y, [-height, 0], [2, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const driftStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.06 + drift.value * 0.08 },
      { translateX: `${drift.value * -2}%` },
      { translateY: `${drift.value * -2}%` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, height * 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: scrollY.value > 0 ? scrollY.value * 0.25 : 0 }],
  }));

  const lineHeight = Math.round(poster.fontSize * 0.95);

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, parallaxStyle]}>
        {cover ? (
          <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
            <Image
              source={{ uri: cover.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
              priority="high"
              accessible={false}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="heroShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={0.55} />
            <Stop offset="0.22" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="0.5" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="0.86" stopColor={colors.bg} stopOpacity={0.85} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#heroShade)" />
      </Svg>

      <Animated.View style={[styles.text, textStyle]}>
        {poster.lines.map((line) => (
          <Text
            key={line}
            style={[styles.name, { fontSize: poster.fontSize, lineHeight }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {line}
          </Text>
        ))}
        <View style={styles.metaRow}>
          <Text style={styles.region} numberOfLines={1}>
            {region.toUpperCase()}
          </Text>
          <View style={styles.pill}>
            <Text style={[styles.pillText, top && styles.pillTop]} numberOfLines={1}>
              {placementLabel ? placementLabel.toUpperCase() : 'UNRANKED'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 14,
} as const;

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: colors.surface },
  text: { position: 'absolute', left: SIDE, right: SIDE, bottom: 8 },
  name: { color: colors.fg, fontFamily: fonts.poster, letterSpacing: 0.4, ...TEXT_SHADOW },
  metaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  region: {
    flexShrink: 1,
    color: colors.highlight,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    ...TEXT_SHADOW,
  },
  pill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(9,9,11,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: { color: colors.fg, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8 },
  pillTop: { color: colors.heroAccent },
});
