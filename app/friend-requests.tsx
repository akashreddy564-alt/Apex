import { ScrollView, Text, View } from 'react-native';

import { PersonRow } from '@/components/social/PersonRow';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFriendships } from '@/hooks/useFriends';
import { fonts } from '@/theme/tokens';

function Requests() {
  const c = useColors();
  const { incoming, outgoing } = useFriendships();
  const label = { color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 20 } as const;
  return (
    <View>
      <Text style={label}>Asked you</Text>
      {incoming.length === 0 ? (
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 14, marginTop: 8 }}>
          No requests right now.
        </Text>
      ) : (
        incoming.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            action={<RelationButton personId={person.id} name={person.display_name} relation="incoming" />}
          />
        ))
      )}
      {outgoing.length > 0 ? (
        <>
          <Text style={label}>You asked</Text>
          {outgoing.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              action={<RelationButton personId={person.id} name={person.display_name} relation="outgoing" />}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

export default function FriendRequestsScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <SignInGate why="see friend requests">{() => <Requests />}</SignInGate>
    </ScrollView>
  );
}
