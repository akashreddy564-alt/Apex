import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { INTRO_DELAY_MS, INTRO_MS, introFrame, toSvgPath } from '@/lib/peakIntro';
import { palettes } from '@/theme/tokens';

import { PEAK_STONE, SNOW } from './peakColors';

const dark = palettes.dark;
const REDUCED_FADE_MS = 350;

type PeakIntroProps = {
  play: boolean;
  onDone: () => void;
};

/** Mixes two #RRGGBB colours. */
function mixHex(a: string, b: string, v: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * v));
  return `rgb(${out.join(',')})`;
}

/**
 * The web build has no Skia, so the same frames are drawn as SVG, stepped on
 * requestAnimationFrame. See PeakIntro.tsx for the native version.
 */
export function PeakIntro({ play, onDone }: PeakIntroProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [t, setT] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!play) return;
    const total = reduceMotion ? REDUCED_FADE_MS : INTRO_MS;
    let raf = 0;
    const start = performance.now() + (reduceMotion ? 0 : INTRO_DELAY_MS);
    const step = (now: number) => {
      const v = Math.max(0, Math.min(1, (now - start) / total));
      if (reduceMotion) setOpacity(1 - v);
      else setT(v);
      if (v < 1) raf = requestAnimationFrame(step);
      else onDone();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [play, reduceMotion, onDone]);

  const f = introFrame(t, width, height);
  const cover = `M0 0H${width}V${height}H0Z${f.window ? toSvgPath(f.window) : ''}`;

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none" accessible={false}>
      <Svg width={width} height={height}>
        <Path d={cover} fill={dark.bg} fillRule="evenodd" />
        <Path d={toSvgPath(f.peak.points)} fill={mixHex(dark.fg, PEAK_STONE, f.tone)} opacity={f.peak.alpha} />
        <Path d={toSvgPath(f.bar.points)} fill={dark.fg} opacity={f.bar.alpha} />
        <Path d={toSvgPath(f.cap.points)} fill={SNOW} opacity={f.cap.alpha} />
        <Path d={toSvgPath(f.letters[0].points, f.letters[0].holes)} fill={dark.fg} opacity={f.letters[0].alpha} fillRule="evenodd" />
        <Path d={toSvgPath(f.letters[1].points)} fill={dark.fg} opacity={f.letters[1].alpha} />
        <Path d={toSvgPath(f.letters[2].points, [f.letters[3].points])} fill={dark.fg} opacity={f.letters[2].alpha} />
      </Svg>
    </View>
  );
}
