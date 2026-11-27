import { useRouter } from 'expo-router';
import { ChevronRight, Flame } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';

import { PressScale } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { useSwitchbackDay, useTodaySwitchback } from '@/hooks/useSwitchback';
import { formatTime } from '@/lib/switchback';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

/** A tiny switchback trail on a grid: the puzzle's icon. */
function Mark({ solved }: { solved: boolean }) {
  const c = useColors();
  const tone = solved ? c.streak : c.climb;
  return (
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, borderWidth: 1, borderColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Rect x={1} y={1} width={24} height={24} rx={4} fill="none" stroke={c.raised} strokeWidth={1} />
        <Polyline points="5,21 5,13 13,13 13,5 21,5 21,21" fill="none" stroke={tone} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** One line on Home for today's Switchback: play it, or your time and streak once solved. */
export function SwitchbackRow() {
  const c = useColors();
  const router = useRouter();
  const { seconds, streak, puzzle } = useTodaySwitchback();
  const solved = seconds != null;
  return (
    <PressScale
      to={0.985}
      accessibilityRole="button"
      accessibilityLabel={solved ? `Switchback, solved in ${formatTime(seconds)}, ${streak.current} day streak` : `Switchback, today's ${puzzle.size} by ${puzzle.size} puzzle`}
      onPress={() => router.push('/switchback')}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
    >
      <Mark solved={solved} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Switchback</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 1 }}>
          {solved ? `Solved in ${formatTime(seconds)}` : `Today’s ${puzzle.size}×${puzzle.size} trail puzzle`}
        </Text>
      </View>
      {streak.current > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Flame size={14} color={c.climb} fill={c.climb} strokeWidth={1.6} />
          <Text style={{ color: c.fg, fontSize: 13, ...numericStyle('semibold') }}>{streak.current}</Text>
        </View>
      ) : (
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 13 }}>Play</Text>
      )}
      <ChevronRight size={16} strokeWidth={1.8} color={c.fgFaint} />
    </PressScale>
  );
}

/** In the friends feed: today's shared Switchback times, fastest first. Hidden until someone shares. */
export function SwitchbackFeedCard() {
  const c = useColors();
  const router = useRouter();
  const { today, seconds } = useTodaySwitchback();
  const { data } = useSwitchbackDay(today);
  const others = (data ?? []).filter((r) => !r.isMe);
  if (others.length === 0) return null;
  const rows = (data ?? []).slice(0, 4);
  return (
    <PressScale
      to={0.985}
      accessibilityRole="button"
      accessibilityLabel={`Switchback today. ${rows.map((r) => `${r.isMe ? 'You' : r.displayName} ${formatTime(r.seconds)}`).join(', ')}`}
      onPress={() => router.push('/switchback')}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mark solved={seconds != null} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>SWITCHBACK TODAY</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15, marginTop: 2 }}>
            {others.length === 1 ? `${others[0]!.displayName.split(/\s+/)[0]} solved it` : `${others.length} friends solved it`}
          </Text>
        </View>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 13 }}>{seconds != null ? 'View' : 'Play'}</Text>
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {rows.map((r, i) => (
          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ width: 16, color: c.fgFaint, fontSize: 13, ...numericStyle('semibold') }}>{i + 1}</Text>
            <Avatar name={r.displayName} size={26} path={r.avatarPath} />
            <Text numberOfLines={1} style={{ flex: 1, color: r.isMe ? c.fg : c.fg2, fontFamily: r.isMe ? fonts.uiSemibold : fonts.ui, fontSize: 14 }}>
              {r.isMe ? 'You' : r.displayName}
            </Text>
            <Text style={{ color: c.fg, fontSize: 14, ...numericStyle('semibold') }}>{formatTime(r.seconds)}</Text>
          </View>
        ))}
      </View>
    </PressScale>
  );
}
