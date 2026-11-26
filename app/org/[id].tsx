import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Building, GraduationCap } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Leaderboard, PeriodSwitch } from '@/components/groups/Leaderboard';
import { BOARD_KINDS, TrailBoard, type BoardKind } from '@/components/groups/TrailBoard';
import { haptics, Skeleton } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { Segmented } from '@/components/social/Segmented';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useMyOrganizations, useOrgActions, useOrgBoard } from '@/hooks/useOrganizations';
import { periodLabel, type Period } from '@/lib/groupRules';
import { kindLabel, renewNote } from '@/lib/organizations';
import { fonts } from '@/theme/tokens';

function OrgPage({ id }: { id: string }) {
  const c = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const [kind, setKind] = useState<BoardKind>('trails');
  const { organizations, loading: orgsLoading } = useMyOrganizations();
  const org = organizations.find((row) => row.id === id);
  const { board, loading, refreshing, error, refetch } = useOrgBoard(id, period);
  const { leave } = useOrgActions();

  if (!orgsLoading && !org) {
    return (
      <View className="px-4 pt-6">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 19 }}>Not on this board</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, lineHeight: 21 }}>
          You left it, or it isn’t yours. Verify a school or work email from Social to join one.
        </Text>
      </View>
    );
  }

  const confirmLeave = () => {
    if (!org) return;
    haptics.tapMedium();
    Alert.alert(`Leave ${org.name}?`, 'You can join again by verifying your email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void leave(org.id)
            .then(() => router.back())
            .catch((e: Error) => Alert.alert('Couldn’t leave', e.message));
        },
      },
    ]);
  };

  const renew = org ? renewNote(org.verifiedAt) : null;
  const Icon = org?.kind === 'school' ? GraduationCap : Building;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={c.fgMuted} />}
    >
      <Stack.Screen options={{ title: org?.name ?? '' }} />
      {org ? (
        <View className="mb-5 flex-row items-center gap-3">
          <View className="items-center justify-center rounded-2xl bg-surface" style={{ width: 48, height: 48 }}>
            <Icon size={24} strokeWidth={1.7} color={c.fg2} />
          </View>
          <View className="flex-1">
            <Text numberOfLines={2} style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 24, letterSpacing: -0.4 }}>
              {org.name}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <BadgeCheck size={14} strokeWidth={2} color={c.loved} />
              <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
                {kindLabel(org.kind)} · verified @{org.domain} · {org.memberCount} {org.memberCount === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {renew ? (
        <View className="mb-5 gap-3 rounded-2xl bg-surface px-4 py-3.5">
          <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>{renew}</Text>
          <SecondaryButton compact label="Verify again" onPress={() => router.push('/verify-org')} />
        </View>
      ) : null}

      <Segmented options={BOARD_KINDS} value={kind} onChange={setKind} />

      {kind === 'trails' ? (
        <View className="mt-5">
          <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18, marginBottom: 6 }}>
            {org ? `${org.name}’s top trails` : 'Top trails'}
          </Text>
          <TrailBoard kind="org" id={id} />
        </View>
      ) : (
        <View className="mt-3">
          <PeriodSwitch period={period} onChange={setPeriod} />

          {error ? (
            <View className="mt-6 gap-2">
              <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
              <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
            </View>
          ) : null}
          {loading ? (
            <View className="mt-6">
              <Skeleton shape="row" count={4} />
            </View>
          ) : null}
          {board.length > 0 ? (
            <View className="mt-6">
              <Leaderboard
                rows={board}
                title={`Climbed ${periodLabel(period)}`}
                footnote="Everyone here verified an email at this domain in the last year. Recorded hikes only; weeks run Monday to Sunday."
              />
            </View>
          ) : null}
          {!loading && !error && board.length === 1 ? (
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 12 }}>
              You’re the first one here. Tell people at {org?.name ?? 'work'} to verify their email in Apex and they’ll show up on this board.
            </Text>
          ) : null}
        </View>
      )}

      {org ? (
        <View className="mt-8">
          <SecondaryButton label={`Leave ${kindLabel(org.kind).toLowerCase()}`} onPress={confirmLeave} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/** A verified school's or company's leaderboard. */
export default function OrgScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <View className="flex-1 bg-bg">
      <SignInGate why="see your school or company board">{() => (id ? <OrgPage id={id} /> : null)}</SignInGate>
    </View>
  );
}
