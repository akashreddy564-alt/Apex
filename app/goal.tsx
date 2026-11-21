import { useMemo } from 'react';
import { ScrollView, Text, View, type ViewStyle } from 'react-native';

import { GoalDial } from '@/components/craft/GoalDial';
import { WeekBars } from '@/components/craft/WeekBars';
import { Eyebrow } from '@/components/motion';
import { ChoiceRow } from '@/components/settings/ChoiceRow';
import { useColors } from '@/hooks/useColors';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';
import { dailyTotals, DIAL_RANGE, paceLine } from '@/lib/goalDial';
import { formatAmount, toDisplay, toStored, type GoalMetric } from '@/lib/weeklyGoal';
import { useGoal } from '@/stores/goalStore';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle } from '@/theme/tokens';

const METRICS: { value: GoalMetric; label: string }[] = [
  { value: 'elevation', label: 'Elevation' },
  { value: 'distance', label: 'Distance' },
];

const TITLE = 30;

const STEPS: Record<GoalMetric, { title: string; body: string }[]> = {
  elevation: [
    { title: 'Every hike dated this week', body: 'Monday to Sunday, recorded or logged after.' },
    { title: 'Climbing, not net change', body: 'Every uphill foot of the hike adds up.' },
    { title: 'Resets Monday', body: 'Your streak keeps going as long as you hike once each week.' },
  ],
  distance: [
    { title: 'Every hike dated this week', body: 'Monday to Sunday, recorded or logged after.' },
    { title: 'Your miles, or the trail’s', body: 'A hike without its own measurement uses the trail’s distance.' },
    { title: 'Resets Monday', body: 'Your streak keeps going as long as you hike once each week.' },
  ],
};

/** Turn the dial to set the week's target; the bars and pace line answer straight away. */
export default function GoalScreen() {
  const c = useColors();
  const { goal, progress } = useWeeklyGoal();
  const setMetric = useGoal((s) => s.setMetric);
  const setTarget = useGoal((s) => s.setTarget);
  const logs = useTrailCache((s) => s.logs);
  const trails = useTrailCache((s) => s.trails);
  const metric = goal.metric;
  const unit = metric === 'elevation' ? 'ft' : 'mi';

  // A saved target outside the dial's range shows clamped; the store keeps it until the dial turns.
  const { min, max } = DIAL_RANGE[metric];
  const saved = toDisplay(metric, goal.target);
  const shown = Math.min(max, Math.max(min, saved));
  const targetStored = shown === saved ? goal.target : toStored(metric, shown);

  const totals = useMemo(() => {
    const byId = new Map(trails.map((t) => [t.id, t]));
    return dailyTotals(logs, (id) => byId.get(id), metric);
  }, [logs, trails, metric]);
  const pace = paceLine(metric, progress.done, targetStored);

  const card: ViewStyle = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.raised,
    borderRadius: 22,
    padding: 16,
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-12 pt-6">
      <View style={{ paddingHorizontal: 16 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: c.fg,
            fontFamily: fonts.displayExtraBold,
            fontWeight: 'normal',
            fontSize: TITLE,
            lineHeight: Math.round(TITLE * 0.88),
            letterSpacing: -0.025 * TITLE,
            textTransform: 'uppercase',
            paddingTop: 4,
          }}
        >
          {metric === 'elevation' ? 'Set your climb\nfor the week' : 'Set your miles\nfor the week'}
        </Text>
        <View style={{ marginTop: 16 }}>
          <ChoiceRow<GoalMetric> options={METRICS} value={metric} onChange={setMetric} />
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <GoalDial metric={metric} display={shown} onChange={(display) => setTarget(toStored(metric, display))} />
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Eyebrow>This week</Eyebrow>
            <Text style={{ ...numericStyle('semibold'), fontSize: 14, color: c.fg }}>
              {formatAmount(metric, progress.done)}{' '}
              <Text style={{ ...numericStyle('medium'), color: c.fgMuted }}>
                of {formatAmount(metric, targetStored)} {unit}
              </Text>
            </Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <WeekBars totals={totals} targetStored={targetStored} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <PaceDot color={pace.tone === 'behind' ? c.fine : c.loved} />
            <Text style={{ flex: 1, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 }}>
              {pace.text}
            </Text>
          </View>
        </View>

        <View style={card}>
          <View style={{ marginBottom: 6 }}>
            <Eyebrow>What counts</Eyebrow>
          </View>
          {STEPS[metric].map((step, i) => (
            <View
              key={step.title}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.raised,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: c.fgMuted }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 14, lineHeight: 19, color: c.fg }}>{step.title}</Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fgMuted }}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/** An 8 px dot with a soft halo in the same color. */
function PaceDot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: /^#[0-9a-f]{6}$/i.test(color) ? `${color}26` : 'transparent',
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}
