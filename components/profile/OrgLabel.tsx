import { BadgeCheck } from 'lucide-react-native';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SymbolIcon } from '@/components/SymbolIcon';
import { useColors } from '@/hooks/useColors';
import { usePersonOrgs } from '@/hooks/useOrganizations';
import { fonts } from '@/theme/tokens';

/**
 * A verified school or company under someone's @username, e.g. "Georgia Tech".
 * Shows for yourself and friends; draws nothing otherwise.
 */
export function OrgLabel({
  personId,
  size = 13,
  center = false,
  style,
}: {
  personId: string | null | undefined;
  size?: number;
  center?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const names = usePersonOrgs(personId);
  if (names.length === 0) return null;
  const line = names.join(' · ');
  return (
    <View
      accessibilityLabel={`Verified: ${line}`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: center ? 'center' : 'flex-start' }, style]}
    >
      <SymbolIcon name="checkmark.seal.fill" fallback={BadgeCheck} size={size} color={c.accent} />
      <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: size }} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}
