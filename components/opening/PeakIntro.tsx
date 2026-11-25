import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { INTRO_DELAY_MS, INTRO_MS, introFrame, toSvgPath } from '@/lib/peakIntro';
import { palettes } from '@/theme/tokens';

import { PEAK_STONE, SNOW } from './peakColors';

const dark = palettes.dark;
const REDUCED_FADE_MS = 350;

type PeakIntroProps = {
  /** Starts the animation; until then it holds the splash frame. */
  play: boolean;
  /** Called once, when the opening screen is fully uncovered. */
  onDone: () => void;
};

function toPath(points: number[], holes: number[][] = []): SkPath {
  'worklet';
  return Skia.Path.MakeFromSVGString(toSvgPath(points, holes)) ?? Skia.Path.Make();
}

/**
 * Picks up from the native splash: the A in APEX becomes a peak, the camera
 * pushes into it, and the peak opens like a window onto the opening photo
 * underneath. Drawn with Skia on the UI thread. Reduce Motion gets a fade.
 */
export function PeakIntro({ play, onDone }: PeakIntroProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (!play) return;
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    };
    if (reduceMotion) {
      fade.value = withTiming(0, { duration: REDUCED_FADE_MS }, finish);
    } else {
      t.value = withDelay(INTRO_DELAY_MS, withTiming(1, { duration: INTRO_MS, easing: Easing.linear }, finish));
    }
  }, [play, reduceMotion, onDone, t, fade]);

  const frame = useDerivedValue(() => introFrame(t.value, width, height));

  // The dark cover, with the peak cut out of it once the peak becomes a window.
  const cover = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addRect(Skia.XYWHRect(0, 0, width, height));
    const window = frame.value.window;
    if (window) path.addPath(toPath(window));
    return path;
  });
  const peak = useDerivedValue(() => toPath(frame.value.peak.points));
  const bar = useDerivedValue(() => toPath(frame.value.bar.points));
  const cap = useDerivedValue(() => toPath(frame.value.cap.points));
  const p = useDerivedValue(() => toPath(frame.value.letters[0].points, frame.value.letters[0].holes));
  const e = useDerivedValue(() => toPath(frame.value.letters[1].points));
  // The X's two bars in one path; winding fill keeps the crossing solid.
  const x = useDerivedValue(() => toPath(frame.value.letters[2].points, [frame.value.letters[3].points]));

  const peakColor = useDerivedValue(() => interpolateColor(frame.value.tone, [0, 1], [dark.fg, PEAK_STONE]));
  const peakAlpha = useDerivedValue(() => frame.value.peak.alpha);
  const barAlpha = useDerivedValue(() => frame.value.bar.alpha);
  const capAlpha = useDerivedValue(() => frame.value.cap.alpha);
  const pAlpha = useDerivedValue(() => frame.value.letters[0].alpha);
  const eAlpha = useDerivedValue(() => frame.value.letters[1].alpha);
  const xAlpha = useDerivedValue(() => frame.value.letters[2].alpha);
  const coverStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, coverStyle]} pointerEvents="none" accessible={false}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={cover} color={dark.bg} fillType="evenOdd" />
        <Path path={peak} color={peakColor} opacity={peakAlpha} />
        <Path path={bar} color={dark.fg} opacity={barAlpha} />
        <Path path={cap} color={SNOW} opacity={capAlpha} />
        <Path path={p} color={dark.fg} opacity={pAlpha} fillType="evenOdd" />
        <Path path={e} color={dark.fg} opacity={eAlpha} />
        <Path path={x} color={dark.fg} opacity={xAlpha} />
      </Canvas>
    </Animated.View>
  );
}
