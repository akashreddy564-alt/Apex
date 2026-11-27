import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { haptics, PressScale } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import { cardTop, holePath, spotlight, type Rect } from '@/lib/tourLayout';
import { useTour, type TourKey } from '@/stores/tourStore';
import { cardStyle, fonts } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STEPS: { key: TourKey; route: '/' | '/log'; eyebrow: string; title: string; body: string }[] = [
  {
    key: 'week',
    route: '/',
    eyebrow: 'THIS WEEK',
    title: 'Your week at a glance',
    body: 'The ring fills with every hike toward your weekly goal. Hike each week to keep your streak.',
  },
  {
    key: 'slider',
    route: '/log',
    eyebrow: 'RECORD',
    title: 'Slide to start a hike',
    body: 'Apex records your route, distance and climb, even with the screen off. Rank the trail when you finish.',
  },
  {
    key: 'social',
    route: '/log',
    eyebrow: 'SOCIAL',
    title: 'Hike with your people',
    body: 'Add friends to see their hikes and rankings, start groups, and join your school or company board.',
  },
];

/** If a target never reports in (it isn't on screen), the card shows on its own after this. */
const FALLBACK_MS = 1500;
const RADIUS = 20;
const SPRING = { damping: 22, stiffness: 190, mass: 0.9 };

/**
 * The first-open tour on Home: three stops, each dimming the screen around
 * one thing with a card that says what it is. It swallows taps underneath,
 * so nothing starts by accident, and Skip always ends it.
 */
export function HomeTour({ onDone }: { onDone: () => void }) {
  // Someone who just signed up picks a username first; the tour would navigate them off it.
  const { session, profile, loading } = useMyProfile();
  if (loading || (session && !profile)) return null;
  return <Tour onDone={onDone} />;
}

function Tour({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const router = useRouter();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [cardH, setCardH] = useState(180);
  const step = STEPS[index];
  const target = useTour((s) => s.rects[step.key]);
  const setActive = useTour((s) => s.setActive);

  // Go where the step lives and tell its target to measure itself.
  useEffect(() => {
    setTimedOut(false);
    router.navigate(step.route);
    setActive(step.key);
    const t = setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, [router, setActive, step.key, step.route]);

  useEffect(() => () => setActive(null), [setActive]);

  const spot: Rect | null = useMemo(() => {
    if (!target) return null;
    return spotlight(target, screen);
  }, [screen, target]);
  const ready = Boolean(spot) || timedOut;

  // The hole glides from one target to the next; with reduced motion it jumps.
  const hx = useSharedValue(screen.width / 2);
  const hy = useSharedValue(screen.height / 2);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  useEffect(() => {
    const to = spot ?? { x: screen.width / 2, y: screen.height / 2, width: 0, height: 0 };
    const move = (v: typeof hx, n: number) => {
      v.value = reduceMotion ? n : withSpring(n, SPRING);
    };
    move(hx, to.x);
    move(hy, to.y);
    move(hw, to.width);
    move(hh, to.height);
  }, [hh, hw, hx, hy, reduceMotion, screen.height, screen.width, spot]);

  const sw = screen.width;
  const sh = screen.height;
  const dim = useAnimatedProps(() => ({
    d: holePath({ width: sw, height: sh }, { x: hx.value, y: hy.value, width: hw.value, height: hh.value }, RADIUS),
  }));

  // A soft ring pulses around the spotlight to draw the eye there first.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1);
  }, [pulse, reduceMotion]);
  const ring = useAnimatedStyle(() => ({
    left: hx.value,
    top: hy.value,
    width: hw.value,
    height: hh.value,
    opacity: hw.value > 0 ? 0.9 * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  const top = cardTop(spot, { height: cardH }, screen, insets);
  const cardY = useSharedValue(top);
  useEffect(() => {
    cardY.value = reduceMotion ? top : withSpring(top, SPRING);
  }, [cardY, reduceMotion, top]);
  const cardStyleAnimated = useAnimatedStyle(() => ({ top: cardY.value }));

  const last = index === STEPS.length - 1;
  const finish = () => {
    router.navigate('/');
    onDone();
  };
  const next = () => {
    haptics.select();
    if (last) finish();
    else setIndex(index + 1);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(220)}
      // Catches every touch, so the slider or a tab can't fire under the tour.
      onStartShouldSetResponder={() => true}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
      accessibilityViewIsModal
    >
      <Svg width={sw} height={sh} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <AnimatedPath animatedProps={dim} fill="rgba(6,8,7,0.66)" fillRule="evenodd" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', borderRadius: RADIUS, borderWidth: 2, borderColor: 'rgba(244,241,234,0.9)' }, ring]}
      />

      {ready ? (
        <Animated.View
          key={step.key}
          entering={reduceMotion ? FadeIn.duration(1) : FadeInDown.duration(320).easing(Easing.out(Easing.cubic)).withInitialValues({ transform: [{ translateY: 10 }] })}
          onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}
          style={[{ position: 'absolute', left: 16, right: 16 }, cardStyleAnimated]}
        >
          <View style={[cardStyle(c), { paddingTop: 18 }]} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4 }}>{step.eyebrow}</Text>
              <View style={{ flexDirection: 'row', gap: 5 }} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
                {STEPS.map((s, i) => (
                  <View key={s.key} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? c.fg : c.raised }} />
                ))}
              </View>
            </View>
            <Text accessibilityRole="header" style={{ color: c.fg, fontFamily: fonts.display, fontSize: 22, lineHeight: 26, marginTop: 8 }}>
              {step.title}
            </Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 6 }}>{step.body}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <PressScale to={0.92} accessibilityRole="button" accessibilityLabel="Skip tour" onPress={finish} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>Skip</Text>
              </PressScale>
              <PressScale
                to={0.95}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel={last ? 'Start exploring' : 'Next'}
                onPress={next}
                style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>{last ? 'Start exploring' : 'Next'}</Text>
              </PressScale>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
