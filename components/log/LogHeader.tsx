import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { NotificationAsk } from '@/components/habit/NotificationAsk';
import { Eyebrow, Odometer } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';
import { weekStart } from '@/lib/streak';
import { formatAmount, type GoalMetric } from '@/lib/weeklyGoal';
import { fonts, minTypeSize } from '@/theme/tokens';

export type LogView = 'hikes' | 'rankings';

interface LogHeaderProps {
  view: LogView;
  onView: (view: LogView) => void;
  /** Opens the trail picker before recording. */
  onStart: () => void;
  onLogPast: () => void;
  onProfile: () => void;
  /** Opens the weekly goal. */
  onGoal: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 16–22", or "Nov 30–Dec 6" across a month. */
export function weekRange(now: Date = new Date()): string {
  const mon = weekStart(now);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const end = sun.getMonth() === mon.getMonth() ? `${sun.getDate()}` : `${MONTHS[sun.getMonth()]} ${sun.getDate()}`;
  return `${MONTHS[mon.getMonth()]} ${mon.getDate()}–${end}`;
}

const UNIT: Record<GoalMetric, { short: string; verb: string; label: [string, string] }> = {
  elevation: { short: 'ft', verb: 'Climbed across', label: ['FT', 'CLIMBED'] },
  distance: { short: 'mi', verb: 'Across', label: ['MI', 'HIKED'] },
};

/**
 * This week's climb on a rolling odometer, how far is left to the goal, the
 * two quieter ways to add a hike, and the Hikes/Rankings switch. Starting a
 * hike is the slider at the bottom of the screen.
 */
export function LogHeader({ view, onView, onStart, onLogPast, onProfile, onGoal }: LogHeaderProps) {
  const c = useColors();
  const { goal, progress } = useWeeklyGoal();
  const unit = UNIT[goal.metric];
  const format = useCallback((n: number) => formatAmount(goal.metric, n), [goal.metric]);
  const hikes = `${progress.hikes} ${progress.hikes === 1 ? 'hike' : 'hikes'}`;
  const left = `${formatAmount(goal.metric, Math.max(0, progress.target - progress.done))} ${unit.short}`;

  return (
    <View className="px-4">
      {/* The week block is the way into the weekly goal. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Weekly goal, ${format(progress.done)} of ${format(progress.target)} ${unit.short}`}
        accessibilityHint="Opens your weekly goal"
        onPress={onGoal}
        className="active:opacity-80"
      >
        <View style={{ minHeight: 32, justifyContent: 'center', paddingRight: 44 }}>
          <Eyebrow>{`This week · ${weekRange()}`}</Eyebrow>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }}>
          <Odometer value={progress.done} format={format} />
          <View style={{ marginLeft: 8, paddingBottom: 6 }}>
            {unit.label.map((word) => (
              <Text key={word} style={{ fontFamily: fonts.mono, fontSize: minTypeSize, letterSpacing: 1.3, color: c.fgMuted }}>
                {word}
              </Text>
            ))}
          </View>
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fgMuted, marginTop: 10 }}>
          {progress.complete ? (
            'Goal met this week.'
          ) : (
            <>
              {progress.hikes > 0 ? `${unit.verb} ${hikes}. ` : 'No hikes yet this week. '}
              <Text style={{ color: c.fg }}>{left}</Text>
              {' to your weekly goal.'}
            </>
          )}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile and settings"
        onPress={onProfile}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-raised"
        style={{ position: 'absolute', top: 0, right: 16 }}
      >
        <View className="h-3 w-3 rounded-full bg-fg-muted" />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onLogPast}
          className="items-center justify-center active:opacity-80"
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.raised,
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 14 }}>Log past hike</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onStart} hitSlop={8} className="active:opacity-70">
          <Text
            style={{
              color: c.fgMuted,
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              textDecorationLine: 'underline',
            }}
          >
            Pick a trail first
          </Text>
        </Pressable>
      </View>

      <NotificationAsk />

      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          marginTop: 14,
          padding: 4,
          borderRadius: 14,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.raised,
        }}
      >
        {(['hikes', 'rankings'] as const).map((option) => {
          const on = option === view;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onView(option)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: on ? c.fg : 'transparent' }}
            >
              <Text style={{ color: on ? c.bg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 13 }}>
                {option === 'hikes' ? 'Hikes' : 'Rankings'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
