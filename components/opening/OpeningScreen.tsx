import { Image, type ImageProps } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { formatHeroElevation } from '@/lib/format';
import { createOpeningClock } from '@/lib/openingClock';
import { posterLayout, posterLineStyle } from '@/lib/posterFit';
import { colors, fonts } from '@/theme/tokens';
import type { HeroPlace } from '@/types/hero';

const DRIFT_MS = 18_000;
const AUTO_CONTINUE_MS = 4_500;
/** Longest the screen waits for the photo before treating it as shown. */
const READY_FALLBACK_MS = 1_500;
const FADE_MS = 400;
const SIDE_PADDING = 24;

const KIND_LABEL: Record<HeroPlace['kind'], string> = {
  peak: 'PEAK',
  climb: 'CLIMB',
  trek: 'TREK',
  trail: 'TRAIL',
};

type OpeningScreenProps = {
  place: HeroPlace;
  photo: ImageProps['source'];
  /** Called once: photo on screen, photo failed, or 1.5 s passed. */
  onReady: () => void;
  /** Called once, after the fade-out. */
  onDone: () => void;
};

export function OpeningScreen({ place, photo, onReady, onDone }: OpeningScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const opacity = useSharedValue(1);

  const poster = useMemo(
    () => posterLayout(place.name.toUpperCase(), width - SIDE_PADDING * 2),
    [place.name, width],
  );

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  // The clock lives for the whole screen; it reads the latest callbacks.
  const latest = useRef({ onReady, onDone });
  latest.current = { onReady, onDone };
  const [clock] = useState(() => {
    const finish = () => latest.current.onDone();
    return createOpeningClock({
      readyFallbackMs: READY_FALLBACK_MS,
      autoContinueMs: AUTO_CONTINUE_MS,
      onReady: () => latest.current.onReady(),
      onLeave: () => {
        opacity.value = withTiming(0, { duration: FADE_MS }, (finished) => {
          if (finished) runOnJS(finish)();
        });
      },
    });
  });
  useEffect(() => () => clock.dispose(), [clock]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + drift.value * 0.12 },
      { translateX: `${drift.value * -2}%` },
      { translateY: `${drift.value * -3}%` },
    ],
  }));

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={clock.tap}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}. ${place.fact} Double tap to continue.`}
      >
        <Animated.View style={[styles.photoFrame, photoStyle]}>
          <Image
            source={photo}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            priority="high"
            onDisplay={clock.ready}
            onError={clock.ready}
            accessible={false}
          />
        </Animated.View>

        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0.3} />
              <Stop offset="0.28" stopColor={colors.bg} stopOpacity={0} />
              <Stop offset="0.52" stopColor={colors.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={0.78} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#shade)" />
        </Svg>

        <Text style={[styles.wordmark, { top: insets.top + 12 }]}>APEX</Text>

        <View style={[styles.lower, { paddingBottom: insets.bottom + 28 }]} pointerEvents="none">
          {poster.lines.map((line, index) => (
            <Text
              key={line}
              style={[styles.name, { fontSize: poster.fontSize }, posterLineStyle(poster.fontSize, index)]}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}

          <View style={styles.stats}>
            <View style={[styles.side, styles.sideLeft]}>
              <Text style={styles.sideText} numberOfLines={1}>
                {place.region.toUpperCase()}
              </Text>
              <Text style={styles.sideText} numberOfLines={1}>
                {place.country.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.elevation}>{formatHeroElevation(place.elevationM)}</Text>
            <View style={[styles.side, styles.sideRight]}>
              <Text style={styles.sideText} numberOfLines={1}>
                {place.grade.toUpperCase()}
              </Text>
              <Text style={styles.sideText} numberOfLines={1}>
                {KIND_LABEL[place.kind]}
              </Text>
            </View>
          </View>

          <View style={styles.fact}>
            <View style={styles.rule} />
            <Text style={styles.label}>DID YOU KNOW</Text>
            <Text style={styles.factText}>{place.fact}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 12,
} as const;

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg },
  photoFrame: { position: 'absolute', top: '-6%', bottom: '-6%', left: '-6%', right: '-6%' },
  wordmark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.fg,
    fontFamily: fonts.displayExtraBold,
    fontSize: 14,
    letterSpacing: 5.6,
    paddingLeft: 5.6,
  },
  lower: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SIDE_PADDING },
  name: {
    color: colors.fg,
    fontFamily: fonts.poster,
    textAlign: 'center',
    includeFontPadding: false,
  },
  stats: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: { flex: 1, opacity: 0.75 },
  sideLeft: { alignItems: 'flex-end' },
  sideRight: { alignItems: 'flex-start' },
  sideText: {
    color: colors.fg,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  elevation: {
    marginHorizontal: 8,
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    color: colors.heroAccent,
    fontFamily: fonts.mono,
    fontSize: 17,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  fact: { marginTop: 44, alignItems: 'center', paddingHorizontal: 12 },
  rule: { width: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  label: {
    color: colors.fg,
    opacity: 0.65,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: 8,
    ...TEXT_SHADOW,
  },
  factText: {
    color: colors.fg,
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    ...TEXT_SHADOW,
  },
});
