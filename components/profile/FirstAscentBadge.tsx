import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { useFirstAscent } from '@/hooks/useFirstAscent';
import { ascentA11yLabel, formatAscentNo } from '@/lib/firstAscent';
import { PEAK_SHAPE, SNOW_CAP, toSvgPath } from '@/lib/peakIntro';
import { fonts, numericStyle } from '@/theme/tokens';

const flat = (pts: readonly (readonly [number, number])[]) => pts.flatMap(([x, y]) => [x, y]);
/** The same peak the launch intro turns the A into. */
const PEAK_D = toSvgPath(flat(PEAK_SHAPE));
const SNOW_D = toSvgPath(flat(SNOW_CAP));
const VIEW_BOX = '-50 -12 180 112';
const ASPECT = 180 / 112;

function PeakGlyph({ height, rock, snow }: { height: number; rock: string; snow: string }) {
  return (
    <Svg width={height * ASPECT} height={height} viewBox={VIEW_BOX}>
      <Path d={PEAK_D} fill={rock} />
      <Path d={SNOW_D} fill={snow} />
    </Svg>
  );
}

type FirstAscentBadgeProps = {
  userId: string | null | undefined;
  /** `lg` on a profile, `sm` beside a name in a list or feed. */
  size?: 'sm' | 'lg';
  /** Spacing from the name above. Only applies when there's a badge to show. */
  style?: StyleProp<ViewStyle>;
};

/**
 * "FIRST ASCENT #007" for the first 100 hikers on Apex. Renders nothing for
 * everyone else, so it can sit beside any name.
 */
export function FirstAscentBadge({ userId, size = 'sm', style }: FirstAscentBadgeProps) {
  const c = useColors();
  const n = useFirstAscent(userId);
  if (n == null) return null;

  if (size === 'lg') {
    return (
      <View
        accessible
        accessibilityLabel={ascentA11yLabel(n)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 10,
            paddingRight: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: c.fg,
          },
          style,
        ]}
      >
        <PeakGlyph height={14} rock={c.fgFaint} snow={c.bg} />
        <Text
          style={{
            color: c.bg,
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: 1.6,
          }}
        >
          FIRST ASCENT
        </Text>
        <Text
          style={{
            ...numericStyle('semibold'),
            color: c.bg,
            fontSize: 14,
            letterSpacing: 0.4,
          }}
        >
          {formatAscentNo(n)}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={ascentA11yLabel(n)}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}
    >
      <PeakGlyph height={10} rock={c.fgMuted} snow={c.fg} />
      <Text
        style={{
          color: c.fgMuted,
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: 1,
        }}
      >
        FIRST ASCENT <Text style={{ color: c.fg2 }}>{formatAscentNo(n)}</Text>
      </Text>
    </View>
  );
}
