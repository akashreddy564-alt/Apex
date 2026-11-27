import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PostCard } from '@/components/feed/PostCard';
import { Skeleton } from '@/components/motion';
import { useSafetyMenu } from '@/components/safety/useSafetyMenu';
import { Avatar } from '@/components/social/Avatar';
import { FollowButton } from '@/components/social/FollowButton';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useLike, usePersonPosts } from '@/hooks/useFeed';
import { useFollowCounts } from '@/hooks/useFollows';
import { useFriendships, usePerson } from '@/hooks/useFriends';
import { useMyRankedTrails } from '@/hooks/useMyRankedTrails';
import type { FeedPost } from '@/lib/feed';
import { fonts } from '@/theme/tokens';
import { FirstAscentBadge } from '@/components/profile/FirstAscentBadge';
import { OrgLabel } from '@/components/profile/OrgLabel';
import { RankedList } from '@/components/profile/RankedList';
import { TasteLine } from '@/components/profile/TasteLine';
import { Segmented } from '@/components/social/Segmented';
import { usePersonRankings, useTasteMatch } from '@/hooks/useRankLists';

/** Their ranked hikes, newest first. Friends and yourself only. */
function TheirHikes({ id, name, posts, loading, error, onMore }: {
  id: string;
  name: string;
  posts: FeedPost[];
  loading: boolean;
  error: string | null;
  onMore: (post: FeedPost) => void;
}) {
  const c = useColors();
  const router = useRouter();
  const like = useLike();
  const mine = useMyRankedTrails();
  const first = name.split(/\s+/)[0];
  return (
    <View className="mt-5 self-stretch" accessibilityLabel={`${first}’s hikes`}>
      {loading ? (
        <View className="mt-3">
          <Skeleton shape="row" count={3} />
        </View>
      ) : null}
      {error ? <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 8 }}>{error}</Text> : null}
      {!loading && !error && posts.length === 0 ? (
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
          {first} hasn’t ranked a hike yet. Their hikes show up here and on Home once they do.
        </Text>
      ) : null}
      {posts.map((post, index) => (
        <View key={post.id} className={index === 0 ? 'mt-4' : 'mt-4 border-t border-raised pt-5'}>
          <PostCard
            post={post}
            feed={posts}
            mine={mine}
            onLike={like}
            onOpen={(p, focusComment) =>
              router.push({ pathname: '/post/[id]', params: focusComment ? { id: p.id, comment: '1' } : { id: p.id } })
            }
            onMore={post.authorId === id && !post.isMine ? onMore : undefined}
          />
        </View>
      ))}
    </View>
  );
}

export function PersonPage({ id }: { id: string }) {
  const c = useColors();
  const { person, friendCount, loading, error } = usePerson(id);
  const { relationTo } = useFriendships();
  const router = useRouter();
  const safety = useSafetyMenu(() => (router.canGoBack() ? router.back() : router.replace('/social')));
  const { counts } = useFollowCounts(id);
  // Friends and followers both see someone's hikes.
  const canSee = person ? ['friend', 'self'].includes(relationTo(person.id)) || counts?.iFollow === true : false;
  // Rankings (the list and taste match) are friends only: mutual follows or an
  // accepted request (migrations 028/029). A one-way follower sees hikes.
  const canSeeList = person
    ? ['friend', 'self'].includes(relationTo(person.id)) || (counts?.iFollow === true && counts?.followsMe === true)
    : false;
  const hikes = usePersonPosts(id, canSee);
  const list = usePersonRankings(id, canSeeList);
  const taste = useTasteMatch(id, canSeeList);
  const [chosenTab, setTab] = useState<'list' | 'hikes'>('list');
  const tab = canSeeList ? chosenTab : 'hikes';

  if (loading) {
    return (
      <View style={{ paddingTop: 16 }}>
        <Skeleton shape="row" count={5} />
      </View>
    );
  }
  if (error || !person) {
    return (
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 24 }}>
        {error ?? 'This person isn’t on Apex anymore.'}
      </Text>
    );
  }

  const relation = relationTo(person.id);
  const note =
    relation === 'incoming'
      ? `${person.display_name} wants to be friends.`
      : relation === 'outgoing'
        ? 'Request sent. You’ll see their hikes once they accept.'
        : relation === 'none'
          ? counts?.iFollow
            ? 'You see their list and hikes. Friends also share boards and groups.'
            : 'Follow to see their ranked list and hikes. Friends also share boards and groups.'
          : null;
  const first = person.display_name.split(/\s+/)[0] || person.display_name;

  return (
    <View className="items-center pt-6">
      <Avatar name={person.display_name} size={88} />
      <Text
        style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 26, marginTop: 16, textAlign: 'center' }}
      >
        {person.display_name}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 4 }}>
        @{person.username}
      </Text>
      <OrgLabel personId={person.id} size={14} center style={{ marginTop: 6 }} />
      <FirstAscentBadge userId={person.id} size="lg" style={{ marginTop: 12 }} />
      {relation !== 'self' ? <TasteLine match={taste.data} firstName={first} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {friendCount !== null ? (
          <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>
            {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
          </Text>
        ) : null}
        {counts ? (
          <>
            <Text style={{ color: c.fgFaint, fontSize: 14 }}>·</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${counts.followers} followers`}
              onPress={() => router.push({ pathname: '/follows/[id]', params: { id: person.id, kind: 'followers' } })}
              hitSlop={8}
            >
              <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>
                <Text style={{ fontFamily: fonts.uiSemibold, color: c.fg }}>{counts.followers}</Text>{' '}
                {counts.followers === 1 ? 'follower' : 'followers'}
              </Text>
            </Pressable>
            <Text style={{ color: c.fgFaint, fontSize: 14 }}>·</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${counts.following} following`}
              onPress={() => router.push({ pathname: '/follows/[id]', params: { id: person.id, kind: 'following' } })}
              hitSlop={8}
            >
              <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14 }}>
                <Text style={{ fontFamily: fonts.uiSemibold, color: c.fg }}>{counts.following}</Text> following
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
      <View className="mt-6" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {relation !== 'self' ? (
          <FollowButton personId={person.id} name={person.display_name} following={counts?.iFollow === true} />
        ) : null}
        <RelationButton personId={person.id} name={person.display_name} username={person.username} relation={relation} compact={false} />
      </View>
      {note ? (
        <Text
          style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 14, textAlign: 'center' }}
        >
          {note}
        </Text>
      ) : null}
      {relation !== 'self' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => safety({ person: person.id, name: person.display_name })}
          hitSlop={10}
          className="mt-10 active:opacity-60"
        >
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>Report or block</Text>
        </Pressable>
      ) : null}
      {canSee && !canSeeList ? (
        <Text style={{ marginTop: 24, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, textAlign: 'center' }}>
          Their ranked list shows once you follow each other.
        </Text>
      ) : null}
      {canSeeList ? (
        <View className="mt-8 self-stretch">
          <Segmented
            options={[
              { value: 'list', label: list.data.length > 0 ? `List · ${list.data.length}` : 'List' },
              { value: 'hikes', label: 'Hikes' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
      ) : null}
      {canSee && tab === 'list' ? (
        <View className="mt-5 self-stretch">
          {list.loading ? <Skeleton shape="row" count={4} /> : null}
          {list.error ? (
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{list.error}</Text>
          ) : null}
          {!list.loading && !list.error && list.data.length === 0 ? (
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>
              {relation === 'self' ? 'You haven’t ranked a trail yet. Log a hike and it lands here.' : `${first} hasn’t ranked a trail yet.`}
            </Text>
          ) : null}
          {list.data.length > 0 ? (
            <RankedList rows={list.data} firstName={first} self={relation === 'self'} />
          ) : null}
        </View>
      ) : null}
      {canSee && tab === 'hikes' ? (
        <TheirHikes
          id={person.id}
          name={person.display_name}
          posts={hikes.posts}
          loading={hikes.loading}
          error={hikes.error}
          onMore={(post) => safety({ person: post.authorId, name: post.displayName, post: post.id })}
        />
      ) : null}
      {canSee && tab === 'hikes' && hikes.hasMore ? (
        <Pressable accessibilityRole="button" onPress={hikes.loadMore} hitSlop={10} className="mt-6 active:opacity-60">
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>
            {hikes.loadingMore ? 'Loading…' : 'Show older hikes'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Someone's page. Invite links and QR codes open here (apex://friend/<id>). */
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <SignInGate why="add friends">{() => (id ? <PersonPage id={id} /> : null)}</SignInGate>
    </ScrollView>
  );
}
