import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { contourPaths } from '@/lib/contours';

/** Accent at 10% alpha, from a #RRGGBB palette color. */
function tenPercent(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}1A` : hex;
}

/** Faint topographic rings behind a screen's header. Decorative only. */
export function ContourTexture({
  seed,
  width,
  height,
  opacity = 1,
}: {
  seed: string;
  width: number;
  height: number;
  opacity?: number;
}) {
  const c = useColors();
  const paths = useMemo(() => contourPaths(seed, width, height), [seed, width, height]);
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity, pointerEvents: 'none' }]}
    >
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={tenPercent(c.accent)} strokeWidth={1} />
      ))}
    </Svg>
  );
}
