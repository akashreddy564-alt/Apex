import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Footprints, House, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { TabIcon } from '@/components/TabIcon';
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
        // Screens slide a little in the direction of the tab, instead of cutting.
        animation: 'shift',
      }}
      screenListeners={{
        tabPress: () => void Haptics.selectionAsync().catch(() => undefined),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Users} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Footprints} color={color} focused={focused} />,
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
