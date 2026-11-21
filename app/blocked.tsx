import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { PersonRow } from '@/components/social/PersonRow';
import { SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useBlocked, useSafetyActions } from '@/hooks/useSafety';
import { fonts } from '@/theme/tokens';

function BlockedList() {
  const c = useColors();
  const { people, loading, error } = useBlocked();
  const { unblock, unblockingFor } = useSafetyActions();
  if (loading) return <ActivityIndicator color={c.fgMuted} style={{ marginTop: 24 }} />;
  if (error) return <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>;
  if (people.length === 0) {
    return (
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 }}>
        You haven’t blocked anyone. Block someone from their page, a hike or a comment.
      </Text>
    );
  }
  return (
    <View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
        Unblocking doesn’t make you friends again. Either of you can send a request.
      </Text>
      {people.map((person) => (
        <PersonRow
          key={person.id}
          person={person}
          action={
            <SecondaryButton
              compact
              label="Unblock"
              a11y={`Unblock ${person.display_name}`}
              busy={unblockingFor === person.id}
              onPress={() => unblock(person.id)}
            />
          }
        />
      ))}
    </View>
  );
}

export default function BlockedScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}>
      <SignInGate why="manage blocked people">{() => <BlockedList />}</SignInGate>
    </ScrollView>
  );
}
