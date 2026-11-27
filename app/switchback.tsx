import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flame, RotateCcw, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ContourTexture, haptics, PressScale } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import { switchbackDayKey, useSwitchbackDay, useTodaySwitchback } from '@/hooks/useSwitchback';
import { formatTime, isSolved, reached, touch, type Cell } from '@/lib/switchback';
import { shareSwitchback } from '@/lib/switchbackRemote';
import { useSwitchback } from '@/stores/switchbackStore';
import { withAlpha } from '@/theme/color';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

const PAD = 16;

/** Ticking clock from the first touch until solved. */
function useClock(startedAt: number | null, stoppedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null || stoppedAt != null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, stoppedAt]);
  if (startedAt == null) return 0;
  return ((stoppedAt ?? now) - startedAt) / 1000;
}

function Leaderboard({ day }: { day: string }) {
  const c = useColors();
  const { data } = useSwitchbackDay(day);
  if (!data || data.length === 0) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>FRIENDS TODAY</Text>
      {data.slice(0, 8).map((r, i) => (
        <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Text style={{ width: 18, color: c.fgFaint, ...numericStyle('semibold'), fontSize: 13 }}>{i + 1}</Text>
          <Avatar name={r.displayName} size={28} path={r.avatarPath} />
          <Text numberOfLines={1} style={{ flex: 1, color: r.isMe ? c.fg : c.fg2, fontFamily: r.isMe ? fonts.uiSemibold : fonts.ui, fontSize: 14 }}>
            {r.isMe ? 'You' : r.displayName}
          </Text>
          <Text style={{ color: c.fg, fontSize: 14, ...numericStyle('semibold') }}>{formatTime(r.seconds)}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Switchback: draw one trail from cairn 1 through every cairn in order,
 * covering every square once. Drag to draw; drag back over the trail to undo.
 * One puzzle a day, the same for everyone, with a streak.
 */
export default function SwitchbackScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { session } = useMyProfile();
  const { today, puzzle, seconds: solvedSeconds, shared, streak } = useTodaySwitchback();
  const record = useSwitchback((s) => s.record);
  const markShared = useSwitchback((s) => s.markShared);

  const board = Math.min(width - PAD * 2, 420);
  const cell = board / puzzle.size;
  const [trail, setTrail] = useState<Cell[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const elapsed = useClock(startedAt, solvedAt);
  const lastCell = useRef<Cell | null>(null);
  const trailRef = useRef<Cell[]>([]);
  const startedRef = useRef<number | null>(null);
  const done = solvedAt != null;
  const replay = solvedSeconds != null && !done;

  const pop = useSharedValue(1);
  const boardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const cellAt = (x: number, y: number): Cell | null => {
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || row < 0 || col >= puzzle.size || row >= puzzle.size) return null;
    return row * puzzle.size + col;
  };

  const step = (x: number, y: number) => {
    if (done) return;
    const at = cellAt(x, y);
    if (at == null || at === lastCell.current) return;
    lastCell.current = at;
    const prev = trailRef.current;
    const next = touch(puzzle, prev, at);
    if (next.length === prev.length && next.every((v, i) => v === prev[i])) return;
    trailRef.current = next;
    setTrail(next);
    const began = startedRef.current ?? Date.now();
    if (startedRef.current == null) {
      startedRef.current = began;
      setStartedAt(began);
    }
    if (next.length > prev.length) {
      if (puzzle.cairns[at] != null) haptics.tapMedium();
      else haptics.select();
    } else haptics.tapLight();
    if (isSolved(puzzle, next)) {
      const end = Date.now();
      setSolvedAt(end);
      // Replays after today's solve are practice: the first time stands.
      record(today, Math.max(1, Math.round((end - began) / 1000)));
      haptics.success();
      pop.value = withSequence(withTiming(1.03, { duration: 160 }), withSpring(1, { damping: 10, stiffness: 220 }));
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      lastCell.current = null;
      step(e.x, e.y);
    })
    .onUpdate((e) => step(e.x, e.y))
    .onFinalize(() => {
      lastCell.current = null;
    });

  const reset = () => {
    haptics.tapLight();
    setTrail([]);
    trailRef.current = [];
    startedRef.current = null;
    setSolvedAt(null);
    setStartedAt(null);
    lastCell.current = null;
  };

  const share = async () => {
    const secs = solvedSeconds ?? Math.round(elapsed);
    setSharing(true);
    setProblem(null);
    try {
      await shareSwitchback(today, secs, puzzle.size);
      markShared(today);
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: switchbackDayKey(today) });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Couldn’t share. Try again.');
    } finally {
      setSharing(false);
    }
  };

  const centre = (i: Cell) => ({ x: (i % puzzle.size) * cell + cell / 2, y: Math.floor(i / puzzle.size) * cell + cell / 2 });
  const points = useMemo(() => trail.map((i) => centre(i)).map((p) => `${p.x},${p.y}`).join(' '), [trail, cell]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = reached(puzzle, trail) + 1;
  const filled = trail.length;
  const total = puzzle.size * puzzle.size;
  const shownSeconds = done ? Math.round(elapsed) : elapsed;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: PAD, paddingBottom: 48 }} scrollEnabled={trail.length === 0 || done}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>DAILY PUZZLE · {puzzle.size}×{puzzle.size}</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 34, marginTop: 4 }}>Switchback</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised }}>
          <Flame size={14} color={streak.current > 0 ? c.climb : c.fgFaint} fill={streak.current > 0 ? c.climb : 'none'} strokeWidth={1.8} />
          <Text style={{ color: c.fg, fontSize: 13, ...numericStyle('semibold') }}>{streak.current}</Text>
        </View>
      </View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
        Draw one trail from cairn 1 through every cairn in order, filling every square once.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 }}>
        <Text style={{ color: c.fg, fontSize: 22, ...numericStyle('semibold') }}>{formatTime(shownSeconds)}</Text>
        <Text style={{ color: c.fgMuted, fontSize: 13, ...numericStyle('medium') }}>
          {filled}/{total} squares{!done && next <= puzzle.last ? ` · next cairn ${next}` : ''}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityLabel={`Switchback puzzle, ${puzzle.size} by ${puzzle.size}. ${filled} of ${total} squares filled.`}
          style={[{ width: board, height: board, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: done ? c.streak : c.raised, alignSelf: 'center' }, boardStyle]}
        >
          <ContourTexture seed={`switchback-${today}`} width={board} height={board} opacity={0.5} color={withAlpha(c.climb, 0.22)} />
          <Svg width={board} height={board} style={{ position: 'absolute', top: 0, left: 0 }}>
            {Array.from({ length: puzzle.size - 1 }, (_, i) => (
              <Line key={`v${i}`} x1={(i + 1) * cell} y1={0} x2={(i + 1) * cell} y2={board} stroke={c.raised} strokeWidth={1} />
            ))}
            {Array.from({ length: puzzle.size - 1 }, (_, i) => (
              <Line key={`h${i}`} x1={0} y1={(i + 1) * cell} x2={board} y2={(i + 1) * cell} stroke={c.raised} strokeWidth={1} />
            ))}
            {trail.length > 1 ? (
              <>
                <Polyline points={points} fill="none" stroke={withAlpha(done ? c.streak : c.climb, 0.25)} strokeWidth={cell * 0.62} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points={points} fill="none" stroke={done ? c.streak : c.climb} strokeWidth={cell * 0.26} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
            {trail.length > 0 ? (
              <Circle cx={centre(trail[trail.length - 1]!).x} cy={centre(trail[trail.length - 1]!).y} r={cell * 0.2} fill={c.fg} />
            ) : null}
          </Svg>
          {Object.entries(puzzle.cairns).map(([k, n]) => {
            const p = centre(Number(k));
            const got = n < next || done;
            const size = cell * 0.62;
            return (
              <View
                key={k}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: p.x - size / 2,
                  top: p.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: got ? c.fg : c.bg,
                  borderWidth: 2,
                  borderColor: n === next && !done ? c.climb : c.fg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: got ? c.bg : c.fg, fontFamily: fonts.poster, fontSize: Math.max(13, cell * 0.3), lineHeight: Math.max(16, cell * 0.36) }}>{n}</Text>
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
        <PressScale accessibilityRole="button" accessibilityLabel="Start over" onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14 }}>
          <RotateCcw size={15} strokeWidth={1.9} color={c.fgMuted} />
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>Start over</Text>
        </PressScale>
      </View>

      {done || replay ? (
        <Animated.View entering={FadeInDown.duration(320)} style={[cardStyle(c), { marginTop: 10 }]}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>{done && !replay ? 'SOLVED' : 'TODAY'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <Text style={{ color: c.fg, fontSize: 34, lineHeight: 38, ...numericStyle('semibold') }}>{formatTime(solvedSeconds ?? shownSeconds)}</Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>
              {streak.current > 1 ? `${streak.current} days in a row` : 'Day one of a streak'}
            </Text>
          </View>
          {replay && !done ? (
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }}>You solved today’s. Play again for fun; your first time stands.</Text>
          ) : null}
          {session ? (
            shared ? (
              <Animated.Text entering={FadeIn} style={{ color: c.streak, fontFamily: fonts.uiSemibold, fontSize: 14, marginTop: 14 }}>
                Shared with friends
              </Animated.Text>
            ) : (
              <PressScale
                to={0.97}
                accessibilityRole="button"
                accessibilityLabel="Share your time with friends"
                disabled={sharing}
                onPress={() => void share()}
                style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accent, borderRadius: 16, minHeight: 48, opacity: sharing ? 0.6 : 1 }}
              >
                <Share2 size={16} strokeWidth={2} color={c.onAccent} />
                <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Share to your feed</Text>
              </PressScale>
            )
          ) : (
            <PressScale accessibilityRole="button" onPress={() => router.push('/account')} style={{ marginTop: 14, minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>Sign in to share your time with friends</Text>
            </PressScale>
          )}
          {problem ? <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 13, marginTop: 8 }}>{problem}</Text> : null}
          <Leaderboard day={today} />
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}
