import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { displayXL } from '@/theme/tokens';

/** Friends and groups arrive in plan 3 steps 3 and 5. */
export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View className="flex-1 bg-bg px-4" style={{ paddingTop: insets.top + 12 }}>
      <Text style={{ ...displayXL, color: c.fg }}>Social</Text>
      <Text className="mt-3 text-[15px] text-fg-muted">
        Add friends and start groups here soon.
      </Text>
    </View>
  );
}
