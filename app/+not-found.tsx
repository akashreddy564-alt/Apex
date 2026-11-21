import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton } from '@/components/social/Buttons';
import { GateCard } from '@/components/social/SignInGate';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View className="flex-1 bg-bg">
        <GateCard
          eyebrow="Off trail"
          title="Nothing here"
          body="This link points at a page Apex doesn’t have, or one that was removed."
        >
          <PrimaryButton label="Go home" onPress={() => router.replace('/')} />
        </GateCard>
      </View>
    </>
  );
}
