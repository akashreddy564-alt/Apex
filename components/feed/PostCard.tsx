import { useRouter } from 'expo-router';
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PostMedia } from '@/components/feed/PostMedia';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { formatCompactDuration, formatDistance, formatElevation } from '@/lib/format';
import { myRankOf, placementLine } from '@/lib/listPlace';
import { comparisonTag, hikeDayLabel, type FeedPost, type MyRankedTrail } from '@/lib/postRules';
import { postReasons } from '@/lib/reasons';
import { useSavedTrails } from '@/stores/savedTrailsStore';
import { PostDetails } from '@/components/feed/PostDetails';
import { ensureTrail } from '@/lib/catalogRemote';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle } from '@/theme/tokens';
import { PressScale, ReasonLine } from '@/components/motion';
import { FirstAscentBadge } from '@/components/profile/FirstAscentBadge';

function ActionButton({
  label,
  count,
  onPress,
  children,
  selected,
}: {
  label: string;
  count?: number;
  onPress: () => void;
  children: React.ReactNode;
  selected?: boolean;
}) {
  const c = useColors();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      hitSlop={6}
      to={0.86}
      className="flex-row items-center gap-1.5"
      style={{ minHeight: 44, minWidth: 44, paddingRight: 6 }}
    >
      {children}
      {count ? (
        <Text style={{ ...numericStyle('medium'), color: c.fg2, fontSize: 14 }}>{count}</Text>
      ) : null}
    </PressScale>
  );
}

interface PostCardProps {
  post: FeedPost;
  mine: MyRankedTrail[];
  onLike: (post: FeedPost) => void;
  /** Home: opens the full hike. Absent on the full hike view itself. */
  onOpen?: (post: FeedPost, focusComment?: boolean) => void;
  /** The full hike view shows every word of the notes and a taller strip. */
  full?: boolean;
  /** Report or block, on other people's posts. */
  onMore?: (post: FeedPost) => void;
  /** The loaded feed. Reasons compare this post with the same author's others in it. */
  feed?: readonly FeedPost[];
}

/**
 * One friend's ranked hike: who and where with the score, the numbers, the
 * route and photos, their notes, how it compares to yours, then like,
 * comment and save.
 */
export function PostCard({ post, mine, onLike, onOpen, full = false, onMore, feed }: PostCardProps) {
  const c = useColors();
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const hasTrail = useTrailCache((s) => s.trails.some((trail) => trail.id === post.trailId));
  const saved = useSavedTrails((s) => s.saved.some((row) => row.trailId === post.trailId));
  const toggleSaved = useSavedTrails((s) => s.toggle);

  const firstName = post.displayName.split(/\s+/)[0] || post.displayName;
  const placement = placementLine({ ...post, firstName, isMine: post.isMine });
  const myRank = post.isMine ? null : myRankOf(mine, post.trailId);
  // Your own rank for the same trail says more than "ranked above your X"; show one or the other.
  const tag = myRank == null ? comparisonTag(post, mine) : null;
  const where = [post.region, hikeDayLabel(post.hikedAt)].filter(Boolean).join(' · ');
  const stats = [
    post.distanceKm != null ? formatDistance(post.distanceKm) : null,
    post.elevationGainM != null ? formatElevation(post.elevationGainM) : null,
    post.durationSeconds != null ? formatCompactDuration(post.durationSeconds) : null,
  ].filter((stat): stat is string => stat !== null);
  const reasons = useMemo(() => {
    if (!feed) return [];
    const name = post.displayName.split(/\s+/)[0] || post.displayName;
    return postReasons(post, feed, { mine: post.isMine, name }).map((reason) => ({
      text: reason.text,
      kind: reason.kind,
      value:
        reason.kind === 'distance'
          ? formatDistance(post.distanceKm ?? 0)
          : reason.kind === 'climb'
            ? formatElevation(post.elevationGainM ?? 0)
            : formatCompactDuration(post.durationSeconds ?? 0),
    }));
  }, [feed, post]);

  const openPerson = () => {
    if (post.isMine) return;
    router.push({ pathname: '/friend/[id]', params: { id: post.authorId } });
  };
  const openTrail = () => {
    if (hasTrail) {
      router.push({ pathname: '/trail/[id]', params: { id: post.trailId } });
      return;
    }
    // A catalog trail this phone hasn't fetched yet (the big catalog lives on the server).
    void ensureTrail(post.trailId).then((trail) => {
      if (trail) router.push({ pathname: '/trail/[id]', params: { id: trail.id } });
      else onOpen?.(post);
    });
  };

  const body = (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityRole={post.isMine ? undefined : 'button'}
          accessibilityLabel={post.isMine ? undefined : `${post.displayName}’s page`}
          onPress={openPerson}
          disabled={post.isMine}
          hitSlop={4}
        >
          <Avatar name={post.displayName} size={38} />
        </Pressable>
        <View className="flex-1">
          <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 20 }}>
            <Text onPress={post.isMine ? undefined : openPerson} style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>
              {post.isMine ? 'You' : post.displayName}
            </Text>
            {' ranked '}
            <Text onPress={openTrail} style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>
              {post.trailName}
            </Text>
          </Text>
          {placement ? (
            <Text style={{ ...numericStyle('semibold'), color: c.accent, fontSize: 15, marginTop: 3 }}>{placement}</Text>
          ) : null}
          <FirstAscentBadge userId={post.authorId} style={{ marginTop: 4 }} />
          {where ? (
            <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
              {where}
            </Text>
          ) : null}
          {myRank != null ? (
            <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 13, marginTop: 4 }}>
              You have it at <Text style={{ ...numericStyle('semibold'), color: c.fg }}>#{myRank}</Text>
            </Text>
          ) : null}
        </View>
        <ScoreBadge bucket={post.bucket} count={post.bucketSize} score={post.score} />
      </View>

      {stats.length > 0 ? (
        <Text style={{ ...numericStyle('medium'), color: c.fgMuted, fontSize: 13, marginTop: 12 }}>
          {stats.join(' · ')}
        </Text>
      ) : null}

      {reasons.length > 0 ? (
        <View className="mt-3">
          {reasons.map((reason, i) => (
            <ReasonLine
              key={reason.text}
              value={reason.value}
              text={reason.text}
              first={i === 0}
              tone={reason.kind === 'distance' ? c.distance : reason.kind === 'climb' ? c.climb : undefined}
            />
          ))}
        </View>
      ) : null}

      {post.route.length >= 2 || post.photos.length > 0 ? (
        <View className="mt-4">
          <PostMedia
            route={post.route}
            photos={post.photos}
            width={width}
            height={full ? Math.round(width * 0.8) : Math.round(width * 0.62)}
            onTap={full ? undefined : () => onOpen?.(post)}
            onDoubleTap={() => {
              if (!post.liked) onLike(post);
            }}
          />
        </View>
      ) : null}

      {post.notes ? (
        <Text
          numberOfLines={full ? undefined : 3}
          style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 12 }}
        >
          {post.notes}
        </Text>
      ) : null}

      <PostDetails post={post} full={full} />

      {tag ? (
        <View
          className="mt-3 self-start rounded-full px-3 py-1.5"
          style={{ borderWidth: 1, borderColor: c.accent }}
        >
          <Text style={{ color: c.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>{tag}</Text>
        </View>
      ) : null}

      <View className="mt-2 flex-row items-center gap-4">
        <ActionButton label={post.liked ? 'Unlike' : 'Like'} count={post.likeCount} onPress={() => onLike(post)} selected={post.liked}>
          <Heart
            size={21}
            strokeWidth={1.7}
            color={post.liked ? c.disliked : c.fg2}
            fill={post.liked ? c.disliked : 'transparent'}
          />
        </ActionButton>
        <ActionButton label="Comment" count={post.commentCount} onPress={() => onOpen?.(post, true)}>
          <MessageCircle size={21} strokeWidth={1.7} color={c.fg2} />
        </ActionButton>
        {post.isMine ? null : (
          <View className="ml-auto">
            <ActionButton
              label={saved ? 'Saved to want to hike' : 'Save trail'}
              onPress={() => toggleSaved({ trailId: post.trailId, name: post.trailName, region: post.region })}
              selected={saved}
            >
              <Bookmark size={21} strokeWidth={1.7} color={saved ? c.accent : c.fg2} fill={saved ? c.accent : 'transparent'} />
            </ActionButton>
          </View>
        )}
        {!post.isMine && onMore ? (
          <ActionButton label={`More for ${post.displayName}’s hike`} onPress={() => onMore(post)}>
            <MoreHorizontal size={21} strokeWidth={1.7} color={c.fg2} />
          </ActionButton>
        ) : null}
      </View>
    </View>
  );

  if (!onOpen || full) return body;
  return (
    <PressScale accessibilityHint="Opens the full hike" onPress={() => onOpen(post)} to={0.985}>
      {body}
    </PressScale>
  );
}
