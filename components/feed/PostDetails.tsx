import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { companionsLine } from '@/lib/hikeDetails';
import type { FeedPost } from '@/lib/postRules';
import { fonts } from '@/theme/tokens';

/**
 * Who they hiked with (each name opens that person), what the trail was like,
 * and the gear they used. A feed card shows the first two; the hike page all.
 */
export function PostDetails({ post, full }: { post: FeedPost; full: boolean }) {
  const c = useColors();
  const router = useRouter();
  // Posts cached before these fields existed have none of them.
  const companions = post.companions ?? [];
  const gear = post.gear ?? [];
  const line = companionsLine(companions.map((p) => p.displayName));
  const chips = [...(post.terrain ?? []), ...(post.conditions ?? [])];
  if (!line && chips.length === 0 && (!full || gear.length === 0)) return null;

  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      {line ? (
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }} accessibilityLabel={line}>
          with{' '}
          {companions.slice(0, 3).map((person, i, shown) => (
            <Text key={person.id}>
              <Text
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/friend/[id]', params: { id: person.id } })}
                style={{ color: c.fg, fontFamily: fonts.uiSemibold }}
              >
                {person.displayName}
              </Text>
              {i < shown.length - 2 ? ', ' : i === shown.length - 2 ? (companions.length > 3 ? ', ' : ' and ') : ''}
            </Text>
          ))}
          {companions.length > 3 ? ` and ${companions.length - 3} others` : ''}
        </Text>
      ) : null}
      {chips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(full ? chips : chips.slice(0, 4)).map((chip) => (
            <View key={chip} style={{ borderRadius: 999, backgroundColor: c.raised, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 12 }}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {full && gear.length > 0 ? (
        <View>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 }}>GEAR</Text>
          <Text style={{ marginTop: 3, color: c.fg2, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>{gear.join(' · ')}</Text>
        </View>
      ) : null}
    </View>
  );
}
