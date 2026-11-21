import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { rollTo } from '@/lib/odometerStrip';
import { fonts } from '@/theme/tokens';

const SPRING = { damping: 22, stiffness: 120, mass: 1 };
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One split-flap tile: a strip of 0-9 twice over that rolls forward to the digit. */
function Tile({ digit, size, reduceMotion }: { digit: number; size: number; reduceMotion: boolean }) {
  const c = useColors();
  const w = Math.round(size);
  const h = Math.round((size * 52) / 34);
  const pos = useRef(digit);
  const y = useSharedValue(-digit * h);

  useEffect(() => {
    // Stop any spring in flight and re-seat the strip where it is, so a quick
    // second update never jumps. Shifting by 10 entries looks identical.
    cancelAnimation(y);
    const { shift, target } = rollTo(pos.current, digit);
    if (shift !== 0) y.value = y.value - shift * h;
    pos.current = target;
    y.value = reduceMotion ? -target * h : withSpring(-target * h, SPRING);
  }, [digit, h, reduceMotion, y]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: Math.round(h * 0.17),
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={strip}>
        {DIGITS.map((d, i) => (
          <Text
            key={i}
            style={{
              width: w,
              height: h,
              lineHeight: h,
              textAlign: 'center',
              fontFamily: fonts.mono,
              fontSize: size,
              fontWeight: '700',
              color: c.fg,
            }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
      {/* The split in the middle of the flap. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: h / 2, height: 1, backgroundColor: c.bg, opacity: 0.7 }}
      />
    </View>
  );
}

/**
 * A rolling odometer: each digit is a split-flap tile that spins from its
 * previous value. Commas and other characters sit still between tiles.
 */
export function Odometer({
  value,
  format,
  size = 34,
}: {
  value: number;
  format: (n: number) => string;
  size?: number;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const text = format(value);
  const chars = text.split('');
  // Key tiles from the right, so a new leading digit does not reset the others.
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
    >
      {chars.map((ch, i) => {
        const fromRight = chars.length - i;
        return /\d/.test(ch) ? (
          <Tile key={`d${fromRight}`} digit={Number(ch)} size={size} reduceMotion={reduceMotion} />
        ) : (
          <Text
            key={`s${fromRight}`}
            style={{ fontFamily: fonts.mono, fontSize: size * 0.7, fontWeight: '700', color: c.fgFaint, paddingHorizontal: 1 }}
          >
            {ch}
          </Text>
        );
      })}
    </View>
  );
}
