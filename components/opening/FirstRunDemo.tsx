import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import { ContourTexture, CountUp, DrawIn, GrowBar, haptics } from '@/components/motion';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { challengeFor } from '@/lib/challenges';
import { withAlpha } from '@/theme/color';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

/** How long each scene plays before moving on by itself. */
export const SCENE_MS = 4200;

const ROUTE =
  'M24 196 C 52 180, 60 150, 92 146 S 132 118, 146 96 S 170 52, 204 60 S 246 40, 262 22';

function RecordScene() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 48, 340);
  return (
    <View style={[cardStyle(c), { padding: 0, overflow: 'hidden' }]}>
      <View style={{ height: 220 }}>
        <ContourTexture seed="demo" width={w} height={220} opacity={0.7} color={withAlpha(c.climb, 0.35)} />
        <View style={{ position: 'absolute', inset: 0 }}>
          <Svg width={w} height={220} viewBox="0 0 286 220">
            <DrawIn d={ROUTE} stroke={c.mapLine} strokeWidth={4} duration={2400} delay={250} length={420} />
          </Svg>
        </View>
      </View>
      <View style={{ flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: c.raised }}>
        {[
          { label: 'MILES', value: 4.2, format: (n: number) => n.toFixed(1), color: c.distance },
          { label: 'CLIMB FT', value: 1380, format: (n: number) => Math.round(n).toLocaleString('en-US'), color: c.climb },
          { label: 'TIME', value: 134, format: (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n) % 60).padStart(2, '0')}`, color: c.fg },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1 }}>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>{stat.label}</Text>
            <CountUp value={stat.value} format={stat.format} duration={2400} style={{ color: stat.color, fontSize: 22, marginTop: 2, ...numericStyle('semibold') }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function TrailChoice({ name, region, picked, delay }: { name: string; region: string; picked: boolean; delay: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const lit = useSharedValue(0);
  useEffect(() => {
    if (!picked || reduce) {
      lit.value = picked ? 1 : 0;
      return;
    }
    scale.value = withDelay(delay, withSpring(1.04, { damping: 12, stiffness: 220 }, () => {
      scale.value = withSpring(1);
    }));
    lit.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, [delay, lit, picked, reduce, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: lit.value > 0.5 ? c.accent : c.raised,
  }));
  return (
    <Animated.View style={[{ flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 14, backgroundColor: c.surface, minHeight: 112 }, style]}>
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }} numberOfLines={2}>{name}</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }}>{region}</Text>
    </Animated.View>
  );
}

function RankScene() {
  const c = useColors();
  return (
    <View>
      <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 15, textAlign: 'center' }}>Which did you like more?</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <TrailChoice name="Lake Serene" region="Washington" picked delay={1100} />
        <TrailChoice name="Mount Si" region="Washington" picked={false} delay={0} />
      </View>
      <Animated.View entering={FadeInDown.delay(1700).duration(380)} style={[cardStyle(c), { marginTop: 14, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>YOUR LIST · #2</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16, marginTop: 3 }}>Lake Serene</Text>
        </View>
        <ScoreBadge bucket="loved" count={5} score={8.7} />
      </Animated.View>
    </View>
  );
}

const FRIENDS = [
  { name: 'Maya Chen', trail: 'Half Dome', score: 9.4 },
  { name: 'Jordan Lee', trail: 'Angels Landing', score: 9.1 },
  { name: 'Sam Rivera', trail: 'Raven Cliff Falls', score: 8.2 },
];

function FriendsScene() {
  const c = useColors();
  return (
    <View style={cardStyle(c)}>
      {FRIENDS.map((friend, i) => (
        <Animated.View
          key={friend.name}
          entering={FadeInDown.delay(250 + i * 420).duration(380)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.raised }}
        >
          <Avatar name={friend.name} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>{friend.name}</Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 1 }}>ranked {friend.trail}</Text>
          </View>
          <ScoreBadge bucket="loved" count={5} score={friend.score} size="sm" />
        </Animated.View>
      ))}
    </View>
  );
}

function ChallengeScene() {
  const c = useColors();
  const rows = [
    { name: 'Maya', fraction: 0.82 },
    { name: 'You', fraction: 0.64 },
    { name: 'Jordan', fraction: 0.41 },
  ];
  return (
    <View style={cardStyle(c)}>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>
        {challengeFor('climb').month.toUpperCase()} CHALLENGE
      </Text>
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 17, marginTop: 4 }}>Climb 10,000 ft</Text>
      {rows.map((row, i) => (
        <View key={row.name} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ flex: 1, color: row.name === 'You' ? c.fg : c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>{row.name}</Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
              {Math.round(row.fraction * 10_000).toLocaleString('en-US')} ft
            </Text>
          </View>
          <View style={{ marginTop: 6 }}>
            <GrowBar fraction={row.fraction} color={c.climb} track={c.raised} index={i + 2} height={7} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const DEMO_SCENES: { key: string; title: string; body: string; art: () => ReactNode }[] = [
  {
    key: 'record',
    title: 'Record every hike',
    body: 'Slide to start. Apex tracks your route, distance and climb, even with the screen off.',
    art: () => <RecordScene />,
  },
  {
    key: 'rank',
    title: 'Rank it, don’t rate it',
    body: 'Pick between two hikes a few times and Apex places it on your list. No star ratings.',
    art: () => <RankScene />,
  },
  {
    key: 'friends',
    title: 'See what friends loved',
    body: 'Their ranked hikes fill your feed. Follow each other to swap lists.',
    art: () => <FriendsScene />,
  },
  {
    key: 'climb',
    title: 'Climb together',
    body: 'Monthly challenges with friends, a weekly goal, and a hiking question every day.',
    art: () => <ChallengeScene />,
  },
];

/** The thin bars at the top, one per scene. The current one fills over SCENE_MS. */
function Segment({ state, reduce }: { state: 'done' | 'now' | 'next'; reduce: boolean }) {
  const c = useColors();
  const fill = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    if (state === 'now') {
      fill.value = 0;
      fill.value = reduce ? 1 : withTiming(1, { duration: SCENE_MS, easing: Easing.linear });
    } else fill.value = state === 'done' ? 1 : 0;
  }, [fill, reduce, state]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: c.raised, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: c.fg }, style]} />
    </View>
  );
}

/**
 * First open only, after the opening photo: four short scenes on how Apex
 * works. Plays by itself; tap to move on, Skip to leave.
 */
export function FirstRunDemo({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const last = index === DEMO_SCENES.length - 1;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (last) return;
    timer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, DEMO_SCENES.length - 1)), SCENE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, last]);

  const next = () => {
    haptics.select();
    if (last) onDone();
    else setIndex((i) => i + 1);
  };
  const back = () => {
    if (index > 0) {
      haptics.select();
      setIndex((i) => i - 1);
    }
  };
  const scene = DEMO_SCENES[index]!;

  return (
    <Animated.View
      exiting={FadeOut.duration(260)}
      accessibilityViewIsModal
      style={{ position: 'absolute', inset: 0, backgroundColor: c.bg, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }}
    >
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 20 }}>
        {DEMO_SCENES.map((s, i) => (
          <Segment key={s.key} state={i < index ? 'done' : i === index ? 'now' : 'next'} reduce={reduce} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 12 }}>
        <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 20, letterSpacing: -0.4 }}>apex</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip the tour" onPress={onDone} hitSlop={12}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {/* Tap the left third to go back, anywhere else to go on. */}
        <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
          <Pressable accessibilityLabel="Previous" style={{ flex: 1 }} onPress={back} />
          <Pressable accessibilityLabel="Next" style={{ flex: 2 }} onPress={next} />
        </View>
        <Animated.View
          key={scene.key}
          entering={FadeIn.duration(320)}
          pointerEvents="none"
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        >
          {scene.art()}
          <Text
            accessibilityRole="header"
            style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 34, marginTop: 30 }}
          >
            {scene.title}
          </Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, marginTop: 8 }}>{scene.body}</Text>
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={last ? 'Start exploring' : 'Next'} onPress={next}>
          <View style={{ height: 54, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 16 }}>{last ? 'Start exploring' : 'Next'}</Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
