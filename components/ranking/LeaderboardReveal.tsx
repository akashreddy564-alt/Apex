import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { CountUp, haptics, PressScale } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { BUCKET_BANDS, formatRankScore, type Bucket } from '@/lib/ranking';
import { withAlpha } from '@/theme/color';
import { fonts, numericStyle } from '@/theme/tokens';
import type { LeaderboardEntry } from '@/types/trail';

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };
/** Scores show from the third hike in a bucket; before that a place in it means more than a number. */
const SCORE_FROM = 3;

interface LeaderboardRevealProps {
  entries: LeaderboardEntry[];
  ordinalRank: number;
  score: number;
  /** Full bucket size, including rows that are not on screen. */
  count: number;
  bucket: Bucket;
  trailName: string;
  /** Back to the last pick, or to the rating when there were no picks. */
  onBack: () => void;
  onDone: () => void;
}

function Row({ entry, index, count, tone }: { entry: LeaderboardEntry; index: number; count: number; tone: string }) {
  const c = useColors();
  const scale = useSharedValue(entry.isNew ? 0.94 : 1);
  useEffect(() => {
    if (entry.isNew) scale.value = withDelay(420, withSpring(1, SPRING));
  }, [entry.isNew, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(380 + index * 45).springify().damping(20)} style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderRadius: 14,
          backgroundColor: entry.isNew ? withAlpha(tone, 0.16) : 'transparent',
          borderWidth: entry.isNew ? 1 : 0,
          borderColor: withAlpha(tone, 0.5),
        }}
      >
        <Text style={{ width: 28, fontFamily: fonts.poster, fontSize: 20, lineHeight: 24, color: entry.isNew ? tone : c.fgFaint }}>
          {entry.ordinal}
        </Text>
        <Text numberOfLines={1} style={{ flex: 1, color: entry.isNew ? c.fg : c.fg2, fontFamily: entry.isNew ? fonts.uiSemibold : fonts.ui, fontSize: 15 }}>
          {entry.trail.name}
        </Text>
        {count >= SCORE_FROM ? (
          <Text style={{ color: entry.isNew ? tone : c.fgMuted, fontSize: 14, ...numericStyle('semibold') }}>{formatRankScore(entry.score)}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** The score inside a ring in the bucket's color, which draws itself in as the number counts up. */
function ScoreDisc({ score, count, bucket, tone }: { score: number; count: number; bucket: Bucket; tone: string }) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const size = 168;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.max(0.04, Math.min(1, score / 10));
  const pop = useSharedValue(reduceMotion ? 1 : 0.86);
  useEffect(() => {
    if (reduceMotion) return;
    pop.value = withSequence(withTiming(1.04, { duration: 380, easing: Easing.out(Easing.cubic) }), withSpring(1, SPRING));
  }, [pop, reduceMotion]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const showScore = count >= SCORE_FROM;

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, popStyle]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={withAlpha(tone, 0.18)} strokeWidth={stroke} fill={withAlpha(tone, 0.07)} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - (showScore ? fraction : 1))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showScore ? (
        <CountUp value={score} format={(n) => formatRankScore(n)} duration={900} style={{ color: c.fg, fontSize: 48, lineHeight: 54, ...numericStyle('semibold') }} />
      ) : (
        <Text style={{ color: tone, fontFamily: fonts.displayExtraBold, fontSize: 26, lineHeight: 30 }}>{BUCKET_BANDS[bucket].label}</Text>
      )}
    </Animated.View>
  );
}

/**
 * Where a hike landed: its score drawn into a ring, its place in the bucket,
 * and the list around it with the new hike sliding into place. Done saves.
 * The first hike in a bucket gets its own moment instead of a one-row list.
 */
export function LeaderboardReveal({ entries, ordinalRank, score, bucket, count, trailName, onBack, onDone }: LeaderboardRevealProps) {
  const c = useColors();
  const tone = c[bucket];
  const label = BUCKET_BANDS[bucket].label;
  const first = count === 1;

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: 'center', paddingTop: 18 }}>
        <ScoreDisc score={score} count={count} bucket={bucket} tone={tone} />
        <Animated.Text
          entering={FadeIn.delay(200).duration(300)}
          numberOfLines={2}
          style={{ marginTop: 18, color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 26, lineHeight: 30, textAlign: 'center', paddingHorizontal: 12 }}
        >
          {trailName}
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(280).duration(300)} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: withAlpha(tone, 0.14) }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
          <Text style={{ color: tone, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
            {first ? `Your first ${label} hike` : `#${ordinalRank} of ${count} ${label}`}
          </Text>
        </Animated.View>
      </View>

      {first ? (
        <Animated.View
          entering={FadeInDown.delay(380).duration(360)}
          style={{ marginTop: 26, borderRadius: 18, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface, padding: 16 }}
        >
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Your list grows from here</Text>
          <Text style={{ marginTop: 6, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>
            Next time you rate a hike {label}, Apex asks which was better and slots it in. Scores show once you have three.
          </Text>
        </Animated.View>
      ) : (
        <View style={{ marginTop: 22, borderRadius: 18, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface, padding: 6 }}>
          {entries.map((entry, index) => (
            <Row key={entry.trail.id} entry={entry} index={index} count={count} tone={tone} />
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />
      <PressScale
        to={0.97}
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel="Done"
        onPress={() => {
          haptics.success();
          onDone();
        }}
        style={{ backgroundColor: c.accent, borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Done</Text>
      </PressScale>
      <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={{ alignSelf: 'center', marginTop: 12, minHeight: 36, justifyContent: 'center' }}>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>{first ? 'Change rating' : 'Undo last pick'}</Text>
      </Pressable>
    </View>
  );
}
