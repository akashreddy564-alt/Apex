import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { FollowButton } from '@/components/social/FollowButton';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFollowList, type FollowKind } from '@/hooks/useFollows';
import { fonts } from '@/theme/tokens';

const TABS: { kind: FollowKind; label: string }[] = [
  { kind: 'followers', label: 'Followers' },
  { kind: 'following', label: 'Following' },
];

/** Who follows a person, and whom they follow. Rows open the person; you can follow back from here. */
export default function FollowsScreen() {
  const c = useColors();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? null;
  const { id, kind: initial } = useLocalSearchParams<{ id: string; kind?: string }>();
  const [kind, setKind] = useState<FollowKind>(initial === 'following' ? 'following' : 'followers');
  const { people, loading } = useFollowList(String(id), kind);

  return (
    <View className="flex-1 bg-bg">
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {TABS.map((tab) => {
          const on = tab.kind === kind;
          return (
            <Pressable
              key={tab.kind}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setKind(tab.kind)}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? c.fg : c.surface,
                  borderWidth: 1,
                  borderColor: on ? c.fg : c.raised,
                }}
              >
                <Text style={{ color: on ? c.bg : c.fg2, fontFamily: fonts.uiSemibold, fontSize: 14 }}>{tab.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Skeleton shape="row" count={6} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(person) => person.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={{ marginTop: 24, textAlign: 'center', color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15 }}>
              {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </Text>
          }
          renderItem={({ item }) => {
            const name = item.displayName || item.username;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.raised }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${name}, @${item.username}`}
                  onPress={() => router.push({ pathname: '/friend/[id]', params: { id: item.id } })}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Avatar name={name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                </Pressable>
                {item.id !== me ? <FollowButton personId={item.id} name={name} following={item.iFollow} compact /> : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
