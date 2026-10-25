import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { initials } from '@/lib/username';
import { fonts } from '@/theme/tokens';

/** Initials on a quiet disc. Photos come later. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const c = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.raised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: Math.round(size * 0.36) }}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}
