import { Text, View } from 'react-native';

import { Eyebrow, ReasonLine } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { difficultyReasons } from '@/lib/reasons';
import { difficultyRating } from '@/lib/trailDifficulty';
import { cardStyle, fonts } from '@/theme/tokens';
import type { ElevationSample } from '@/types/trail';

const STEPS = 5;

/**
 * The NPS Shenandoah difficulty as a 5-step bar, with the reasons behind it.
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
  const rating = difficultyRating(trail.distance_km, trail.elevation_gain_m);
  if (!rating) return null;
  const reasons = difficultyReasons(trail);

  return (
    <View style={cardStyle(c)}>
      <Eyebrow>{`Why it's ${rating.label.toLowerCase()}`}</Eyebrow>
      {/* Only the bar is one element; the rating line and reasons stay readable on their own. */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Difficulty: ${rating.label}`}
        accessibilityValue={{ min: 1, max: STEPS, now: rating.level + 1, text: `${rating.level + 1} of ${STEPS}` }}
        style={{ flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 6 }}
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= rating.level ? c.accent : c.raised }}
          />
        ))}
      </View>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 0.8,
          color: c.fgFaint,
          marginBottom: reasons.length ? 10 : 0,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`NPS SHENANDOAH RATING · ${Math.round(rating.score)}`}
      </Text>
      {reasons.map((r, i) => (
        <ReasonLine key={r.value + r.text} value={r.value} text={r.text} first={i === 0} />
      ))}
    </View>
  );
}
