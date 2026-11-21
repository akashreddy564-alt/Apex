import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/stores/settingsStore';

/** `#RRGGBB` plus an opacity, as an rgba() string. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * A frosted surface for the tab bar and bottom sheets only. Cards stay solid.
 * iOS and web blur what sits behind it and lay a palette wash on top: `fill`
 * picks the color (`surface` for the tab bar, `bg` for sheets, so their
 * controls keep page contrast) and `wash` its opacity. Android gets a plain
 * `fill` at 85% (or the wash, if higher), since a real blur there needs a
 * BlurTargetView around the content behind it.
 */
export function Glass({
  style,
  children,
  intensity = 40,
  fill = 'surface',
  wash = 0.55,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  intensity?: number;
  /** The palette color laid over the blur. Sheets use `bg`, so their controls keep the contrast they have on the page. */
  fill?: 'surface' | 'bg';
  /** Opacity of that color over the blur (iOS and web). Higher reads more solid. */
  wash?: number;
}) {
  const c = useColors();
  const appearance = useSettings((s) => s.appearance);
  const color = c[fill];
  if (Platform.OS === 'android') {
    return <View style={[styles.fill, { backgroundColor: withAlpha(color, Math.max(0.85, wash)) }, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={intensity} tint={appearance === 'dark' ? 'dark' : 'light'} style={[styles.fill, styles.clip, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, wash) }]} />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // BlurView ignores borderRadius on native; clipping makes a radius stick.
  clip: { overflow: 'hidden' },
});
