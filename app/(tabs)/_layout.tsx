import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { Tabs } from 'expo-router';
import { CircleUser, Footprints, House, Users } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/components/motion';
import { TabBarGlass } from '@/components/motion/TabBarGlass';
import { TabIcon } from '@/components/TabIcon';
import { useColors } from '@/hooks/useColors';
import { fonts, navTitle, tabBarStyle } from '@/theme/tokens';

/** Fills the tab slot. minHeight is the touch target; icon and label styles stay put. */
function TabButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, styles.tabHit]} />;
}

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.fg,
        headerTitleStyle: { ...navTitle, color: c.fg },
        headerShadowVisible: false,
        tabBarStyle: tabBarStyle(c, false, insets.bottom),
        // Liquid Glass on iOS 26, frosted blur elsewhere. Content scrolls under it; tab screens pad by its height.
        tabBarBackground: () => <TabBarGlass />,
        tabBarActiveTintColor: c.fg,
        tabBarInactiveTintColor: c.fgFaint,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontFamily: fonts.uiMedium,
        },
        tabBarButton: (props) => <TabButton {...props} />,
        sceneStyle: { backgroundColor: c.bg },
        // Screens slide a little in the direction of the tab, instead of cutting.
        animation: 'shift',
      }}
      screenListeners={{
        tabPress: () => haptics.select(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} symbol="house" filledSymbol="house.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Users} symbol="person.2" filledSymbol="person.2.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Footprints} symbol="figure.hiking" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={CircleUser} symbol="person.crop.circle" filledSymbol="person.crop.circle.fill" color={color} focused={focused} />
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
