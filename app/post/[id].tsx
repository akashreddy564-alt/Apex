import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';
import { SendHorizontal, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/feed/PostCard';
import { Avatar } from '@/components/social/Avatar';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useComments, useLike, usePost } from '@/hooks/useFeed';
import { useMyRankedTrails } from '@/hooks/useMyRankedTrails';
import { COMMENT_MAX, hikeDayLabel, type PostComment } from '@/lib/feed';
import { fonts } from '@/theme/tokens';

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: PostComment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const c = useColors();
  return (
    <View className="flex-row gap-3 py-3">
      <Avatar name={comment.displayName} size={30} />
      <View className="flex-1">
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>{comment.displayName}</Text>
          {'  '}
          {hikeDayLabel(comment.createdAt)}
        </Text>
        <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 2 }}>
          {comment.body}
        </Text>
      </View>
      {canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete comment"
          onPress={onDelete}
          hitSlop={10}
          className="active:opacity-60"
          style={{ minWidth: 32, alignItems: 'flex-end', paddingTop: 2 }}
        >
          <Trash2 size={16} strokeWidth={1.6} color={c.fgFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PostPage({ id, focusComment }: { id: string; focusComment: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { post, loading, error } = usePost(id);
  const like = useLike();
  const mine = useMyRankedTrails();
  const { uid, comments, loading: commentsLoading, add, adding, remove } = useComments(id);
  const [draft, setDraft] = useState('');
  const input = useRef<TextInput>(null);

  if (loading) {
    return <ActivityIndicator color={c.fgMuted} style={{ marginTop: 48 }} />;
  }
  if (error || !post) {
    return (
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, margin: 20 }}>
        {error ?? 'This hike isn’t shared with you anymore.'}
      </Text>
    );
  }

  const send = async () => {
    const body = draft.trim();
    if (!body || adding) return;
    try {
      await add(body);
      setDraft('');
    } catch {
      // useComments already told them.
    }
  };

  const confirmDelete = (comment: PostComment) =>
    Alert.alert('Delete this comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(comment.id) },
    ]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <PostCard post={post} mine={mine} onLike={like} onOpen={(_, focus) => focus && input.current?.focus()} full />

        <View className="mt-6 h-px bg-raised" />
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 17, marginTop: 16 }}>Comments</Text>
        {commentsLoading ? <ActivityIndicator color={c.fgMuted} style={{ marginTop: 16 }} /> : null}
        {!commentsLoading && comments.length === 0 ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 8 }}>
            {post.isMine ? 'No comments yet.' : `Say something to ${post.displayName.split(/\s+/)[0]}.`}
          </Text>
        ) : null}
        {comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            canDelete={comment.userId === uid || post.isMine}
            onDelete={() => confirmDelete(comment)}
          />
        ))}
      </ScrollView>

      <View
        className="flex-row items-end gap-2 border-t border-raised bg-bg px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      >
        <TextInput
          ref={input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment"
          placeholderTextColor={c.fgFaint}
          autoFocus={focusComment}
          multiline
          maxLength={COMMENT_MAX}
          accessibilityLabel="Comment"
          className="flex-1 rounded-2xl bg-surface px-4 py-2.5"
          style={{ color: c.fg, fontFamily: fonts.ui, fontSize: 15, maxHeight: 120, minHeight: 42 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          accessibilityState={{ disabled: !draft.trim() || adding, busy: adding }}
          disabled={!draft.trim() || adding}
          onPress={() => void send()}
          className="items-center justify-center rounded-full active:opacity-80"
          style={{ width: 42, height: 42, backgroundColor: c.accent, opacity: !draft.trim() || adding ? 0.45 : 1 }}
        >
          {adding ? (
            <ActivityIndicator color={c.onAccent} />
          ) : (
            <SendHorizontal size={18} strokeWidth={1.8} color={c.onAccent} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** The full hike: a bigger map, every photo, all the notes, and comments. */
export default function PostScreen() {
  const { id, comment } = useLocalSearchParams<{ id: string; comment?: string }>();
  return (
    <View className="flex-1 bg-bg">
      <SignInGate why="see your friends’ hikes">
        {() => (id ? <PostPage id={String(id)} focusComment={comment === '1'} /> : null)}
      </SignInGate>
    </View>
  );
}
