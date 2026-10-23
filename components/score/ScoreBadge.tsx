import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import type { ScoreStyle } from '@/lib/appearance';
import type { Bucket } from '@/lib/ranking';
import { scoreBadgeContent } from '@/lib/scoreBadge';
import { useSettings } from '@/stores/settingsStore';
import { fonts, minTypeSize, numericStyle } from '@/theme/tokens';

interface ScoreBadgeProps {
  bucket: Bucket;
  /** Hikes in this bucket. Below 3 the badge shows the bucket word. */
  count: number;
  score: number;
  /** `lg` for posts and the trail page, `sm` for list rows. */
  size?: 'lg' | 'sm';
  /** Overrides the personal setting, for previews in Settings. */
  style?: ScoreStyle;
}

const PEAK_PATH = 'M2 38 L17 10 L23 18 L30 4 L44 38 Z';

/** A score in the person's chosen style: a bare number, a peak, or a trail blaze. */
export function ScoreBadge({ bucket, count, score, size = 'lg', style }: ScoreBadgeProps) {
  const c = useColors();
  const chosen = useSettings((s) => s.scoreStyle);
  const shape = style ?? chosen;
  const { value, label, tone } = scoreBadgeContent(bucket, count, score);
  const color = c[tone];
  const scale = size === 'lg' ? 1 : 0.75;
  const a11y = value ? `${label}, ${value}` : label;

  // A small peak is too narrow for a word, so words fall back to the plain style.
  if (shape === 'number' || (shape === 'peak' && size === 'sm' && !value)) {
    return (
      <View accessible accessibilityLabel={a11y} style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            ...numericStyle('semibold'),
            color,
            fontSize: value ? (size === 'lg' ? 26 : 17) : size === 'lg' ? 15 : 13,
            letterSpacing: value ? -0.6 : 0,
          }}
        >
          {value ?? label}
        </Text>
        {value && size === 'lg' ? (
          <Text
            style={{
              color,
              fontFamily: fonts.uiSemibold,
              fontSize: minTypeSize,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  const text = value ?? label;
  // The bucket word is longer than a score, so it shrinks to fit the shape.
  const fontSize = Math.max(minTypeSize, (value ? 13 : 11) * scale);

  if (shape === 'peak') {
    const w = 46 * scale;
    const h = 40 * scale;
    return (
      <View accessible accessibilityLabel={a11y} style={{ width: w + (value ? 0 : 12), height: h, alignItems: 'center' }}>
        <Svg width={w} height={h} viewBox="0 0 46 40" style={{ position: 'absolute', top: 0 }}>
          <Path d={PEAK_PATH} fill={color} />
        </Svg>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            position: 'absolute',
            bottom: 4 * scale,
            ...numericStyle('semibold'),
            color: c.bg,
            fontSize,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{
        minWidth: 30 * scale,
        height: 44 * scale,
        paddingHorizontal: value ? 0 : 4,
        borderRadius: 3,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-2deg' }],
      }}
    >
      <Text
        numberOfLines={1}
        style={{ ...numericStyle('semibold'), color: c.bg, fontSize }}
      >
        {text}
      </Text>
    </View>
  );
}
