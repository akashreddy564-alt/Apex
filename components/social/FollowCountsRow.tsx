import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useFollowCounts } from '@/hooks/useFollows';
import { fonts } from '@/theme/tokens';

/** "12 followers · 30 following" for a person; each opens the list. Nothing until counts load. */
export function FollowCountsRow({ personId }: { personId: string }) {
  const c = useColors();
  const router = useRouter();
  const { counts } = useFollowCounts(personId);
  if (!counts) return null;
  const item = (n: number, label: string, kind: 'followers' | 'following') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
      onPress={() => router.push({ pathname: '/follows/[id]', params: { id: personId, kind } })}
      hitSlop={8}
    >
      <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>{n}</Text> {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 }}>
      {item(counts.followers, counts.followers === 1 ? 'follower' : 'followers', 'followers')}
      <Text style={{ color: c.fgFaint, fontSize: 14 }}>·</Text>
      {item(counts.following, 'following', 'following')}
    </View>
  );
}
