import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Ring } from '@/components/habit/GoalRing';
import { useColors } from '@/hooks/useColors';
import { useTourTarget } from '@/hooks/useTourTarget';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';
import { weekCard } from '@/lib/homeDashboard';
import { weekRange } from '@/lib/weekRecap';
import { posterLineStyle } from '@/lib/posterFit';
import { toDisplay } from '@/lib/weeklyGoal';
import { useTrailCache } from '@/stores/trailCache';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

const KM_PER_MILE = 1.609344;

/**
 * Home's hero: this week's climb (or distance, if that's the goal) toward the
 * weekly goal, the ring, then hikes, miles and the streak. Shows at zero too,
 * so a new hiker sees what they're aiming at. Opens the goal screen.
 */
/** `tourTarget`: only Home's copy, so a second copy (Profile) never moves the tour's spotlight. */
export function WeekHero({ tourTarget = false }: { tourTarget?: boolean } = {}) {
  const c = useColors();
  const router = useRouter();
  const tour = useTourTarget('week');
  const { goal } = useWeeklyGoal();
  const logs = useTrailCache((s) => s.logs);
  const trails = useTrailCache((s) => s.trails);
  // Read the clock whenever the hikes change or Home comes back into view, so a
  // hike just finished counts and a new week starts on Monday without a restart.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((n) => n + 1), []));
  const { card, now } = useMemo(() => {
    const at = new Date();
    const byId = new Map(trails.map((t) => [t.id, t]));
    return { card: weekCard(logs, (id) => byId.get(id), goal, at), now: at };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `visit` re-reads the clock.
  }, [goal, logs, trails, visit]);

  const unit = card.metric === 'elevation' ? 'ft' : 'mi';
  const tone = card.metric === 'elevation' ? c.climb : c.distance;
  const done = toDisplay(card.metric, card.done);
  const target = toDisplay(card.metric, card.target);
  const doneText = card.metric === 'elevation' ? Math.round(done).toLocaleString('en-US') : done.toFixed(1);
  const goalText = `${Math.round(target).toLocaleString('en-US')} ${unit}`;
  const line = card.done > 0 ? `${card.percent}% of your ${goalText} goal` : `Goal ${goalText}`;
  const miles = (card.distanceKm / KM_PER_MILE).toFixed(1);

  const label = { color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 } as const;
  const value = { color: c.fg, fontSize: 16, marginTop: 2, ...numericStyle('semibold') } as const;

  return (
    <Pressable
      {...(tourTarget ? tour : {})}
      accessibilityRole="button"
      accessibilityLabel="This week"
      accessibilityHint="Opens your weekly goal"
      onPress={() => router.push('/goal')}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={[cardStyle(c), { marginHorizontal: 16, marginTop: 14 }]}>
        <Text style={label}>THIS WEEK · {weekRange(now).toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[{ color: tone, fontFamily: fonts.poster, fontSize: 40 }, posterLineStyle(40, 0, 0.92, true)]}>
                {doneText}
              </Text>
              <Text style={label}>{unit.toUpperCase()}</Text>
            </View>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>{line}</Text>
          </View>
          <Ring fraction={card.percent / 100} size={52} stroke={6} complete={card.percent >= 100} color={tone} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.raised }}>
          <View style={{ flex: 1 }}>
            <Text style={label}>HIKES</Text>
            <Text style={value}>{card.hikes}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={label}>MILES</Text>
            <Text style={[value, { color: c.distance }]}>{miles}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={label}>STREAK</Text>
            <Text style={value}>{card.streakWeeks} wk</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
