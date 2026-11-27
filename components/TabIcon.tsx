import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, type ColorValue } from 'react-native';
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
 * A tab icon that answers the tap: the outline icon crossfades into the
 * filled one (shrinking and blurring out as the other grows in), a small
 * spring lift, and a Bone dot above it while it stays active. Reduced
 * motion gets a plain swap and the dot without the spring.
 */
const BLUR = Platform.OS === 'web';

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
  const fill = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    dot.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 180 });
    fill.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 220 });
    if (focused && !reduceMotion) {
      lift.value = withSequence(withTiming(-3, { duration: 110 }), withSpring(0, { damping: 9, stiffness: 320 }));
    }
  }, [dot, fill, focused, lift, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: 1 + (lift.value / -3) * 0.08 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: 0.4 + dot.value * 0.6 }] }));
  // Blur is a filter only web draws on an icon; native gets the fade and scale.
  const outlineStyle = useAnimatedStyle(() => ({
    opacity: 1 - fill.value,
    transform: [{ scale: 1 - fill.value * 0.25 }],
    ...(BLUR ? { filter: `blur(${fill.value * 3}px)` } : {}),
  }));
  const filledStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.75 + fill.value * 0.25 }],
    ...(BLUR ? { filter: `blur(${(1 - fill.value) * 3}px)` } : {}),
  }));

  return (
    <Animated.View style={[{ alignItems: 'center' }, iconStyle]}>
      <Animated.View style={outlineStyle}>
        <SymbolIcon name={symbol} fallback={Icon} size={22} color={color} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 0 }, filledStyle]}>
        <SymbolIcon name={symbol} filledName={filledSymbol ?? symbol} fallback={Icon} size={22} color={color} focused />
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', top: -8, width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent },
          dotStyle,
        ]}
      />
    </Animated.View>
  );
}
