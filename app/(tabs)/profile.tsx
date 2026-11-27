import { useRouter, useScrollToTop } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressScale } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { WeekCard } from '@/components/social/WeekCard';
import { useColors } from '@/hooks/useColors';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { displayXL } from '@/theme/tokens';

import { PersonPage } from '../friend/[id]';

/** You: your page as friends see it, your week, and the way into Settings. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const c = useColors();
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  // Tapping the Profile tab again scrolls back to the top.
  useScrollToTop(scroll);

  return (
    <ScrollView
      ref={scroll}
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabInset + 32 }}
    >
      <View className="flex-row items-center justify-between px-4">
        <Text style={{ ...displayXL, color: c.fg }}>Profile</Text>
        {/* 44 pt target in the corner the thumb reaches for "more". */}
        <PressScale
          to={0.9}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/account')}
          hitSlop={8}
          className="items-center justify-center rounded-full bg-surface"
          style={{ width: 44, height: 44, borderWidth: 1, borderColor: c.raised }}
        >
          <Settings size={20} strokeWidth={1.7} color={c.fg2} />
        </PressScale>
      </View>
      <SignInGate why="keep a profile friends can see" title="Sign in to make your profile">
        {(profile) => (
          <View>
            <WeekCard name={profile.display_name} />
            <View style={{ paddingHorizontal: 20 }}>
              <PersonPage id={profile.id} />
              <View className="mt-6">
                <SecondaryButton label="Edit profile" onPress={() => router.push('/username')} />
              </View>
            </View>
          </View>
        )}
      </SignInGate>
    </ScrollView>
  );
}
