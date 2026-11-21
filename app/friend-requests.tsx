import { ScrollView, Text, View } from 'react-native';

import { Eyebrow, Skeleton } from '@/components/motion';
import { PersonRow } from '@/components/social/PersonRow';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFriendships } from '@/hooks/useFriends';
import { cardStyle, fonts } from '@/theme/tokens';

function Requests() {
  const c = useColors();
  const { incoming, outgoing, loading } = useFriendships();
  if (loading) {
    return (
      <View style={{ paddingTop: 16 }}>
        <Skeleton shape="row" count={5} />
      </View>
    );
  }
  return (
    <View>
      <View style={[cardStyle(c), { marginTop: 16, paddingBottom: incoming.length > 0 ? 6 : 16 }]}>
        <Eyebrow>Asked you</Eyebrow>
        {incoming.length === 0 ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 8 }}>
            No requests right now.
          </Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            {incoming.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={<RelationButton personId={person.id} name={person.display_name} username={person.username} relation="incoming" />}
              />
            ))}
          </View>
        )}
      </View>
      {outgoing.length > 0 ? (
        <View style={[cardStyle(c), { marginTop: 16, paddingBottom: 6 }]}>
          <Eyebrow>You asked</Eyebrow>
          <View style={{ marginTop: 4 }}>
            {outgoing.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={<RelationButton personId={person.id} name={person.display_name} username={person.username} relation="outgoing" />}
              />
            ))}
          </View>
        </View>
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
