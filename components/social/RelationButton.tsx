import { Alert, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useFriendActions } from '@/hooks/useFriends';
import type { Relation } from '@/lib/friends';

/**
 * The one button that fits how you relate to someone: Add, Requested
 * (tap to cancel), Accept / Decline, or Friends (tap to unfriend).
 */
export function RelationButton({
  personId,
  name,
  username = '',
  relation,
  compact = true,
}: {
  personId: string;
  name: string;
  /** Shown in your lists until the server's copy arrives. */
  username?: string;
  relation: Relation;
  compact?: boolean;
}) {
  const actions = useFriendActions();
  const person = { id: personId, display_name: name, username };

  if (relation === 'self') return null;
  if (relation === 'none') {
    return (
      <PrimaryButton
        compact={compact}
        label="Add"
        a11y={`Add ${name}`}
        onPress={() => actions.add(person)}
      />
    );
  }
  if (relation === 'incoming') {
    return (
      <View className="flex-row gap-2">
        <PrimaryButton
          compact={compact}
          label="Accept"
          a11y={`Accept ${name}`}
          onPress={() => actions.accept(person)}
        />
        <SecondaryButton
          compact={compact}
          label="Decline"
          a11y={`Decline ${name}`}
          onPress={() => actions.decline(person)}
        />
      </View>
    );
  }
  if (relation === 'outgoing') {
    return (
      <SecondaryButton
        compact={compact}
        label="Requested"
        a11y={`Cancel request to ${name}`}
        onPress={() =>
          Alert.alert(`Cancel your request to ${name}?`, undefined, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Cancel request', style: 'destructive', onPress: () => actions.remove(person) },
          ])
        }
      />
    );
  }
  return (
    <SecondaryButton
      compact={compact}
      label="Friends"
      a11y={`Friends with ${name}. Unfriend`}
      onPress={() =>
        Alert.alert(`Unfriend ${name}?`, 'You’ll stop seeing each other’s hikes.', [
          { text: 'Keep', style: 'cancel' },
          { text: 'Unfriend', style: 'destructive', onPress: () => actions.remove(person) },
        ])
      }
    />
  );
}
