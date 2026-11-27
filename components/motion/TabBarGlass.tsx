import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';

import { useSettings } from '@/stores/settingsStore';

import { Glass } from './Glass';

/** iOS 26 Liquid Glass, checked once. Older iOS, Android and web get the frosted `Glass`. */
const liquid = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

/**
 * The tab bar's background. On iOS 26 it's real Liquid Glass, which bends
 * the content scrolling under it. Reduce Transparency, and every phone
 * without the API, falls back to the blur the sheets use. Never give this
 * or a parent `opacity: 0`: the glass stops drawing.
 */
export function TabBarGlass() {
  const appearance = useSettings((s) => s.appearance);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (!liquid) return;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => sub.remove();
  }, []);

  if (!liquid || reduceTransparency) return <Glass />;
  return (
    <GlassView
      glassEffectStyle="regular"
      colorScheme={appearance === 'dark' ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    />
  );
}
