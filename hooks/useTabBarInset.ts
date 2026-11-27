import { createContext, useContext } from 'react';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** True inside the iOS native (Liquid Glass) tab bar, which doesn't report its height. */
export const NativeTabsContext = createContext(false);

/** The iOS 26 tab bar's floating pill plus its gap above the home indicator. */
const NATIVE_BAR = 62;

/**
 * The height of the floating tab bar, for padding the bottom of a tab screen's
 * scroll content so its last items clear the glass. Zero outside the tabs
 * (tests, modals), where `useBottomTabBarHeight` would throw.
 */
export function useTabBarInset(): number {
  const jsTabs = useContext(BottomTabBarHeightContext);
  const native = useContext(NativeTabsContext);
  const insets = useSafeAreaInsets();
  if (native) return insets.bottom + NATIVE_BAR;
  return jsTabs ?? 0;
}
