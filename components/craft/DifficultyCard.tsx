import { Text, View } from 'react-native';

import { Eyebrow, ReasonLine } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { difficultyReasons } from '@/lib/reasons';
import { difficultyRating } from '@/lib/trailDifficulty';
import { useSettings } from '@/stores/settingsStore';
import { cardStyle, difficultyRamp, fonts, numericStyle } from '@/theme/tokens';
import type { ElevationSample } from '@/types/trail';

const STEPS = 5;
const BAR = 8;

/**
 * The NPS Shenandoah difficulty: a 5-step pill from forest green to red-brown,
 * filled to this trail's step and ringed there, its label and score, and the reasons.
 * Renders nothing when the trail has no distance or climb to rate.
 */
export function DifficultyCard({
  trail,
}: {
  trail: {
    distance_km: number | null;
    elevation_gain_m: number | null;
    peak_elevation_m: number | null;
    elevation_profile: ElevationSample[];
  };
}) {
  const c = useColors();
  const appearance = useSettings((st) => st.appearance);
  const rating = difficultyRating(trail.distance_km, trail.elevation_gain_m);
  if (!rating) return null;
  const reasons = difficultyReasons(trail);

  const ramp = difficultyRamp[appearance];

  return (
    <View style={cardStyle(c)}>
      <Eyebrow>Difficulty</Eyebrow>
      {/* One pill split into five steps, filled up to this trail's, which is ringed in ink. */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Difficulty: ${rating.label}`}
        accessibilityValue={{ min: 1, max: STEPS, now: rating.level + 1, text: `${rating.level + 1} of ${STEPS}` }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 12, height: BAR }}
      >
        {ramp.map((color, i) => {
          const segment = (
            <View
              style={{
                height: BAR,
                backgroundColor: i <= rating.level ? color : c.raised,
                borderTopLeftRadius: i === 0 ? BAR / 2 : 0,
                borderBottomLeftRadius: i === 0 ? BAR / 2 : 0,
                borderTopRightRadius: i === STEPS - 1 ? BAR / 2 : 0,
                borderBottomRightRadius: i === STEPS - 1 ? BAR / 2 : 0,
              }}
            />
          );
          return i === rating.level ? (
            <View
              key={color}
              style={{ flex: 1, borderWidth: 2, borderColor: c.fg, borderRadius: 3, padding: 1, marginVertical: -3 }}
            >
              {segment}
            </View>
          ) : (
            <View key={color} style={{ flex: 1 }}>
              {segment}
            </View>
          );
        })}
      </View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 10, marginBottom: reasons.length ? 10 : 0 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold }}>{rating.label}</Text>
        {'  ·  '}
        <Text style={numericStyle('medium')}>{Math.round(rating.score)}</Text> on the NPS scale
      </Text>
      {reasons.map((r, i) => (
        <ReasonLine key={r.value + r.text} value={r.value} text={r.text} first={i === 0} tone={c.climb} />
      ))}
    </View>
  );
}
