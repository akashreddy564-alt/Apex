import { Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { weekStart } from '@/lib/streak';
import type { DayLevel } from '@/lib/streakGrid';
import { fonts } from '@/theme/tokens';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const GAP = 5;

/** Accent at 35% alpha, from a #RRGGBB palette color. */
function faded(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}59` : hex;
}

/** "AUG 31": the Monday that starts the oldest column. */
export function firstMonday(weeks: number, now: Date = new Date()): string {
  const start = weekStart(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
}

/**
 * Twelve weeks of hikes as a dot grid: a column per week (oldest left), a row
 * per day (Monday on top). A full hike is solid accent, a short one faded.
 */
export function StreakGrid({
  grid,
  streakWeeks,
  now,
}: {
  grid: DayLevel[][];
  streakWeeks: number;
  now?: Date;
}) {
  const c = useColors();
  const days = grid.reduce((n, week) => n + week.filter((d) => d > 0).length, 0);
  const color = (level: DayLevel) => (level === 2 ? c.accent : level === 1 ? faded(c.accent) : c.raised);
  const legend = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: c.fgFaint } as const;

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised, borderRadius: 22, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow>Last 12 weeks</Eyebrow>
        {streakWeeks > 0 ? (
          <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 13, color: c.fg, fontVariant: ['tabular-nums'] }}>
            {`${streakWeeks}-week streak`}
          </Text>
        ) : null}
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} hiked in the last ${grid.length} weeks`}
        style={{ marginTop: 14, gap: GAP }}
      >
        {Array.from({ length: 7 }, (_, day) => (
          <View key={day} style={{ flexDirection: 'row', gap: GAP }}>
            {grid.map((week, w) => (
              <View
                key={w}
                style={{ flex: 1, aspectRatio: 1, borderRadius: 3, backgroundColor: color(week[day] ?? 0) }}
              />
            ))}
          </View>
        ))}
      </View>
      <View aria-hidden style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={legend}>{firstMonday(grid.length, now)}</Text>
        <Text style={legend}>■ FULL HIKE  ▪ SHORT HIKE</Text>
        <Text style={legend}>NOW</Text>
      </View>
    </View>
  );
}
