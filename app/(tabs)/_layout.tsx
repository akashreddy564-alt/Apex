import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { Tabs } from 'expo-router';
import { Footprints, House, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts, navTitle, tabBarStyle } from '@/theme/tokens';

/** Fills the tab slot. minHeight is the touch target; icon and label styles stay put. */
function TabButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, styles.tabHit]} />;
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
        tabBarStyle: tabBarStyle(c),
        tabBarActiveTintColor: c.fg,
        tabBarInactiveTintColor: c.fgFaint,
        headerShown: false,
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
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={20} strokeWidth={1.6} color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color }) => <Users size={20} strokeWidth={1.6} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => <Footprints size={20} strokeWidth={1.6} color={color} />,
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
