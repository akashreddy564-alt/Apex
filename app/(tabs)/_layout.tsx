import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { Tabs, useRouter } from 'expo-router';
import { Footprints, ListOrdered, Mountain } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts, navTitle } from '@/theme/tokens';

/** Fills the tab slot. minHeight is the touch target; icon and label styles stay put. */
function TabButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, styles.tabHit]} />;
}

function AccountButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel="Settings"
      onPress={() => router.push('/account')}
      className="mr-3 px-2 py-1 active:opacity-70"
    >
      <Text className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        Settings
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.fg,
        headerTitleStyle: { ...navTitle, color: c.fg },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.raised,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: c.fg,
        tabBarInactiveTintColor: c.fgFaint,
        headerRight: () => <AccountButton />,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fonts.uiMedium,
        },
        tabBarButton: (props) => <TabButton {...props} />,
        sceneStyle: { backgroundColor: c.bg },
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

const styles = StyleSheet.create({
  tabHit: {
    minHeight: 48,
    width: '100%',
  },
});
