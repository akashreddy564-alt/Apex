import { Text } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

/** A small mono label above a heading or number. */
export function Eyebrow({ children }: { children: string }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontFamily: fonts.mono,
        fontSize: 10,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: c.fgMuted,
      }}
    >
      {children}
    </Text>
  );
}
