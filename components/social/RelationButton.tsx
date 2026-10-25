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
  relation,
  compact = true,
}: {
  personId: string;
  name: string;
  relation: Relation;
  compact?: boolean;
}) {
  const actions = useFriendActions();
  const busy = actions.pendingFor === personId;

  if (relation === 'self') return null;
  if (relation === 'none') {
    return (
      <PrimaryButton
        compact={compact}
        label="Add"
        a11y={`Add ${name}`}
        busy={busy}
        onPress={() => actions.add(personId)}
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
          busy={busy}
          onPress={() => actions.accept(personId)}
        />
        <SecondaryButton
          compact={compact}
          label="Decline"
          a11y={`Decline ${name}`}
          disabled={busy}
          onPress={() => actions.decline(personId)}
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
        busy={busy}
        onPress={() =>
          Alert.alert(`Cancel your request to ${name}?`, undefined, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Cancel request', style: 'destructive', onPress: () => actions.remove(personId) },
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
      busy={busy}
      onPress={() =>
        Alert.alert(`Unfriend ${name}?`, 'You’ll stop seeing each other’s hikes.', [
          { text: 'Keep', style: 'cancel' },
          { text: 'Unfriend', style: 'destructive', onPress: () => actions.remove(personId) },
        ])
      }
    />
  );
}
