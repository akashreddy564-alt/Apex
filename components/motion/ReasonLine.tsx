import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

/** One reason a trail was suggested: a short verdict and the plain sentence behind it. */
export function ReasonLine({ value, text }: { value: string; text: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border }}>
      <Text style={{ minWidth: 64, fontFamily: fonts.uiSemibold, fontSize: 15, color: c.fg }}>{value}</Text>
      <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fg2 }}>{text}</Text>
    </View>
  );
}
