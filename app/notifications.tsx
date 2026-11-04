import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Avatar } from '@/components/social/Avatar';
import { SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationTarget, notificationText, shortAge, type AppNotification } from '@/lib/safetyRules';
import { fonts } from '@/theme/tokens';

function Row({ item }: { item: AppNotification }) {
  const c = useColors();
  const router = useRouter();
  const text = notificationText(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.actorName} ${text}, ${shortAge(item.createdAt)}${item.read ? '' : ', new'}`}
      onPress={() => router.push(notificationTarget(item))}
      className="flex-row items-start gap-3 px-4 py-3 active:opacity-80"
      style={{ backgroundColor: item.read ? 'transparent' : c.surface }}
    >
      <Avatar name={item.actorName} size={40} />
      <View className="flex-1">
        <Text numberOfLines={3} style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 20 }}>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>{item.actorName}</Text> {text}
        </Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 }}>{shortAge(item.createdAt)}</Text>
      </View>
      {item.read ? null : (
        <View accessibilityElementsHidden className="mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: c.accent }} />
      )}
    </Pressable>
  );
}

function List() {
  const c = useColors();
  const { notifications, loading, refreshing, error, refetch, markRead } = useNotifications();
  const hasUnread = notifications.some((n) => !n.read);
  const marked = useRef(false);

  // Rows stay highlighted while you look; they're marked read as you leave.
  useEffect(() => {
    if (hasUnread) marked.current = false;
  }, [hasUnread]);
  useFocusEffect(
    useCallback(
      () => () => {
        if (!marked.current && hasUnread) {
          marked.current = true;
          markRead();
        }
      },
      [hasUnread, markRead],
    ),
  );

  if (loading) return <ActivityIndicator color={c.fgMuted} style={{ marginTop: 32 }} />;
  if (error) {
    return (
      <View className="gap-2 px-4 pt-6">
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
        <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
      </View>
    );
  }
  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Row item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={c.fgMuted} />}
      ListEmptyComponent={
        <View className="px-6 pt-16">
          <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 19, textAlign: 'center' }}>Nothing yet</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: 'center' }}>
            Friend requests, likes, comments and who passed you this week show up here.
          </Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

/** The bell: friend requests, joins, likes, comments and "passed you". */
export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-bg">
      <SignInGate why="see your notifications">{() => <List />}</SignInGate>
    </View>
  );
}
