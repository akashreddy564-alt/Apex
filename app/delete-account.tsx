import { useRouter } from 'expo-router';
import { Image as ImageIcon, List, TrendingUp, User } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { hikesToCsv, hikesToGpx, photoLines } from '@/lib/exportData';
import { supabase } from '@/lib/supabase';
import { useComparisonStore } from '@/stores/comparisonStore';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { colors, fonts } from '@/theme/tokens';

const DELETE_FILL = '#8F3230';
const DELETE_TEXT = '#FDE8E8';
const DELETE_DISABLED = '#2A1A1A';

function Row({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <View className="flex-row gap-3 border-t border-zinc-800 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        {icon}
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
          {title}
        </Text>
        <Text style={{ color: colors.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 2 }}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email, session } = useAuth();
  const logs = useTrailCache((s) => s.logs);
  const trails = useTrailCache((s) => s.trails);
  const rankings = useRankingStore((s) => s.rankings);
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const photoCount = useMemo(
    () => logs.reduce((sum, log) => sum + log.photos.length, 0),
    [logs],
  );
  const trailName = (id: string) => trails.find((trail) => trail.id === id)?.name ?? id;
  const confirmed = phrase === 'DELETE';

  const exportData = async () => {
    const gpx = hikesToGpx(logs, trailName);
    const csv = hikesToCsv(logs, rankings, trailName);
    const photos = photoLines(logs, trails);
    await Share.share({
      title: 'Apex export',
      message: `${gpx}\n\n${csv}\n\n${photos}`,
    });
  };

  const wipeLocal = () => {
    useTrailCache.setState({ logs: [] });
    useRankingStore.setState({ rankings: [], comparisons: [] });
    useComparisonStore.getState().setAll([]);
  };

  const confirmDelete = async () => {
    if (!confirmed || busy) return;
    if (!supabase || !session) {
      setStatus('Sign in before deleting the account on the server.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) {
        setStatus(error.message);
        return;
      }
      wipeLocal();
      await supabase.auth.signOut();
      setConfirming(false);
      router.replace('/account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: fonts.displayExtraBold,
            fontSize: 30,
            lineHeight: 34,
            marginTop: 8,
          }}
        >
          Delete account
        </Text>
        <Text style={{ color: colors.fg2, fontFamily: fonts.ui, fontSize: 15, marginTop: 10 }}>
          This permanently removes your account and everything in it. It can't be undone.
        </Text>

        <Text style={{ color: colors.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 22 }}>
          What gets deleted
        </Text>
        <Row
          icon={<TrendingUp size={16} color={colors.fg} strokeWidth={1.75} />}
          title={`${logs.length} hikes`}
          detail="Recorded tracks, logged hikes and notes"
        />
        <Row
          icon={<List size={16} color={colors.fg} strokeWidth={1.75} />}
          title="Your rankings"
          detail={`${rankings.length} scores and comparisons`}
        />
        <Row
          icon={<ImageIcon size={16} color={colors.fg} strokeWidth={1.75} />}
          title={`${photoCount} photos`}
          detail="Removed from Apex. Copies in your camera roll stay."
        />
        <Row
          icon={<User size={16} color={colors.fg} strokeWidth={1.75} />}
          title="Account"
          detail={email ? `${email}, sign-in and preferences` : 'Sign-in and preferences'}
        />

        <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-zinc-800 px-4 py-3">
          <View className="mr-3 flex-1">
            <Text style={{ color: colors.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
              Export your data first
            </Text>
            <Text style={{ color: colors.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }}>
              GPX tracks, a CSV of hikes and scores, and photos
            </Text>
          </View>
          <Pressable accessibilityLabel="Export your data" onPress={() => void exportData()}>
            <Text style={{ color: colors.sage, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
              Export
            </Text>
          </Pressable>
        </View>
        {status ? (
          <Text className="mt-3 text-[13px] text-zinc-400">{status}</Text>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          accessibilityLabel="Delete account"
          onPress={() => {
            setPhrase('');
            setConfirming(true);
          }}
          className="items-center py-4"
          style={{ borderRadius: 18, backgroundColor: DELETE_FILL }}
        >
          <Text style={{ color: DELETE_TEXT, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
            Delete account
          </Text>
        </Pressable>
        <Text
          style={{
            color: colors.fgFaint,
            fontFamily: fonts.ui,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          Your data is deleted from our servers right away.
        </Text>
      </View>

      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setConfirming(false)}>
          <Pressable
            className="rounded-t-3xl bg-zinc-950 px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={() => undefined}
          >
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-700" />
            <Text style={{ color: colors.fg, fontFamily: fonts.displayExtraBold, fontSize: 26 }}>
              Delete everything?
            </Text>
            <Text style={{ color: colors.fg2, fontFamily: fonts.ui, fontSize: 15, marginTop: 8 }}>
              {logs.length} hikes, your rankings, {photoCount} photos and your account will be
              deleted for good.
            </Text>
            <Text style={{ color: colors.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 16 }}>
              Type DELETE to confirm
            </Text>
            <TextInput
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Type DELETE to confirm"
              className="mt-2 border border-zinc-700 px-3 py-3 text-zinc-50"
              style={{ borderRadius: 14, fontFamily: fonts.uiMedium, fontSize: 16 }}
            />
            <Pressable
              accessibilityLabel="Confirm delete account"
              disabled={!confirmed || busy}
              onPress={() => void confirmDelete()}
              className="mt-3 items-center py-4"
              style={{
                borderRadius: 18,
                backgroundColor: confirmed && !busy ? DELETE_FILL : DELETE_DISABLED,
              }}
            >
              <Text
                style={{
                  color: confirmed && !busy ? DELETE_TEXT : '#6B5340',
                  fontFamily: fonts.uiSemibold,
                  fontSize: 16,
                }}
              >
                Delete account
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Cancel delete"
              onPress={() => setConfirming(false)}
              className="items-center py-4"
            >
              <Text style={{ color: colors.fg2, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
