import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

/** One reason a trail was suggested: a short verdict and the plain sentence behind it. */
export function ReasonLine({
  value,
  text,
  first = false,
  tone,
}: {
  value: string;
  text: string;
  first?: boolean;
  /** Value color: distance blue or climb brown when the number is one of those. */
  tone?: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingTop: first ? 4 : 12,
        paddingBottom: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: c.border,
      }}
    >
      <Text style={{ minWidth: 64, fontFamily: fonts.uiSemibold, fontSize: 15, color: tone ?? c.fg }}>{value}</Text>
      <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fg2 }}>{text}</Text>
    </View>
  );
}
