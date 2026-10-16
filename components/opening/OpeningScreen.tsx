import { Image, type ImageSource } from 'expo-image';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, fonts } from '@/theme/tokens';
import type { HeroPlace } from '@/types/hero';

const DRIFT_MS = 18_000;
const AUTO_CONTINUE_MS = 4_500;
const FADE_MS = 400;

const KIND_LABEL: Record<HeroPlace['kind'], string> = {
  peak: 'PEAK',
  climb: 'CLIMB',
  trek: 'TREK',
  trail: 'TRAIL',
};

type OpeningScreenProps = {
  place: HeroPlace;
  photo: ImageSource;
  /** Called once, when the photo is on screen or has failed to load. */
  onReady: () => void;
  /** Called once, after the fade-out. */
  onDone: () => void;
};

export function OpeningScreen({ place, photo, onReady, onDone }: OpeningScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const opacity = useSharedValue(1);
  const ready = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    opacity.value = withTiming(0, { duration: FADE_MS }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [onDone, opacity]);

  const autoContinue = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markReady = useCallback(() => {
    if (ready.current) return;
    ready.current = true;
    onReady();
    autoContinue.current = setTimeout(leave, AUTO_CONTINUE_MS);
  }, [leave, onReady]);

  useEffect(
    () => () => {
      if (autoContinue.current) clearTimeout(autoContinue.current);
    },
    [],
  );

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
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}. ${place.fact}. Double tap to continue.`}
      >
        <Animated.View style={[styles.photoFrame, photoStyle]}>
          <Image
            source={photo}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            onDisplay={markReady}
            onError={markReady}
            accessible={false}
          />
        </Animated.View>

        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
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
          <Text
            style={styles.name}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {place.name.toUpperCase()}
          </Text>

          <View style={styles.stats}>
            <Text style={[styles.side, styles.sideLeft]} numberOfLines={2}>
              {`${place.region.toUpperCase()}\n${place.country.toUpperCase()}`}
            </Text>
            <Text style={styles.elevation}>{formatHeroElevation(place.elevationM)}</Text>
            <Text style={[styles.side, styles.sideRight]} numberOfLines={2}>
              {`${place.grade.toUpperCase()}\n${KIND_LABEL[place.kind]}`}
            </Text>
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
  lower: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
  name: {
    color: colors.fg,
    fontFamily: fonts.poster,
    fontSize: 84,
    lineHeight: 76,
    paddingTop: 8,
    textAlign: 'center',
  },
  stats: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    flex: 1,
    color: colors.fg,
    opacity: 0.75,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.5,
  },
  sideLeft: { textAlign: 'right' },
  sideRight: { textAlign: 'left' },
  elevation: {
    marginHorizontal: 14,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    color: colors.heroAccent,
    fontFamily: fonts.mono,
    fontSize: 20,
    letterSpacing: 1,
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
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    ...TEXT_SHADOW,
  },
});
