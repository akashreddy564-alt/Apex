import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { contourPaths } from '@/lib/contours';
import { withAlpha } from '@/theme/color';

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
    // aria-hidden on a View: RN maps it per platform, and on web an Svg would pass RN a11y props to the DOM.
    <View
      aria-hidden
      style={[StyleSheet.absoluteFill, { opacity, pointerEvents: 'none' }]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {paths.map((d, i) => (
          <Path key={i} d={d} fill="none" stroke={withAlpha(c.accent, 0.1)} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}
