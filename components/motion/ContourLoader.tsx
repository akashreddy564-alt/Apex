import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

const SIZES = { sm: 20, md: 44, screen: 96 } as const;
const PERIOD = 2000;
const RINGS = [0, 1, 2];

function Ring({ index, box, color, reduceMotion }: { index: number; box: number; color: string; reduceMotion: boolean }) {
  const t = useSharedValue(reduceMotion ? (index + 1) / 4 : 0);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.value = (index + 1) / 4;
      return;
    }
    t.value = 0;
    t.value = withDelay(
      (index * PERIOD) / RINGS.length,
      withRepeat(withTiming(1, { duration: PERIOD, easing: Easing.out(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [index, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - t.value),
    transform: [{ scale: 0.25 + 0.75 * t.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: box,
          height: box,
          borderRadius: box / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/** Three rings that spread and fade, like a contour map breathing. Still under Reduce Motion. */
export function ContourLoader({
  size,
  color,
  label,
}: {
  size: 'sm' | 'md' | 'screen';
  color?: string;
  label?: string;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const box = SIZES[size];
  const rings = (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {RINGS.map((i) => (
        <Ring key={i} index={i} box={box} color={color ?? c.accent} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
  if (size !== 'screen') {
    return (
      <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
        {rings}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: c.bg }}
    >
      {rings}
      {label ? (
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: c.fgMuted }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
