import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useSafetyActions } from '@/hooks/useSafety';

export interface SafetyTarget {
  person: string;
  name: string;
  post?: string;
  comment?: string;
}

/**
 * Report and block, from a profile, a post or a comment. Apple requires both
 * wherever people see each other's content.
 */
export function useSafetyMenu(onBlocked?: () => void) {
  const router = useRouter();
  const { block } = useSafetyActions();
  const first = (name: string) => name.split(/\s+/)[0] || name;

  const confirmBlock = (target: SafetyTarget) =>
    Alert.alert(
      `Block ${first(target.name)}?`,
      'You’ll stop being friends and won’t see each other’s hikes, comments or requests. They aren’t told.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            void block(target.person).then(() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onBlocked?.();
            }),
        },
      ],
    );

  return (target: SafetyTarget) => {
    void Haptics.selectionAsync();
    const what = target.comment ? 'this comment' : target.post ? 'this hike' : first(target.name);
    Alert.alert(target.name, undefined, [
      {
        text: `Report ${what}`,
        onPress: () =>
          router.push({
            pathname: '/report',
            params: {
              person: target.person,
              name: target.name,
              ...(target.post ? { post: target.post } : {}),
              ...(target.comment ? { comment: target.comment } : {}),
            },
          }),
      },
      { text: `Block ${first(target.name)}`, style: 'destructive', onPress: () => confirmBlock(target) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
}
