import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useTastePicks } from '@/hooks/useRankLists';
import type { TastePick } from '@/lib/rankListRules';
import { cardStyle, fonts } from '@/theme/tokens';

/** "Maya and 1 other with your taste loved this". */
export function tasteLovedLine(pick: Pick<TastePick, 'names' | 'lovers'>): string {
  const first = (pick.names[0] ?? 'Someone').split(/\s+/)[0];
  const others = Math.max(0, pick.lovers - 1);
  if (others === 0) return `${first}, who shares your taste, loved this`;
  return `${first} and ${others} ${others === 1 ? 'other' : 'others'} with your taste loved this`;
}

/** Home: trails loved by people whose rankings agree with yours. Hidden when there are none. */
export function TastePicks() {
  const c = useColors();
  const router = useRouter();
  const { data } = useTastePicks();
  if (data.length === 0) return null;
  return (
    <View style={{ paddingTop: 20, paddingBottom: 16 }}>
      <View className="px-4">
        <Eyebrow>For your taste</Eyebrow>
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18, marginTop: 4 }}>Trails your kind of hiker loved</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 12 }}>
        {data.map((pick) => (
          <Pressable
            key={pick.trailId}
            accessibilityRole="button"
            accessibilityLabel={`${pick.name}. ${tasteLovedLine(pick)}`}
            onPress={() => router.push({ pathname: '/trail/[id]', params: { id: pick.trailId } })}
            className="active:opacity-80"
            style={[cardStyle(c), { width: 220 }]}
          >
            <Text numberOfLines={2} style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>{pick.name}</Text>
            {pick.region ? (
              <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>{pick.region}</Text>
            ) : null}
            <Text numberOfLines={3} style={{ color: c.accent, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 18, marginTop: 10 }}>
              {tasteLovedLine(pick)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Trail page: the same line when this trail is one of your picks. */
export function TrailTasteLine({ trailId }: { trailId: string }) {
  const c = useColors();
  const { data } = useTastePicks();
  const pick = data.find((row) => row.trailId === trailId);
  if (!pick) return null;
  return (
    <Text style={{ color: c.accent, fontFamily: fonts.uiMedium, fontSize: 14, marginTop: 14 }}>{tasteLovedLine(pick)}</Text>
  );
}
