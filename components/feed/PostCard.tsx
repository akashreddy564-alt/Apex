import { useRouter } from 'expo-router';
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PostMedia } from '@/components/feed/PostMedia';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { formatCompactDuration, formatDistance, formatElevation } from '@/lib/format';
import { comparisonTag, hikeDayLabel, type FeedPost, type MyRankedTrail } from '@/lib/postRules';
import { useSavedTrails } from '@/stores/savedTrailsStore';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle } from '@/theme/tokens';

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ ...numericStyle('semibold'), color: c.fg, fontSize: 16, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      hitSlop={6}
      className="flex-row items-center gap-1.5 active:opacity-60"
      style={{ minHeight: 44, minWidth: 44, paddingRight: 6 }}
    >
      {children}
      {count ? (
        <Text style={{ ...numericStyle('medium'), color: c.fg2, fontSize: 14 }}>{count}</Text>
      ) : null}
    </Pressable>
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
}

/**
 * One friend's ranked hike: who and where with the score, the numbers, the
 * route and photos, their notes, how it compares to yours, then like,
 * comment and save.
 */
export function PostCard({ post, mine, onLike, onOpen, full = false, onMore }: PostCardProps) {
  const c = useColors();
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const hasTrail = useTrailCache((s) => s.trails.some((trail) => trail.id === post.trailId));
  const saved = useSavedTrails((s) => s.saved.some((row) => row.trailId === post.trailId));
  const toggleSaved = useSavedTrails((s) => s.toggle);

  const tag = comparisonTag(post, mine);
  const where = [post.region, hikeDayLabel(post.hikedAt)].filter(Boolean).join(' · ');
  const stats = [
    post.distanceKm != null ? { label: 'Distance', value: formatDistance(post.distanceKm) } : null,
    post.elevationGainM != null ? { label: 'Elev gain', value: formatElevation(post.elevationGainM) } : null,
    post.durationSeconds != null ? { label: 'Time', value: formatCompactDuration(post.durationSeconds) } : null,
  ].filter((stat): stat is { label: string; value: string } => stat !== null);

  const openPerson = () => {
    if (post.isMine) return;
    router.push({ pathname: '/friend/[id]', params: { id: post.authorId } });
  };
  const openTrail = () => {
    if (hasTrail) router.push({ pathname: '/trail/[id]', params: { id: post.trailId } });
    else onOpen?.(post);
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
          {where ? (
            <Text numberOfLines={1} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
              {where}
            </Text>
          ) : null}
        </View>
        <ScoreBadge bucket={post.bucket} count={post.bucketSize} score={post.score} />
      </View>

      {stats.length > 0 ? (
        <View className="mt-4 flex-row gap-7">
          {stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
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
    <Pressable
      accessibilityHint="Opens the full hike"
      onPress={() => onOpen(post)}
      className="active:opacity-95"
    >
      {body}
    </Pressable>
  );
}
