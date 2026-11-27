import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { Tabs } from 'expo-router';
import { CircleUser, Footprints, House, Users } from 'lucide-react-native';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/components/motion';
import { TabBarGlass } from '@/components/motion/TabBarGlass';
import { TabIcon } from '@/components/TabIcon';
import { useColors } from '@/hooks/useColors';
import { NativeTabsContext } from '@/hooks/useTabBarInset';
import { useTourTarget } from '@/hooks/useTourTarget';
import { useSettings } from '@/stores/settingsStore';
import { useTour } from '@/stores/tourStore';
import { fonts, navTitle, tabBarStyle } from '@/theme/tokens';

/** Fills the tab slot. minHeight is the touch target; icon and label styles stay put. */
function TabButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, styles.tabHit]} />;
}

/** The Social tab, which the Home tour points at. */
function SocialTabButton(props: BottomTabBarButtonProps) {
  const target = useTourTarget('social');
  return (
    <View {...target} style={styles.tabSlot}>
      <TabButton {...props} />
    </View>
  );
}

function JsTabsLayout() {
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
          tabBarButton: (props) => <SocialTabButton {...props} />,
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

/**
 * iOS: the system tab bar, which on iOS 26 is Liquid Glass, with the pill
 * that slides between tabs and shrinks as you scroll. Screens keep their own
 * bottom padding (automatic insets off), sized by useTabBarInset.
 */
function NativeTabsLayout() {
  const c = useColors();
  const appearance = useSettings((s) => s.appearance);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The native bar can't be measured from JS; tell the Home tour roughly where Social sits.
  useEffect(() => {
    const item = (width - 40) / 4;
    useTour.getState().setRect('social', { x: 20 + item, y: height - insets.bottom - 58, width: item, height: 50 });
  }, [height, insets.bottom, width]);
  return (
    <NativeTabsContext.Provider value>
      <NativeTabs
        tintColor={c.fg}
        iconColor={{ default: c.fgFaint, selected: c.fg }}
        labelStyle={{ fontFamily: fonts.uiMedium, fontSize: 11 }}
        minimizeBehavior="onScrollDown"
        blurEffect={appearance === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      >
        <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="social" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
          <NativeTabs.Trigger.Label>Social</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="log" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf="figure.hiking" />
          <NativeTabs.Trigger.Label>Log</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </NativeTabsContext.Provider>
  );
}

/** Native glass tabs on iOS; the frosted JS bar on Android and web. */
export default function TabsLayout() {
  return Platform.OS === 'ios' ? <NativeTabsLayout /> : <JsTabsLayout />;
}

const styles = StyleSheet.create({
  tabHit: {
    minHeight: 48,
    width: '100%',
  },
  tabSlot: {
    flex: 1,
  },
});
