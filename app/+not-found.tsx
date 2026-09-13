import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing' }} />
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="font-mono text-sm text-zinc-400">Screen not found</Text>
        <Link href="/" className="mt-4">
          <Text className="font-mono text-xs text-accent">Back to trails</Text>
        </Link>
      </View>
    </>
  );
}
