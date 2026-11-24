import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PostCard } from '@/components/feed/PostCard';
import { Skeleton } from '@/components/motion';
import { useSafetyMenu } from '@/components/safety/useSafetyMenu';
import { Avatar } from '@/components/social/Avatar';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useLike, usePersonPosts } from '@/hooks/useFeed';
import { useFriendships, usePerson } from '@/hooks/useFriends';
import { useMyRankedTrails } from '@/hooks/useMyRankedTrails';
import type { FeedPost } from '@/lib/feed';
import { fonts } from '@/theme/tokens';

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
    <View className="mt-10 self-stretch" accessibilityLabel={`${first}’s hikes`}>
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Hikes</Text>
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

function PersonPage({ id }: { id: string }) {
  const c = useColors();
  const { person, friendCount, loading, error } = usePerson(id);
  const { relationTo } = useFriendships();
  const router = useRouter();
  const safety = useSafetyMenu(() => (router.canGoBack() ? router.back() : router.replace('/social')));
  const canSee = person ? ['friend', 'self'].includes(relationTo(person.id)) : false;
  const hikes = usePersonPosts(id, canSee);

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
          ? 'Friends see each other’s hikes, routes and rankings.'
          : null;

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
      {friendCount !== null ? (
        <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14, marginTop: 10 }}>
          {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
        </Text>
      ) : null}
      <View className="mt-6">
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
      {canSee ? (
        <TheirHikes
          id={person.id}
          name={person.display_name}
          posts={hikes.posts}
          loading={hikes.loading}
          error={hikes.error}
          onMore={(post) => safety({ person: post.authorId, name: post.displayName, post: post.id })}
        />
      ) : null}
      {canSee && hikes.hasMore ? (
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
