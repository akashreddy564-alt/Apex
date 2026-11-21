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

import { ContourTexture } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import type { TrailCover } from '@/lib/trailCover';
import { fonts, type Palette } from '@/theme/tokens';
import type { TrailShape } from '@/types/trail';

const DRIFT_MS = 18_000;
const SIDE = 18;

/** Hero height for a given window height; shared with the satellite image size. */
export function heroHeight(windowHeight: number): number {
  return Math.round(Math.min(480, Math.max(360, windowHeight * 0.46)));
}

const SHAPE_LABEL: Record<TrailShape, string> = {
  loop: 'Loop',
  'out-and-back': 'Out and back',
  'point-to-point': 'Point to point',
};

/** "Zion, UT · Out and back", or just the region when the shape is unknown. */
export function heroEyebrow(region: string, shape: TrailShape | null | undefined): string {
  return shape ? `${region} · ${SHAPE_LABEL[shape]}` : region;
}

/** Display size: long names step down so they hold to two or three lines. */
function nameSize(name: string): number {
  if (name.length > 24) return 34;
  if (name.length > 16) return 40;
  return 44;
}

interface TrailHeroProps {
  trailId: string;
  name: string;
  region: string;
  shape?: TrailShape | null;
  /** Fixed-set flags from data/trailNotes. */
  flags?: string[];
  cover: TrailCover | null;
  /** e.g. "#1 in Loved · 9.7"; null when unranked. */
  placementLabel: string | null;
  top: boolean;
  scrollY: SharedValue<number>;
}

export function TrailHero({
  trailId,
  name,
  region,
  shape,
  flags = [],
  cover,
  placementLabel,
  top,
  scrollY,
}: TrailHeroProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width, height: windowHeight } = useWindowDimensions();
  const height = heroHeight(windowHeight);
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const size = nameSize(name);

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
            <Stop offset="0" stopColor={c.bg} stopOpacity={0.55} />
            <Stop offset="0.25" stopColor={c.bg} stopOpacity={0} />
            <Stop offset="0.55" stopColor={c.bg} stopOpacity={0.1} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#heroShade)" />
      </Svg>
      <ContourTexture seed={trailId} width={Math.round(width)} height={height} opacity={0.9} />

      <Animated.View style={[styles.text, textStyle]}>
        {/* Eyebrow type in fg2 with the halo: Eyebrow's muted color is lost over a photo. */}
        <Text style={styles.eyebrow} numberOfLines={1}>
          {heroEyebrow(region, shape)}
        </Text>
        <Text
          accessibilityRole="header"
          style={[
            styles.name,
            { fontSize: size, lineHeight: Math.round(size * 0.88), letterSpacing: -0.025 * size },
          ]}
        >
          {name}
        </Text>
        <View style={styles.chips}>
          {flags.map((flag) => (
            <View key={flag} style={[styles.chip, styles.flag]}>
              <Text style={[styles.chipText, { color: c.fine }]} numberOfLines={1}>
                {flag}
              </Text>
            </View>
          ))}
          <View style={styles.chip}>
            <Text style={[styles.chipText, top && { color: c.loved }]} numberOfLines={1}>
              {placementLabel ?? 'Unranked'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/** #RRGGBB plus a two-digit alpha; other formats pass through. */
function alpha(hex: string, a: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;
}

/** A soft halo in the page color, so text over photos reads in Dark and Light. */
const textShadow = (c: Palette) => ({
  textShadowColor: alpha(c.bg, '8C'),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 14,
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    clip: { overflow: 'hidden', backgroundColor: c.surface },
    text: { position: 'absolute', left: SIDE, right: SIDE, bottom: 14 },
    eyebrow: {
      color: c.fg2,
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      ...textShadow(c),
    },
    name: {
      marginTop: 6,
      color: c.fg,
      fontFamily: fonts.displayExtraBold,
      fontWeight: 'normal',
      textTransform: 'uppercase',
      ...textShadow(c),
    },
    chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 99,
      backgroundColor: alpha(c.fg, '14'),
      borderWidth: 1,
      borderColor: alpha(c.fg, '1F'),
    },
    // Flags: the `fine` color at 35% border and 8% fill.
    flag: { backgroundColor: alpha(c.fine, '14'), borderColor: alpha(c.fine, '59') },
    chipText: { color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 11 },
  });
