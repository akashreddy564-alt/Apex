import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import type { PersonSummary } from '@/lib/friends';
import { fonts } from '@/theme/tokens';

/** Avatar, name and @username. Tapping opens their page; `action` sits on the right. */
export function PersonRow({ person, action }: { person: PersonSummary; action?: ReactNode }) {
  const c = useColors();
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.display_name}, @${person.username}`}
        onPress={() => router.push({ pathname: '/friend/[id]', params: { id: person.id } })}
        className="flex-1 flex-row items-center gap-3 active:opacity-80"
      >
        <Avatar name={person.display_name} />
        <View className="flex-1">
          <Text numberOfLines={1} style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            {person.display_name}
          </Text>
          <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
            @{person.username}
          </Text>
        </View>
      </Pressable>
      {action}
    </View>
  );
}
