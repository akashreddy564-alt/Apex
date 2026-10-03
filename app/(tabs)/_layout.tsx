import { Tabs, useRouter } from 'expo-router';
import { Footprints, ListOrdered, Mountain } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, navTitle } from '@/theme/tokens';

function AccountButton() {
  const router = useRouter();
  if (!isSupabaseConfigured) return null;
  return (
    <Pressable
      accessibilityLabel="Settings"
      onPress={() => router.push('/account')}
      className="mr-3 px-2 py-1 active:opacity-70"
    >
      <Text className="font-ui text-[13px] text-zinc-400">Settings</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.fg,
        headerTitleStyle: navTitle,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.raised,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.fgFaint,
        headerRight: () => <AccountButton />,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.uiMedium,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trails',
          tabBarIcon: ({ color }) => (
            <Mountain size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => (
            <Footprints size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color }) => (
            <ListOrdered size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
