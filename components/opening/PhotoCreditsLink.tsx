import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { cardStyle, fonts } from '@/theme/tokens';

/** Settings' last card: where the trail data and opening photos come from. */
export function PhotoCreditsLink() {
  const router = useRouter();
  const c = useColors();
  return (
    <View style={[cardStyle(c), { paddingBottom: 6 }]}>
      <Eyebrow>About</Eyebrow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Credits"
        onPress={() => router.push('/credits')}
        className="mt-2 flex-row items-center justify-between py-3 active:opacity-70"
      >
        <View className="flex-1">
          <Text style={{ color: c.fg, fontFamily: fonts.ui, fontSize: 15 }}>Credits</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
            Trail data and opening-screen photos
          </Text>
        </View>
        <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
      </Pressable>
    </View>
  );
}
