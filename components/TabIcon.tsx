import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { SFSymbol } from 'sf-symbols-typescript';

import { SymbolIcon } from '@/components/SymbolIcon';
import { useColors } from '@/hooks/useColors';

/**
 * A tab icon that answers the tap: a small spring lift when its tab becomes
 * active, and a Bone dot above it while it stays active. Reduced motion
 * gets the dot without the spring.
 */
export function TabIcon({
  Icon,
  symbol,
  filledSymbol,
  color,
  focused,
}: {
  Icon: LucideIcon;
  /** SF Symbol on iOS; filled when the tab is active. */
  symbol: SFSymbol;
  filledSymbol?: SFSymbol;
  color: ColorValue;
  focused: boolean;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const lift = useSharedValue(0);
  const dot = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    dot.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 180 });
    if (focused && !reduceMotion) {
      lift.value = withSequence(withTiming(-3, { duration: 110 }), withSpring(0, { damping: 9, stiffness: 320 }));
    }
  }, [dot, focused, lift, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: 1 + (lift.value / -3) * 0.08 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: 0.4 + dot.value * 0.6 }] }));

  return (
    <Animated.View style={[{ alignItems: 'center' }, iconStyle]}>
      <SymbolIcon name={symbol} filledName={filledSymbol} fallback={Icon} size={22} color={color} focused={focused} />
      <Animated.View
        style={[
          { position: 'absolute', top: -8, width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent },
          dotStyle,
        ]}
      />
    </Animated.View>
  );
}
