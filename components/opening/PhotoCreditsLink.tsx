import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function PhotoCreditsLink() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Credits"
      onPress={() => router.push('/credits')}
      className="mt-8 py-3 active:opacity-70"
    >
      <Text className="text-[15px] text-fg-2">Credits</Text>
    </Pressable>
  );
}
