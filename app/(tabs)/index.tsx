import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

/** Friends' hikes land here once accounts and friends exist (plan 3 steps 2–4). */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
    >
      <Text
        className="px-4"
        style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: -0.4 }}
      >
        apex
      </Text>

      <View className="mx-4 mt-6 rounded-2xl bg-surface px-5 py-8">
        <Text className="text-center text-[15px] text-fg">
          Your friends' hikes will show up here.
        </Text>
        <Text className="mt-2 text-center text-[13px] text-fg-muted">
          Friends arrive in the next update.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/trails')}
        className="mx-4 mt-3 flex-row items-center justify-between rounded-2xl border border-raised px-4 py-4 active:bg-surface"
      >
        <Text className="text-[15px] text-fg">Browse trails</Text>
        <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
      </Pressable>
    </ScrollView>
  );
}
