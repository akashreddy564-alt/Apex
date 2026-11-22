import { Text, View } from 'react-native';

import { Eyebrow, ReasonLine } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { difficultyReasons } from '@/lib/reasons';
import { difficultyRating } from '@/lib/trailDifficulty';
import { useSettings } from '@/stores/settingsStore';
import { withAlpha } from '@/theme/color';
import { cardStyle, difficultyRamp, fonts, numericStyle } from '@/theme/tokens';
import type { ElevationSample } from '@/types/trail';

const STEPS = 5;

/**
 * The NPS Shenandoah difficulty: its label in the band's color, a 5-step bar
 * from forest green to red-brown with this trail's step raised, and the reasons.
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
  const tone = ramp[rating.level];

  return (
    <View style={cardStyle(c)}>
      <Eyebrow>Difficulty</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone }} />
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 20, flexShrink: 1 }} numberOfLines={1}>
          {rating.label}
        </Text>
      </View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
        <Text style={{ color: c.fg2, ...numericStyle('semibold') }}>{Math.round(rating.score)}</Text> on the NPS Shenandoah scale
      </Text>
      {/* Only the bar is one element; the rating line and reasons stay readable on their own. */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Difficulty: ${rating.label}`}
        accessibilityValue={{ min: 1, max: STEPS, now: rating.level + 1, text: `${rating.level + 1} of ${STEPS}` }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, height: 12 }}
      >
        {ramp.map((color, i) => {
          const here = i === rating.level;
          return (
            <View
              key={color}
              style={{
                flex: 1,
                height: here ? 10 : 6,
                borderRadius: 5,
                backgroundColor: i <= rating.level ? color : withAlpha(color, 0.22),
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: reasons.length ? 10 : 0 }}>
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11 }}>Easiest</Text>
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 11 }}>Very strenuous</Text>
      </View>
      {reasons.map((r, i) => (
        <ReasonLine key={r.value + r.text} value={r.value} text={r.text} first={i === 0} />
      ))}
    </View>
  );
}
