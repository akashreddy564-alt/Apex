import { ScrollView, Text, View } from "react-native";

import { Ring } from "@/components/habit/GoalRing";
import { ChoiceRow } from "@/components/settings/ChoiceRow";
import { useColors } from "@/hooks/useColors";
import { useWeeklyGoal } from "@/hooks/useWeeklyGoal";
import {
  formatAmount,
  GOAL_PRESETS,
  toDisplay,
  toStored,
  type GoalMetric,
} from "@/lib/weeklyGoal";
import { useGoal } from "@/stores/goalStore";
import { fonts, numericStyle } from "@/theme/tokens";

const METRICS: { value: GoalMetric; label: string }[] = [
  { value: "elevation", label: "Elevation" },
  { value: "distance", label: "Distance" },
];

/** This week's ring, big, and the two choices that shape it. */
export default function GoalScreen() {
  const c = useColors();
  const { goal, progress } = useWeeklyGoal();
  const setMetric = useGoal((s) => s.setMetric);
  const setTarget = useGoal((s) => s.setTarget);
  const unit = goal.metric === "elevation" ? "ft" : "mi";
  const left = Math.max(0, progress.target - progress.done);

  // The stored target may be a value from an older preset list; match on what's shown.
  const shownTarget = toDisplay(goal.metric, goal.target);
  const presets = GOAL_PRESETS[goal.metric].map((value) => ({
    value: String(value),
    label: formatAmount(goal.metric, toStored(goal.metric, value)),
  }));

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="px-4 pb-12 pt-8"
    >
      <View className="items-center">
        <View
          style={{
            width: 168,
            height: 168,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ position: "absolute" }}>
            <Ring
              fraction={progress.fraction}
              size={168}
              stroke={12}
              complete={false}
            />
          </View>
          <Text
            style={{ ...numericStyle("semibold"), color: c.fg, fontSize: 30 }}
          >
            {formatAmount(goal.metric, progress.done)}
          </Text>
          <Text
            style={{
              ...numericStyle(),
              color: c.fgMuted,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            of {formatAmount(goal.metric, progress.target)} {unit}
          </Text>
        </View>
        <Text
          style={{
            color: c.fg,
            fontFamily: fonts.display,
            fontSize: 19,
            marginTop: 20,
          }}
        >
          {progress.complete
            ? "Goal met this week"
            : `${formatAmount(goal.metric, left)} ${unit} to go`}
        </Text>
        <Text
          style={{
            color: c.fgMuted,
            fontFamily: fonts.ui,
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {progress.hikes === 0
            ? "No hikes yet this week. It resets every Monday."
            : `${progress.hikes} ${progress.hikes === 1 ? "hike" : "hikes"} this week. It resets every Monday.`}
        </Text>
      </View>

      <Text className="mt-10 text-[13px] text-fg-muted">Track</Text>
      <View className="mt-3">
        <ChoiceRow<GoalMetric>
          options={METRICS}
          value={goal.metric}
          onChange={setMetric}
        />
      </View>

      <Text className="mt-6 text-[13px] text-fg-muted">
        Weekly target, {unit === "ft" ? "feet" : "miles"}
      </Text>
      <View className="mt-3">
        <ChoiceRow<string>
          options={presets}
          value={String(shownTarget)}
          onChange={(value) => setTarget(toStored(goal.metric, Number(value)))}
        />
      </View>

      <Text
        style={{
          color: c.fgFaint,
          fontFamily: fonts.ui,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 20,
        }}
      >
        Every hike dated this week counts, Monday to Sunday. A hike without its
        own measurement uses the trail’s. Only you see your goal.
      </Text>
    </ScrollView>
  );
}
