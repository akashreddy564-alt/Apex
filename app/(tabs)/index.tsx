import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CircleCheck, Search } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/feed/PostCard';
import { NotificationAsk } from '@/components/habit/NotificationAsk';
import { ChallengesCard } from '@/components/home/ChallengesCard';
import { NearbyTrails } from '@/components/home/NearbyTrails';
import { SignInStrip, StartHikeCard } from '@/components/home/StartHikeCard';
import { TastePicks } from '@/components/home/TastePicks';
import { TopTrails } from '@/components/home/TopTrails';
import { SwitchbackFeedCard, SwitchbackRow } from '@/components/home/SwitchbackRow';
import { WeekHero } from '@/components/home/WeekHero';
import { useSafetyMenu } from '@/components/safety/useSafetyMenu';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { Avatar } from '@/components/social/Avatar';
import { SymbolIcon } from '@/components/SymbolIcon';
import { useColors } from '@/hooks/useColors';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useFeed, useLike } from '@/hooks/useFeed';
import { useFriendships } from '@/hooks/useFriends';
import { useMyRankedTrails } from '@/hooks/useMyRankedTrails';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useMyProfile } from '@/hooks/useProfile';
import { caughtUpIndex, fetchComments, type FeedPost } from '@/lib/feed';
import { fonts } from '@/theme/tokens';
import { ContourTexture, riseIn, Skeleton } from '@/components/motion';
import { withAlpha } from '@/theme/color';

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
  const unread = useUnreadCount();
  const { profile } = useMyProfile();
  return (
    <View className="flex-row items-center px-4">
      <View className="flex-row items-center gap-3">
        <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: -0.4 }}>apex</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search trails"
        onPress={() => router.push({ pathname: '/trails', params: { focus: 'search' } })}
        hitSlop={8}
        className="ml-auto items-center justify-center active:opacity-70"
        style={{ minHeight: 44, minWidth: 32 }}
      >
        <SymbolIcon name="magnifyingglass" fallback={Search} size={21} color={c.fg2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
        onPress={() => router.push('/notifications')}
        hitSlop={8}
        className="ml-4 items-center justify-center active:opacity-70"
        style={{ minHeight: 44, minWidth: 32 }}
      >
        <SymbolIcon name="bell" fallback={Bell} size={21} color={c.fg2} />
        {unread > 0 ? (
          <View
            className="absolute rounded-full"
            style={{ top: 9, right: 2, width: 9, height: 9, backgroundColor: c.disliked, borderWidth: 1.5, borderColor: c.bg }}
          />
        ) : null}
      </Pressable>
      {profile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your profile and ranked list"
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: profile.id } })}
          hitSlop={8}
          className="ml-4 items-center justify-center active:opacity-70"
          style={{ minHeight: 44 }}
        >
          <Avatar name={profile.display_name} size={30} />
        </Pressable>
      ) : null}
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
  const tabInset = useTabBarInset();
  const { posts, loading, refreshing, error, refetch, loadMore, loadingMore, hasMore } = useFeed();
  const like = useLike();
  const safety = useSafetyMenu();
  const mine = useMyRankedTrails();
  const lastFetch = useRef(0);
  const list = useRef<FlatList<FeedPost>>(null);
  // A second tap on Home scrolls back to the newest post.
  useScrollToTop(list);

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

  const queryClient = useQueryClient();
  const open = useCallback(
    (post: FeedPost, focusComment?: boolean) => {
      // The post itself comes from the feed; start the comments now so they're there on arrival.
      void queryClient.prefetchQuery({ queryKey: ['comments', post.id], queryFn: () => fetchComments(post.id) });
      router.push({ pathname: '/post/[id]', params: focusComment ? { id: post.id, comment: '1' } : { id: post.id } });
    },
    [queryClient, router],
  );

  let empty = null;
  if (loading) {
    // First sign-in only: the feed was prefetched during the opening screen, and is cached after.
    empty = (
      <View className="px-4 pt-5">
        <Skeleton shape="post" count={3} />
      </View>
    );
  } else if (error) {
    empty = (
      <View className="mx-4 mt-6 gap-3 rounded-2xl bg-surface px-5 py-6">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Couldn’t load your feed</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
        <SecondaryButton label="Try again" onPress={() => void refetch()} />
      </View>
    );
  } else {
    empty = (
      <View>
        <NearbyTrails />
        <EmptyFeed />
      </View>
    );
  }

  return (
    <FlatList
      ref={list}
      className="flex-1 bg-bg"
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item, index }) => (
        <View>
          {index === marker ? <CaughtUp /> : null}
          <Animated.View entering={index < 6 ? riseIn(index) : undefined} style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 20 }}>
            <PostCard
              post={item}
              feed={posts}
              mine={mine}
              onLike={like}
              onOpen={open}
              onMore={(post) => safety({ person: post.authorId, name: post.displayName, post: post.id })}
            />
          </Animated.View>
          {index === Math.min(2, posts.length - 1) ? <TastePicks /> : null}
        </View>
      )}
      ItemSeparatorComponent={() => <View className="mx-4 h-px bg-raised" />}
      ListHeaderComponent={
        <View>
          <HeaderContours />
          <Header />
          <WeekHero tourTarget />
          <StartHikeCard />
          <ChallengesCard />
          <TopTrails />
          <SwitchbackRow />
          <View className="px-4">
            <NotificationAsk />
          </View>
          {posts.length > 0 ? (
            <Text
              accessibilityRole="header"
              style={{ marginHorizontal: 16, marginTop: 22, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}
            >
              Friends
            </Text>
          ) : null}
          {posts.length > 0 ? <SwitchbackFeedCard /> : null}
        </View>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? null : posts.length > 0 && !hasMore && marker === null ? (
          <CaughtUp end />
        ) : null
      }
      onEndReached={loadMore}
      // Fetch the next page well before the end, so scrolling never waits.
      onEndReachedThreshold={2}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={c.fgMuted} />
      }
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabInset + 32 }}
    />
  );
}

/** Brown topo rings behind the top of Home, as on Log. They scroll away with the header. */
function HeaderContours() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = 300;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -(insets.top + 12), left: 0, right: 0, height }}>
      <ContourTexture seed="home" width={width} height={height} opacity={0.6} color={withAlpha(c.climb, 0.28)} />
    </View>
  );
}

/**
 * Home: this week, Start a hike, your top trails, then friends' ranked hikes
 * (signed in) or trails near you and a sign-in strip (signed out).
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { session, profile } = useMyProfile();
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);

  if (session && profile) return <Feed />;

  return (
    <ScrollView ref={scroll} className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabInset + 32 }}>
      <HeaderContours />
      <Header />
      <WeekHero tourTarget />
      <StartHikeCard />
      <ChallengesCard />
      <TopTrails />
      <SwitchbackRow />
      <NearbyTrails />
      <SignInStrip />
    </ScrollView>
  );
}
