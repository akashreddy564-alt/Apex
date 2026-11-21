import { useContext } from 'react';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';

/**
 * The height of the floating tab bar, for padding the bottom of a tab screen's
 * scroll content so its last items clear the glass. Zero outside the tabs
 * (tests, modals), where `useBottomTabBarHeight` would throw.
 */
export function useTabBarInset(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
