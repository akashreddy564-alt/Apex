import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { GroupMark } from '@/components/groups/GroupMark';
import { Eyebrow, Skeleton } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { useMyGroups, usePrefetchGroup } from '@/hooks/useGroups';
import { movement, ordinal, type Group } from '@/lib/groupRules';
import { cardStyle, fonts } from '@/theme/tokens';

function GroupRow({ group, first }: { group: Group; first: boolean }) {
  const c = useColors();
  const router = useRouter();
  const prefetch = usePrefetchGroup();
  const move = movement(group.place, group.previousPlace);
  const place = group.place != null && group.weekGainM > 0 ? `${ordinal(group.place)} this week` : 'No climbs yet this week';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${place}${move ? `, moved ${move}` : ''}`}
      onPressIn={() => prefetch(group.id)}
      onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
      className={`flex-row items-center gap-3 py-2.5 active:opacity-80 ${first ? '' : 'border-t border-raised'}`}
    >
      <GroupMark name={group.name} color={group.color} />
      <View className="flex-1">
        <Text numberOfLines={1} style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
          {group.name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
            {place} · {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
          </Text>
          {move === 'up' ? <ArrowUp size={13} strokeWidth={2} color={c.loved} /> : null}
          {move === 'down' ? <ArrowDown size={13} strokeWidth={2} color={c.disliked} /> : null}
        </View>
      </View>
      <ChevronRight size={18} strokeWidth={1.6} color={c.fgFaint} />
    </Pressable>
  );
}

/** Social's groups: your place in each, then Create and Join. */
export function GroupsSection() {
  const c = useColors();
  const router = useRouter();
  const { groups, loading, error, refetch } = useMyGroups();
  return (
    <View className="mx-4 mt-8">
      <View style={cardStyle(c)}>
        <Eyebrow>Weekly climbs</Eyebrow>
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18, marginTop: 6 }}>Groups</Text>
        {error ? (
          <View className="mt-3 gap-2">
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
            <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
          </View>
        ) : null}
        {!loading && !error && groups.length === 0 ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
            Start one with your coworkers or hiking crew and see who climbs the most each week.
          </Text>
        ) : null}
        {loading && groups.length === 0 ? (
          <View className="mt-2">
            <Skeleton shape="row" count={2} />
          </View>
        ) : null}
        <View className="mt-2">
          {groups.map((group, i) => (
            <GroupRow key={group.id} group={group} first={i === 0} />
          ))}
        </View>
      </View>
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Create group" onPress={() => router.push('/create-group')} />
        </View>
        <View className="flex-1">
          <SecondaryButton label="Join with code" onPress={() => router.push('/join-group')} />
        </View>
      </View>
    </View>
  );
}
