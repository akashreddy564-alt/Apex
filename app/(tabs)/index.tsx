import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CircleCheck, Compass } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/feed/PostCard';
import { NotificationAsk } from '@/components/habit/NotificationAsk';
import { StreakChip } from '@/components/habit/StreakChip';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFeed, useLike } from '@/hooks/useFeed';
import { useFriendships } from '@/hooks/useFriends';
import { useMyRankedTrails } from '@/hooks/useMyRankedTrails';
import { useMyProfile } from '@/hooks/useProfile';
import { caughtUpIndex, type FeedPost } from '@/lib/feed';
import { fonts } from '@/theme/tokens';

/** Coming back to Home refetches when the feed is older than this. */
const STALE_ON_FOCUS_MS = 30_000;
const SEEN_KEY = 'apex-feed-seen';

function CaughtUp({ end = false }: { end?: boolean }) {
  const c = useColors();
  return (
    <View accessibilityRole="text" className="items-center px-4 py-7">
      <CircleCheck size={30} strokeWidth={1.5} color={c.accent} />
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15, marginTop: 10 }}>You’re all caught up</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 3 }}>
        {end ? 'That’s every hike from you and your friends.' : 'You’ve seen everything new. Older hikes are below.'}
      </Text>
    </View>
  );
}

function Header() {
  const c = useColors();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between px-4">
      <View className="flex-row items-center gap-3">
        <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: -0.4 }}>apex</Text>
        <StreakChip />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Browse trails"
        onPress={() => router.push('/trails')}
        hitSlop={8}
        className="flex-row items-center gap-1.5 active:opacity-70"
        style={{ minHeight: 44 }}
      >
        <Compass size={18} strokeWidth={1.6} color={c.fg2} />
        <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>Trails</Text>
      </Pressable>
    </View>
  );
}

function EmptyFeed() {
  const c = useColors();
  const router = useRouter();
  const { friends, loading } = useFriendships();
  const noFriends = !loading && friends.length === 0;
  return (
    <View className="mx-4 mt-6 rounded-2xl bg-surface px-5 py-7">
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 19 }}>
        {noFriends ? 'Hike with friends' : 'No hikes yet'}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 6 }}>
        {noFriends
          ? 'Add the people you hike with. Their ranked hikes show up here, and yours show up for them.'
          : 'When you or your friends rank a hike, it shows up here.'}
      </Text>
      <View className="mt-5">
        {noFriends ? (
          <PrimaryButton label="Add friends" onPress={() => router.push('/add-friends')} />
        ) : (
          <SecondaryButton label="Browse trails" onPress={() => router.push('/trails')} />
        )}
      </View>
    </View>
  );
}

function Feed() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, loading, refreshing, error, refetch, loadMore, loadingMore, hasMore } = useFeed();
  const like = useLike();
  const mine = useMyRankedTrails();
  const lastFetch = useRef(0);

  // What they'd seen when they last left Home. Read on arrival, so the marker
  // stays put while they scroll; written whenever they leave.
  const [seenUpTo, setSeenUpTo] = useState<string | null>(null);
  const newest = posts[0]?.postedAt ?? null;
  const newestRef = useRef(newest);
  newestRef.current = newest;
  const markSeen = useCallback(() => {
    if (newestRef.current) void AsyncStorage.setItem(SEEN_KEY, newestRef.current).catch(() => undefined);
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') markSeen();
    });
    return () => sub.remove();
  }, [markSeen]);
  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem(SEEN_KEY).then(setSeenUpTo).catch(() => undefined);
      return markSeen;
    }, [markSeen]),
  );
  const marker = caughtUpIndex(
    posts.map((post) => post.postedAt),
    seenUpTo,
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (lastFetch.current && now - lastFetch.current > STALE_ON_FOCUS_MS) void refetch();
      lastFetch.current = now;
    }, [refetch]),
  );

  const open = useCallback(
    (post: FeedPost, focusComment?: boolean) =>
      router.push({ pathname: '/post/[id]', params: focusComment ? { id: post.id, comment: '1' } : { id: post.id } }),
    [router],
  );

  let empty = null;
  if (loading) {
    empty = <ActivityIndicator color={c.fgMuted} style={{ marginTop: 48 }} />;
  } else if (error) {
    empty = (
      <View className="mx-4 mt-6 gap-3 rounded-2xl bg-surface px-5 py-6">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Couldn’t load your feed</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
        <SecondaryButton label="Try again" onPress={() => void refetch()} />
      </View>
    );
  } else {
    empty = <EmptyFeed />;
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item, index }) => (
        <View>
          {index === marker ? <CaughtUp /> : null}
          <View className="px-4 pb-4 pt-5">
            <PostCard post={item} mine={mine} onLike={like} onOpen={open} />
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View className="mx-4 h-px bg-raised" />}
      ListHeaderComponent={
        <View>
          <Header />
          <View className="px-4">
            <NotificationAsk />
          </View>
        </View>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={c.fgMuted} style={{ marginVertical: 20 }} />
        ) : posts.length > 0 && !hasMore && marker === null ? (
          <CaughtUp end />
        ) : null
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={c.fgMuted} />
      }
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
    />
  );
}

/** Home: your and your friends' ranked hikes, newest first. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile } = useMyProfile();

  if (session && profile) return <Feed />;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
      <Header />
      <SignInGate why="see what your friends hiked">{() => null}</SignInGate>
    </ScrollView>
  );
}
