import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import { cardTitleLayout } from '@/lib/posterFit';
import type { TrailCover } from '@/lib/trailCover';
import { colors, fonts } from '@/theme/tokens';
import type { Trail } from '@/types/trail';

const CARD_HEIGHT = 184;
const DRIFT_MS = 14_000;
/** Card padding (16 + 14), score pill and gap. */
const TITLE_INSET = 30 + 76;

interface TrailCoverCardProps {
  trail: Trail;
  cover: TrailCover | null;
  /** One-decimal 0–10 score, already formatted. */
  score?: string | null;
  /** The user's top-ranked trail gets the warm score. */
  top?: boolean;
  /** Offsets each card's drift so they don't move in step. */
  index?: number;
  onPress?: () => void;
}

export function TrailCoverCard({ trail, cover, score, top, index = 0, onPress }: TrailCoverCardProps) {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  // Measured card width; the window width is only a first guess (it is
  // wrong during web pre-rendering).
  const [cardWidth, setCardWidth] = useState(0);
  const title = useMemo(
    () => cardTitleLayout(trail.name.toUpperCase(), (cardWidth || width - 28) - TITLE_INSET),
    [trail.name, cardWidth, width],
  );
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !cover) return;
    drift.value = (index * 0.37) % 1;
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [cover, drift, index, reduceMotion]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.08 + drift.value * 0.1 },
      { translateX: `${drift.value * -3}%` },
      { translateY: `${drift.value * -2}%` },
    ],
  }));

  const meta = [
    trail.region.toUpperCase(),
    formatOptionalDistance(trail.distance_km).toUpperCase(),
    `▲${formatOptionalElevation(trail.elevation_gain_m).toUpperCase()}`,
  ].join(' · ');

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setCardWidth(Math.round(e.nativeEvent.layout.width))}
      accessibilityRole="button"
      accessibilityLabel={`${trail.name}, ${trail.region}${score ? `, score ${score}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {cover ? (
        <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
          <Image
            source={{ uri: cover.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            accessible={false}
          />
        </Animated.View>
      ) : null}

      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="cardShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.3" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={0.88} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cardShade)" />
      </Svg>

      <View style={styles.info} pointerEvents="none">
        <View style={styles.text}>
          {title.lines.map((line) => (
            <Text
              key={line}
              style={[styles.name, { fontSize: title.fontSize, lineHeight: Math.round(title.fontSize * 1.08) }]}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {score ? (
          <View style={styles.scorePill}>
            <Text style={[styles.score, top && styles.scoreTop]}>{score}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
} as const;

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.raised,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  info: {
    position: 'absolute',
    left: 16,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  text: { flex: 1 },
  name: {
    color: colors.fg,
    fontFamily: fonts.poster,
    letterSpacing: 0.3,
    ...TEXT_SHADOW,
  },
  meta: {
    marginTop: 4,
    color: colors.highlight,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.8,
    ...TEXT_SHADOW,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(9,9,11,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  score: {
    color: colors.fg,
    fontFamily: fonts.mono,
    fontSize: 19,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scoreTop: { color: colors.heroAccent },
});
