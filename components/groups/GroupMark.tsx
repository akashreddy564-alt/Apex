import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import type { GroupColor } from '@/lib/groupRules';
import { fonts, type Palette } from '@/theme/tokens';

/** The group's color, taken from the palette so it reads in both appearances. */
export function groupColor(color: GroupColor, c: Palette): string {
  switch (color) {
    case 'green':
      return c.loved;
    case 'amber':
      return c.fine;
    case 'red':
      return c.disliked;
    case 'blue':
      return '#5B8FD9';
    case 'slate':
      return c.fgMuted;
    default:
      return c.accent;
  }
}

/** A rounded square with the group's first letter in its color. */
export function GroupMark({ name, color, size = 44 }: { name: string; color: GroupColor; size?: number }) {
  const c = useColors();
  const tint = groupColor(color, c);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        borderWidth: 1.5,
        borderColor: tint,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: tint, fontFamily: fonts.display, fontSize: Math.round(size * 0.42) }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}
