import { useRouter } from 'expo-router';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useWeekendPick } from '@/hooks/useWeekendPick';
import { fonts } from '@/theme/tokens';

/**
 * The one dark card on Home. Opens Log, where the hiker slides to start:
 * a tap alone never starts GPS. Mentions the weekend pick when there is one.
 */
export function StartHikeCard() {
  const c = useColors();
  const router = useRouter();
  const { pick } = useWeekendPick();
  const subtitle = pick ? `Weekend pick: ${pick.trail.name}` : 'Records your route, even locked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start a hike"
      accessibilityHint="Opens Log, where you slide to start recording"
      onPress={() => router.navigate('/(tabs)/log')}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 22,
          backgroundColor: c.accent,
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 17 }}>Start a hike</Text>
          <Text style={{ color: c.onAccent, opacity: 0.75, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.onAccent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowRight size={18} strokeWidth={2} color={c.accent} />
        </View>
      </View>
    </Pressable>
  );
}

/** One line, signed out: where friends' hikes would be. Opens sign-in. */
export function SignInStrip() {
  const c = useColors();
  const router = useRouter();
  const label = "Sign in to see friends' hikes";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push('/account')}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          borderRadius: 14,
          backgroundColor: c.raised,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.uiMedium, fontSize: 14 }}>{label}</Text>
        <ChevronRight size={18} strokeWidth={1.8} color={c.fgMuted} />
      </View>
    </Pressable>
  );
}
