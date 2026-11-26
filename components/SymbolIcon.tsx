import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import { Platform, type ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * An Apple SF Symbol on iOS (filled when `focused` and a filled name is
 * given), and the matching lucide icon on Android and web, where SF Symbols
 * don't exist. Never draws nothing.
 */
export function SymbolIcon({
  name,
  filledName,
  fallback: Fallback,
  size,
  color,
  focused = false,
}: {
  name: SFSymbol;
  filledName?: SFSymbol;
  fallback: LucideIcon;
  size: number;
  color: ColorValue;
  focused?: boolean;
}) {
  if (Platform.OS !== 'ios') {
    return <Fallback size={size} strokeWidth={focused ? 2 : 1.6} color={color as string} />;
  }
  return (
    <SymbolView
      name={focused && filledName ? filledName : name}
      tintColor={color}
      weight={focused ? 'semibold' : 'regular'}
      size={size}
      style={{ width: size, height: size }}
      fallback={<Fallback size={size} strokeWidth={1.6} color={color as string} />}
    />
  );
}
