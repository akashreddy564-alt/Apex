import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';

type Shape = 'row' | 'card' | 'post';

function Block({ w, h, r = 8, color }: { w: number | `${number}%`; h: number; r?: number; color: string }) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: color }} />;
}

function Item({ shape, color }: { shape: Shape; color: string }) {
  if (shape === 'row') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
        <Block w={48} h={48} r={12} color={color} />
        <View style={{ flex: 1, gap: 8 }}>
          <Block w="60%" h={13} color={color} />
          <Block w="35%" h={10} color={color} />
        </View>
      </View>
    );
  }
  if (shape === 'card') {
    return (
      <View style={{ gap: 12, paddingVertical: 8 }}>
        <Block w="100%" h={140} r={16} color={color} />
        <Block w="55%" h={15} color={color} />
        <Block w="30%" h={10} color={color} />
      </View>
    );
  }
  return (
    <View style={{ gap: 12, paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Block w={36} h={36} r={18} color={color} />
        <View style={{ flex: 1, gap: 6 }}>
          <Block w="40%" h={12} color={color} />
          <Block w="25%" h={9} color={color} />
        </View>
      </View>
      <Block w="100%" h={200} r={16} color={color} />
      <Block w="70%" h={12} color={color} />
    </View>
  );
}

/** A shimmering placeholder while content loads. Hidden from screen readers; still under Reduce Motion. */
export function Skeleton({ shape, count = 1 }: { shape: Shape; count?: number }) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? 0.7 : 0.45);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0.7;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} shape={shape} color={c.raised} />
      ))}
    </Animated.View>
  );
}
