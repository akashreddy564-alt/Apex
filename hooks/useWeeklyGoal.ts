import { useMemo } from 'react';

import { weeklyProgress, type GoalProgress, type WeeklyGoal } from '@/lib/weeklyGoal';
import { useGoal } from '@/stores/goalStore';
import { useTrailCache } from '@/stores/trailCache';

/** This week's progress toward the goal, plus the goal itself. */
export function useWeeklyGoal(): {
  goal: WeeklyGoal;
  progress: GoalProgress;
  hasHiked: boolean;
} {
  const metric = useGoal((s) => s.metric);
  const target = useGoal((s) => s.target);
  const logs = useTrailCache((s) => s.logs);
  const trails = useTrailCache((s) => s.trails);
  return useMemo(() => {
    const byId = new Map(trails.map((trail) => [trail.id, trail]));
    const goal = { metric, target };
    return {
      goal,
      progress: weeklyProgress(logs, (id) => byId.get(id), goal),
      hasHiked: logs.length > 0,
    };
  }, [logs, metric, target, trails]);
}
