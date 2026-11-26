import { Text } from 'react-native';

import { useColors } from '@/hooks/useColors';
import type { TasteMatch } from '@/lib/rankListRules';
import { fonts, numericStyle } from '@/theme/tokens';

/** "You and Maya agree 82% · 9 trails in common", or just the count below 4 shared trails. */
export function TasteLine({ match, firstName }: { match: TasteMatch | null; firstName: string }) {
  const c = useColors();
  if (!match || match.shared === 0) return null;
  const common = `${match.shared} ${match.shared === 1 ? 'trail' : 'trails'} in common`;
  if (match.agreement == null) {
    return <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14, marginTop: 10, textAlign: 'center' }}>{common}</Text>;
  }
  return (
    <Text
      accessibilityLabel={`You and ${firstName} agree ${match.agreement} percent, ${common}`}
      style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 14, marginTop: 10, textAlign: 'center' }}
    >
      You and {firstName} agree{' '}
      <Text style={{ ...numericStyle('semibold'), color: c.accent }}>{match.agreement}%</Text>
      {` · ${common}`}
    </Text>
  );
}
