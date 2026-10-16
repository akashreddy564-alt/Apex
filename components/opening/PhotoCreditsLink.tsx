import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function PhotoCreditsLink() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Photo credits"
      onPress={() => router.push('/credits')}
      className="mt-8 py-3 active:opacity-70"
    >
      <Text className="text-[15px] text-zinc-300">Photo credits</Text>
    </Pressable>
  );
}
