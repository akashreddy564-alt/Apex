import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Check, Flame, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics, PressScale } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { HERO_PHOTOS } from '@/data/heroPhotos';
import { HERO_PLACES } from '@/data/heroPlaces';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import { SUMMIT_PLACES, summitDayKey, useSummitDay, useTodaySummit } from '@/hooks/useSummit';
import { shareSummit } from '@/lib/dailyRemote';
import { hintFor, MAX_GUESSES, puzzleNumber, reveal, type CompassPoint } from '@/lib/summit';
import { useSummit } from '@/stores/summitStore';
import { withAlpha } from '@/theme/color';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

const ARROW_DEG: Record<CompassPoint, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

function GuessRow({ placeId, answerId, index }: { placeId: string; answerId: string; index: number }) {
  const c = useColors();
  const guess = SUMMIT_PLACES.find((p) => p.id === placeId);
  const answer = SUMMIT_PLACES.find((p) => p.id === answerId);
  if (!guess || !answer) return null;
  const h = hintFor(guess, answer);
  const tone = h.correct ? c.streak : c.fg2;
  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      layout={LinearTransition.duration(200)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: h.correct ? c.streak : c.raised,
        backgroundColor: h.correct ? withAlpha(c.streak, 0.12) : c.surface,
      }}
      accessibilityLabel={
        h.correct
          ? `Guess ${index + 1}, ${guess.name}, correct`
          : `Guess ${index + 1}, ${guess.name}. ${Math.abs(h.elevationFt).toLocaleString('en-US')} feet ${h.elevationFt >= 0 ? 'higher' : 'lower'}, ${h.miles.toLocaleString('en-US')} miles ${h.direction}`
      }
    >
      <Text numberOfLines={1} style={{ flex: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
        {guess.name}
      </Text>
      {h.correct ? (
        <Check size={18} strokeWidth={2.6} color={c.streak} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 74, justifyContent: 'flex-end' }}>
            {h.elevationFt >= 0 ? <ArrowUp size={13} strokeWidth={2.4} color={c.climb} /> : <ArrowDown size={13} strokeWidth={2.4} color={c.climb} />}
            <Text style={{ color: tone, fontSize: 13, ...numericStyle('semibold') }}>{Math.abs(h.elevationFt).toLocaleString('en-US')} ft</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 84, justifyContent: 'flex-end' }}>
            <Text style={{ color: tone, fontSize: 13, ...numericStyle('semibold') }}>{h.miles.toLocaleString('en-US')} mi</Text>
            <View style={{ transform: [{ rotate: `${ARROW_DEG[h.direction]}deg` }] }}>
              <ArrowUp size={14} strokeWidth={2.4} color={c.distance} />
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );
}

function FriendsToday({ day }: { day: string }) {
  const c = useColors();
  const { data } = useSummitDay(day);
  if (!data || data.length === 0) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>FRIENDS TODAY</Text>
      {data.slice(0, 8).map((r) => (
        <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Avatar name={r.displayName} size={28} path={r.avatarPath} />
          <Text numberOfLines={1} style={{ flex: 1, color: r.isMe ? c.fg : c.fg2, fontFamily: r.isMe ? fonts.uiSemibold : fonts.ui, fontSize: 14 }}>
            {r.isMe ? 'You' : r.displayName}
          </Text>
          <Text style={{ color: c.fg, fontSize: 14, ...numericStyle('semibold') }}>{r.guesses > MAX_GUESSES ? 'X' : r.guesses}/{MAX_GUESSES}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Summit: name today's mountain from a zoomed, blurred photo. Each wrong
 * guess says how much higher or lower it is, how far, and which way, and
 * shows more of the photo. Six guesses, one mountain a day.
 */
export default function SummitScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { session } = useMyProfile();
  const { today, answer, guesses, state, shared, streak } = useTodaySummit();
  const guess = useSummit((s) => s.guess);
  const markShared = useSummit((s) => s.markShared);
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const finished = state !== 'playing';
  const wrong = guesses.filter((g) => g !== answer.id).length;
  const { scale, blur } = reveal(wrong, finished);
  const place = HERO_PLACES.find((p) => p.id === answer.id)!;
  const photoW = width - 32;
  const photoH = Math.round(photoW * 0.78);

  // The photo eases out to the next reveal; a wrong guess gives it a little shake.
  const zoom = useSharedValue(scale);
  const shake = useSharedValue(0);
  useEffect(() => {
    zoom.value = withTiming(scale, { duration: finished ? 900 : 520 });
  }, [finished, scale, zoom]);
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const frameStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SUMMIT_PLACES.filter((p) => !guesses.includes(p.id) && (p.name.toLowerCase().includes(q) || p.country.toLowerCase().startsWith(q))).slice(0, 6);
  }, [guesses, query]);

  const submit = (id: string) => {
    if (finished) return;
    setQuery('');
    guess(today, id);
    if (id === answer.id) {
      haptics.success();
    } else {
      haptics.tapMedium();
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 400 }));
    }
  };

  const share = async () => {
    setSharing(true);
    setProblem(null);
    try {
      await shareSummit(today, state === 'won' ? guesses.indexOf(answer.id) + 1 : MAX_GUESSES + 1);
      markShared(today);
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: summitDayKey(today) });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Couldn’t share. Try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>DAILY · #{puzzleNumber(today)}</Text>
          <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 34, marginTop: 4 }}>Summit</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised }}>
          <Flame size={14} color={streak.current > 0 ? c.climb : c.fgFaint} fill={streak.current > 0 ? c.climb : 'none'} strokeWidth={1.8} />
          <Text style={{ color: c.fg, fontSize: 13, ...numericStyle('semibold') }}>{streak.current}</Text>
        </View>
      </View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
        Name this mountain. Each miss shows more of the photo.
      </Text>

      <Animated.View style={[{ marginTop: 14, width: photoW, height: photoH, borderRadius: 20, overflow: 'hidden', backgroundColor: c.raised }, frameStyle]}>
        <Animated.View style={[{ width: photoW, height: photoH }, photoStyle]}>
          <Image source={HERO_PHOTOS[answer.id]} style={{ width: photoW, height: photoH }} contentFit="cover" blurRadius={blur} transition={500} accessible={false} />
        </Animated.View>
        <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 5 }}>
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const g = guesses[i];
            const color = g == null ? 'rgba(255,255,255,0.35)' : g === answer.id ? c.streak : '#F4F1EA';
            return <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />;
          })}
        </View>
      </Animated.View>

      {finished ? (
        <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: 14 }}>
          <Text style={{ color: state === 'won' ? c.streak : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
            {state === 'won' ? (guesses.length === 1 ? 'First try.' : `Got it in ${guesses.length}.`) : 'Not today. It was'}
          </Text>
          <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 28, lineHeight: 32, marginTop: 2 }}>{place.name}</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 2 }}>
            {place.region}, {place.country} · {Math.round(place.elevationM * 3.28084).toLocaleString('en-US')} ft
          </Text>
          <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 10 }}>{place.fact}</Text>
        </Animated.View>
      ) : (
        <View style={{ marginTop: 14 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Guess ${guesses.length + 1} of ${MAX_GUESSES}: type a mountain or trail`}
            placeholderTextColor={c.fgFaint}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Your guess"
            onSubmitEditing={() => {
              if (options.length === 1) submit(options[0]!.id);
            }}
            style={{ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface, paddingHorizontal: 14, color: c.fg, fontFamily: fonts.ui, fontSize: 16 }}
          />
          {options.length > 0 ? (
            <View style={{ marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface, overflow: 'hidden' }}>
              {options.map((p, i) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Guess ${p.name}, ${p.country}`}
                  onPress={() => submit(p.id)}
                  style={({ pressed }) => ({ paddingHorizontal: 14, minHeight: 46, justifyContent: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.raised, backgroundColor: pressed ? c.raised : 'transparent' })}
                >
                  <Text style={{ color: c.fg, fontFamily: fonts.uiMedium, fontSize: 15 }}>{p.name}</Text>
                  <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12 }}>{p.region}, {p.country}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}

      <View style={{ marginTop: 14, gap: 8 }}>
        {[...guesses].reverse().map((id, i) => (
          <GuessRow key={id} placeId={id} answerId={answer.id} index={guesses.length - 1 - i} />
        ))}
      </View>

      {finished ? (
        <View style={[cardStyle(c), { marginTop: 16 }]}>
          {session ? (
            shared ? (
              <Text style={{ color: c.streak, fontFamily: fonts.uiSemibold, fontSize: 14 }}>Shared with friends</Text>
            ) : (
              <PressScale
                to={0.97}
                accessibilityRole="button"
                accessibilityLabel="Share your result to your feed"
                disabled={sharing}
                onPress={() => void share()}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accent, borderRadius: 16, minHeight: 48, opacity: sharing ? 0.6 : 1 }}
              >
                <Share2 size={16} strokeWidth={2} color={c.onAccent} />
                <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Share to your feed</Text>
              </PressScale>
            )
          ) : (
            <PressScale accessibilityRole="button" onPress={() => router.push('/account')} style={{ minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>Sign in to share your result with friends</Text>
            </PressScale>
          )}
          {problem ? <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 13, marginTop: 8 }}>{problem}</Text> : null}
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 12 }}>
            {streak.current > 1 ? `${streak.current} days in a row. ` : ''}A new mountain tomorrow.
          </Text>
          <FriendsToday day={today} />
        </View>
      ) : null}
    </ScrollView>
  );
}
