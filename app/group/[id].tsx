import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';

import { GroupMark, groupColor } from '@/components/groups/GroupMark';
import { Avatar } from '@/components/social/Avatar';
import { SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useGroupActions, useGroupPage, useMyGroups } from '@/hooks/useGroups';
import { formatDistance, formatElevation, MISSING_METRIC } from '@/lib/format';
import {
  groupInvitePath,
  PERIODS,
  periodLabel,
  spacedCode,
  togetherLine,
  type BoardRow,
  type Group,
  type GroupSummary,
  type Period,
} from '@/lib/groups';
import { fonts, numericStyle } from '@/theme/tokens';

const PERIOD_NAMES: Record<Period, string> = { week: 'Week', month: 'Month', year: 'Year' };

function PeriodSwitch({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const c = useColors();
  return (
    <View className="flex-row rounded-xl bg-surface p-1" accessibilityRole="tablist">
      {PERIODS.map((option) => {
        const on = option === period;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option);
            }}
            className={`flex-1 items-center rounded-lg py-2 ${on ? 'bg-fg' : ''}`}
          >
            <Text style={{ color: on ? c.bg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 13 }}>
              {PERIOD_NAMES[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Together({ summary, period }: { summary: GroupSummary; period: Period }) {
  const c = useColors();
  return (
    <View className="mt-6">
      <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
        Together {periodLabel(period)}
      </Text>
      <Text
        accessibilityRole="header"
        style={{ ...numericStyle('semibold'), color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 44, letterSpacing: -1, marginTop: 2 }}
      >
        {formatElevation(summary.totalGainM)}
      </Text>
      <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 15, marginTop: 2 }}>
        {togetherLine(summary.totalGainM)}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }}>
        {summary.totalHikes} {summary.totalHikes === 1 ? 'hike' : 'hikes'} · {formatDistance(summary.totalKm)}
      </Text>
    </View>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string | null; detail: string }) {
  const c = useColors();
  return (
    <View className="rounded-2xl bg-surface px-4 py-3.5" style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: value ? c.fg : c.fgFaint, fontFamily: fonts.uiSemibold, fontSize: 16, marginTop: 4 }}>
        {value ?? MISSING_METRIC}
      </Text>
      <Text numberOfLines={2} style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 }}>
        {detail}
      </Text>
    </View>
  );
}

function StatCards({ summary }: { summary: GroupSummary }) {
  return (
    <View className="mt-5 flex-row flex-wrap gap-3">
      <StatCard
        label="Top climber"
        value={summary.topClimber?.name ?? null}
        detail={summary.topClimber ? formatElevation(summary.topClimber.gainM) : 'No recorded climbs yet'}
      />
      <StatCard
        label="Group favorite"
        value={summary.favorite?.name ?? null}
        detail={summary.favorite ? `Ranked by ${summary.favorite.rankers}` : 'Needs 2 people to rank a trail'}
      />
      <StatCard
        label="Taste match"
        value={summary.tasteMatch?.name ?? null}
        detail={summary.tasteMatch ? `${summary.tasteMatch.percent}% same order as you` : 'Needs 3 trails you’ve both ranked'}
      />
      <StatCard
        label="Longest day"
        value={summary.longestDay?.name ?? null}
        detail={summary.longestDay ? formatDistance(summary.longestDay.km) : 'No recorded hikes yet'}
      />
    </View>
  );
}

function Board({ rows, group }: { rows: BoardRow[]; group: Group | undefined }) {
  const c = useColors();
  const { remove, removingFor } = useGroupActions();
  const top = Math.max(1, ...rows.map((row) => row.gainM));

  const confirmRemove = (row: BoardRow) => {
    if (!group?.isOwner || row.isMe) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Remove ${row.displayName}?`, 'They can join again with the code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => group && remove(group.id, row.userId) },
    ]);
  };

  return (
    <View className="mt-7">
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Elevation</Text>
      <View className="mt-2">
        {rows.map((row) => (
          <Pressable
            key={row.userId}
            accessibilityLabel={`${row.place}. ${row.isMe ? 'You' : row.displayName}, ${formatElevation(row.gainM)}`}
            accessibilityHint={group?.isOwner && !row.isMe ? 'Long press to remove from the group' : undefined}
            onLongPress={() => confirmRemove(row)}
            className="flex-row items-center gap-3 py-2"
            style={{ opacity: removingFor === row.userId ? 0.4 : 1 }}
          >
            <Text style={{ ...numericStyle('semibold'), width: 22, color: c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
              {row.place}
            </Text>
            <Avatar name={row.displayName} size={34} />
            <View className="flex-1">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text numberOfLines={1} style={{ flexShrink: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
                  {row.isMe ? 'You' : row.displayName}
                </Text>
                <Text style={{ ...numericStyle('semibold'), color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
                  {formatElevation(row.gainM)}
                </Text>
              </View>
              <View className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: c.raised }}>
                <View
                  className="h-full rounded-full"
                  style={{ width: `${(row.gainM / top) * 100}%`, backgroundColor: row.isMe ? c.accent : c.fgFaint }}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 }}>
        Recorded hikes only. Weeks run Monday to Sunday.
        {group?.isOwner ? ' Long-press someone to remove them.' : ''}
      </Text>
    </View>
  );
}

function Invite({ group, fresh }: { group: Group; fresh: boolean }) {
  const c = useColors();
  const link = Linking.createURL(groupInvitePath(group.code));
  const share = () => {
    void Share.share({
      message: `Join ${group.name} on Apex and see who climbs the most each week. Code ${group.code}: ${link}`,
    });
  };
  return (
    <View
      className="mt-7 rounded-2xl px-5 py-5"
      style={{ backgroundColor: c.surface, borderWidth: fresh ? 1.5 : 0, borderColor: groupColor(group.color, c) }}
    >
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 17 }}>
        {fresh ? 'Invite your crew' : 'Invite'}
      </Text>
      <Text
        selectable
        accessibilityLabel={`Code ${group.code.split('').join(' ')}`}
        style={{ color: c.fg, fontFamily: fonts.mono, fontSize: 30, letterSpacing: 4, marginTop: 10 }}
      >
        {spacedCode(group.code)}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }}>
        {group.memberCount} of 50 · anyone with the code or link can join
      </Text>
      <View className="mt-4">
        <SecondaryButton label="Share invite link" onPress={share} />
      </View>
    </View>
  );
}

function GroupPage({ id, fresh }: { id: string; fresh: boolean }) {
  const c = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const { groups, loading: groupsLoading } = useMyGroups();
  const group = groups.find((row) => row.id === id);
  const { board, summary, loading, refreshing, error, refetch } = useGroupPage(id, period);
  const { leave, leaving } = useGroupActions();

  const confirmLeave = () => {
    if (!group) return;
    const last = group.memberCount <= 1;
    Alert.alert(
      `Leave ${group.name}?`,
      last
        ? 'You’re the last one in it, so the group will be deleted.'
        : group.isOwner
          ? 'The person who’s been in it longest takes over.'
          : 'You can join again with the code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: last ? 'Leave and delete' : 'Leave',
          style: 'destructive',
          onPress: () => void leave(group.id).then(() => router.back()),
        },
      ],
    );
  };

  if (!groupsLoading && !group) {
    return (
      <View className="px-4 pt-6">
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 19 }}>Not in this group</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 6 }}>
          You left it or were removed. Ask someone in it for the code to join again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={c.fgMuted} />}
    >
      <Stack.Screen options={{ title: group?.name ?? '' }} />
      {group ? (
        <View className="mb-5 flex-row items-center gap-3">
          <GroupMark name={group.name} color={group.color} size={48} />
          <View className="flex-1">
            <Text numberOfLines={1} style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 24, letterSpacing: -0.4 }}>
              {group.name}
            </Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
              {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
            </Text>
          </View>
        </View>
      ) : null}

      <PeriodSwitch period={period} onChange={setPeriod} />

      {loading ? <ActivityIndicator color={c.fgMuted} style={{ marginTop: 32 }} /> : null}
      {error ? (
        <View className="mt-6 gap-2">
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
          <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
        </View>
      ) : null}

      {summary ? (
        <>
          <Together summary={summary} period={period} />
          <StatCards summary={summary} />
        </>
      ) : null}
      {board.length > 0 ? <Board rows={board} group={group} /> : null}
      {group ? <Invite group={group} fresh={fresh} /> : null}

      {group ? (
        <View className="mt-8">
          <SecondaryButton label="Leave group" onPress={confirmLeave} busy={leaving} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/** A group's together number, stat cards, leaderboard and invite. */
export default function GroupScreen() {
  const params = useLocalSearchParams<{ id?: string; fresh?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <View className="flex-1 bg-bg">
      <SignInGate why="see your groups">{() => (id ? <GroupPage id={id} fresh={params.fresh === '1'} /> : null)}</SignInGate>
    </View>
  );
}
