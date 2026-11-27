import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame, Mountain } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { HERO_PHOTOS } from '@/data/heroPhotos';
import { useColors } from '@/hooks/useColors';
import { useSummitDay, useTodaySummit } from '@/hooks/useSummit';
import { MAX_GUESSES, puzzleNumber } from '@/lib/summit';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

/** Today's photo, blurred until you've played, as the row's thumbnail. */
function Thumb({ done }: { done: boolean }) {
  const c = useColors();
  const { answer } = useTodaySummit();
  return (
    <View style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={HERO_PHOTOS[answer.id]} style={{ position: 'absolute', width: 40, height: 40 }} contentFit="cover" blurRadius={done ? 0 : 14} accessible={false} />
      {!done ? <Mountain size={18} strokeWidth={2} color="#F4F1EA" /> : null}
    </View>
  );
}

/** One line on Home for today's Summit: play it, or your score and streak once done. */
export function SummitRow() {
  const c = useColors();
  const router = useRouter();
  const { today, state, guesses, streak } = useTodaySummit();
  const done = state !== 'playing';
  const line =
    state === 'won' ? `Got it in ${guesses.length}` : state === 'lost' ? 'Missed today’s' : guesses.length > 0 ? `${MAX_GUESSES - guesses.length} guesses left` : 'Name today’s mountain';
  return (
    <PressScale
      to={0.985}
      accessibilityRole="button"
      accessibilityLabel={`Summit number ${puzzleNumber(today)}. ${line}. ${streak.current} day streak`}
      onPress={() => router.push('/summit')}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
    >
      <Thumb done={done} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Summit</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 1 }}>{line}</Text>
      </View>
      {streak.current > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Flame size={14} color={c.climb} fill={c.climb} strokeWidth={1.6} />
          <Text style={{ color: c.fg, fontSize: 13, ...numericStyle('semibold') }}>{streak.current}</Text>
        </View>
      ) : !done ? (
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 13 }}>Play</Text>
      ) : null}
      <ChevronRight size={16} strokeWidth={1.8} color={c.fgFaint} />
    </PressScale>
  );
}

/** In the friends feed: today's shared Summit scores. Hidden until a friend shares. */
export function SummitFeedCard() {
  const c = useColors();
  const router = useRouter();
  const { today, state } = useTodaySummit();
  const { data } = useSummitDay(today);
  const others = (data ?? []).filter((r) => !r.isMe);
  if (others.length === 0) return null;
  const rows = (data ?? []).slice(0, 4);
  const score = (g: number) => `${g > MAX_GUESSES ? 'X' : g}/${MAX_GUESSES}`;
  return (
    <PressScale
      to={0.985}
      accessibilityRole="button"
      accessibilityLabel={`Summit today. ${rows.map((r) => `${r.isMe ? 'You' : r.displayName} ${score(r.guesses)}`).join(', ')}`}
      onPress={() => router.push('/summit')}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 12 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Thumb done={state !== 'playing'} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>SUMMIT #{puzzleNumber(today)}</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15, marginTop: 2 }}>
            {others.length === 1 ? `${others[0]!.displayName.split(/\s+/)[0]} played today` : `${others.length} friends played today`}
          </Text>
        </View>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 13 }}>{state === 'playing' ? 'Play' : 'View'}</Text>
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {rows.map((r) => (
          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name={r.displayName} size={26} path={r.avatarPath} />
            <Text numberOfLines={1} style={{ flex: 1, color: r.isMe ? c.fg : c.fg2, fontFamily: r.isMe ? fonts.uiSemibold : fonts.ui, fontSize: 14 }}>
              {r.isMe ? 'You' : r.displayName}
            </Text>
            <Text style={{ color: c.fg, fontSize: 14, ...numericStyle('semibold') }}>{score(r.guesses)}</Text>
          </View>
        ))}
      </View>
    </PressScale>
  );
}
