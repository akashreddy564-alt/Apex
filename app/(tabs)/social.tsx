import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/social/Avatar';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { displayXL, fonts } from '@/theme/tokens';

/** Friends arrive in plan 3 step 3, groups in step 5. */
export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
    >
      <Text className="px-4" style={{ ...displayXL, color: c.fg }}>
        Social
      </Text>
      <SignInGate why="add friends and join groups">
        {(profile) => (
          <View className="mx-4 mt-6 flex-row items-center gap-3">
            <Avatar name={profile.display_name} />
            <View>
              <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                {profile.display_name}
              </Text>
              <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
                @{profile.username}
              </Text>
            </View>
          </View>
        )}
      </SignInGate>
    </ScrollView>
  );
}
