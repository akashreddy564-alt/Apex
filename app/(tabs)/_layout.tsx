import { Tabs } from 'expo-router';
import { Footprints, ListOrdered, Mountain } from 'lucide-react-native';

import { colors, fonts, navTitle } from '@/theme/tokens';

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
