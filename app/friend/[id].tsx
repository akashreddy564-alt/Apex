import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/social/Avatar';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFriendships, usePerson } from '@/hooks/useFriends';
import { fonts } from '@/theme/tokens';

function PersonPage({ id }: { id: string }) {
  const c = useColors();
  const { person, friendCount, loading, error } = usePerson(id);
  const { relationTo } = useFriendships();

  if (loading) {
    return (
      <View className="mt-16 items-center">
        <ActivityIndicator color={c.fgMuted} />
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
        <RelationButton personId={person.id} name={person.display_name} relation={relation} compact={false} />
      </View>
      {note ? (
        <Text
          style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 14, textAlign: 'center' }}
        >
          {note}
        </Text>
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
