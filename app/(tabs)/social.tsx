import { useRouter } from 'expo-router';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/social/Avatar';
import { SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFriendships } from '@/hooks/useFriends';
import type { Profile } from '@/lib/profile';
import { displayXL, fonts } from '@/theme/tokens';

const TILE = 64;

function FriendsSection({ profile }: { profile: Profile }) {
  const c = useColors();
  const router = useRouter();
  const { friends, incoming, loading, error, refetch } = useFriendships();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        onPress={() => router.push('/username')}
        className="mx-4 mt-5 flex-row items-center gap-3 active:opacity-80"
      >
        <Avatar name={profile.display_name} />
        <View className="flex-1">
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>{profile.display_name}</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
            @{profile.username} · {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </Text>
        </View>
      </Pressable>

      {incoming.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/friend-requests')}
          className="mx-4 mt-5 flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-85"
          style={{ backgroundColor: c.accent }}
        >
          <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            {incoming.length === 1
              ? `${incoming[0].display_name} wants to be friends`
              : `${incoming.length} friend requests`}
          </Text>
          <ChevronRight size={18} strokeWidth={1.8} color={c.onAccent} />
        </Pressable>
      ) : null}

      <View className="mx-4 mt-7 flex-row items-baseline justify-between">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Friends</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/friend-requests')} hitSlop={10}>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>Requests</Text>
        </Pressable>
      </View>

      {error ? (
        <View className="mx-4 mt-3 gap-2">
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
          <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingTop: 12 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add friends"
            onPress={() => router.push('/add-friends')}
            className="items-center active:opacity-80"
            style={{ width: TILE }}
          >
            <View
              className="items-center justify-center border border-dashed border-border-strong"
              style={{ width: TILE, height: TILE, borderRadius: TILE / 2 }}
            >
              <UserPlus size={22} strokeWidth={1.6} color={c.fg2} />
            </View>
            <Text numberOfLines={1} style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 6 }}>
              Add
            </Text>
          </Pressable>
          {loading ? <ActivityIndicator color={c.fgMuted} style={{ height: TILE }} /> : null}
          {friends.map((friend) => (
            <Pressable
              key={friend.id}
              accessibilityRole="button"
              accessibilityLabel={friend.display_name}
              onPress={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}
              className="items-center active:opacity-80"
              style={{ width: TILE }}
            >
              <Avatar name={friend.display_name} size={TILE} />
              <Text numberOfLines={1} style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 12, marginTop: 6 }}>
                {friend.display_name.split(/\s+/)[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!loading && !error && friends.length === 0 ? (
        <Text className="mx-4 mt-4" style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>
          Add the people you hike with. You’ll see their hikes on Home and they’ll see yours.
        </Text>
      ) : null}

      <View className="mx-4 mt-8 rounded-2xl bg-surface px-5 py-6">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Groups</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 6 }}>
          Weekly leaderboards with your crew are coming next.
        </Text>
      </View>
    </View>
  );
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
    >
      <Text className="px-4" style={{ ...displayXL, color: c.fg }}>
        Social
      </Text>
      <SignInGate why="add friends and join groups">
        {(profile) => <FriendsSection profile={profile} />}
      </SignInGate>
    </ScrollView>
  );
}
