import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

import { haptics } from './haptics';

const TRACK_H = 62;
const KNOB = 52;
const INSET = (TRACK_H - KNOB) / 2;
const THRESHOLD = 0.85;
const RESET_MS = 1000;
const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };

/**
 * A knob you drag along a pill track to start a hike. Past 85% it snaps to the
 * end and completes; earlier it springs back. Assistive tech gets a plain
 * button with an `activate` action instead.
 */
export function SlideToStart({
  label,
  a11yLabel,
  onComplete,
  disabled = false,
}: {
  label: string;
  a11yLabel: string;
  onComplete: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - KNOB - INSET * 2);
  const x = useSharedValue(0);
  const startX = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || disabled) {
      cancelAnimation(sheen);
      sheen.value = 0;
      return;
    }
    sheen.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(sheen);
  }, [disabled, reduceMotion, sheen]);

  // Latch: one completion per slide. It clears about a second later so a screen
  // that stays mounted under a pushed screen is usable on return.
  const latched = useRef(false);
  const done = useSharedValue(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const complete = () => {
    if (latched.current) return;
    latched.current = true;
    done.value = true;
    haptics.success();
    onComplete();
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null;
      x.value = withSpring(0, SPRING);
      latched.current = false;
      done.value = false;
    }, RESET_MS);
  };
  const tap = () => haptics.tapLight();

  // Keep the knob inside the track when it narrows, and let go if disabled mid-drag.
  useEffect(() => {
    if (x.value > max) x.value = max;
  }, [max, x]);
  useEffect(() => {
    if (disabled && !latched.current) x.value = withSpring(0, SPRING);
  }, [disabled, x]);

  const pan = Gesture.Pan()
    .enabled(!disabled && max > 0)
    .onStart(() => {
      if (done.value) return;
      startX.value = x.value;
      scheduleOnRN(tap);
    })
    .onUpdate((e) => {
      if (done.value) return;
      x.value = Math.min(max, Math.max(0, startX.value + e.translationX));
    })
    .onEnd((_e, success) => {
      if (done.value) return;
      if (success && x.value >= max * THRESHOLD) {
        x.value = withSpring(max, SPRING);
        scheduleOnRN(complete);
      } else {
        x.value = withSpring(0, SPRING);
      }
    });

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + TRACK_H }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0 : 1,
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-90, Math.max(90, width)]) }],
  }));
  // The label fades as the knob covers it.
  const labelStyle = useAnimatedStyle(() => ({ opacity: max > 0 ? 1 - Math.min(1, (x.value / max) * 1.6) : 1 }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate', label: a11yLabel }]}
        onAccessibilityAction={(e) => {
          if (!disabled && e.nativeEvent.actionName === 'activate') complete();
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          backgroundColor: c.raised,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          opacity: disabled ? 0.5 : 1,
          // Stops the browser scrolling the page while dragging with a mouse or finger.
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <Animated.View
          style={[
            { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: TRACK_H / 2, backgroundColor: c.accent },
            fillStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, labelStyle]}
        >
          <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 15, letterSpacing: 0.15, color: c.fgMuted }}>{label}</Text>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: 90 }, sheenStyle]}>
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={c.fg} stopOpacity={0} />
                  <Stop offset="0.5" stopColor={c.fg} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={c.fg} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
            </Svg>
          </Animated.View>
        </Animated.View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: INSET - 1,
              top: INSET - 1,
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.4,
              shadowRadius: 7,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            },
            knobStyle,
          ]}
        >
          <ArrowRight size={22} color={c.onAccent} strokeWidth={2.2} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
