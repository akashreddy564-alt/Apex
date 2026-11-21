import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import { FORECAST_KEY, hikingArea } from '@/lib/forecast';
import { isGoodHikingDay, sky, type DayForecast } from '@/lib/nudges';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { isPickDay, pickWeekKey, weekendPicks, type PickTrail, type WeekendPick } from '@/lib/weekendPick';
import { useRankingStore } from '@/stores/rankingStore';
import { useSavedTrails } from '@/stores/savedTrailsStore';
import { useTrailCache } from '@/stores/trailCache';
import { useWeekendPickStore } from '@/stores/weekendPickStore';
import type { Trail } from '@/types/trail';

function startOf(trail: Trail): [number, number] | null {
  const point = trail.trailhead ?? trail.path?.coordinates?.[0];
  return point && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? [point[0], point[1]] : null;
}

/** "Saturday looks good: 64° and clear", from the cached forecast only. Never fetches. */
function useWeekendWeather(now: Date): string | null {
  const [line, setLine] = useState<string | null>(null);
  const saturdayKey = useMemo(() => {
    const saturday = new Date(now);
    saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7));
    return saturday.toDateString();
  }, [now]);
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(FORECAST_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const cached = JSON.parse(raw) as {
          key?: string;
          weekend?: { saturday: DayForecast | null; sunday: DayForecast | null } | null;
        };
        if (!cached.key?.endsWith(saturdayKey) || !cached.weekend) return;
        const { saturday, sunday } = cached.weekend;
        const good = isGoodHikingDay(saturday) ? { name: 'Saturday', day: saturday } : isGoodHikingDay(sunday) ? { name: 'Sunday', day: sunday } : null;
        if (good) setLine(`${good.name} looks good: ${Math.round(good.day.highF)}° and ${sky(good.day.code)}`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [saturdayKey]);
  return line;
}

/** This week's weekend pick, or null on Monday and Tuesday or when there's nothing honest to suggest. */
export function useWeekendPick(): { pick: WeekendPick | null; weather: string | null; skip: () => void } {
  const rankings = useRankingStore((s) => s.rankings);
  const trails = useTrailCache((s) => s.trails);
  const logs = useTrailCache((s) => s.logs);
  const saved = useSavedTrails((s) => s.saved);
  const storedWeek = useWeekendPickStore((s) => s.week);
  const storedSkips = useWeekendPickStore((s) => s.skipped);
  const skipTrail = useWeekendPickStore((s) => s.skip);

  // Fixed for the session: the pick only changes when the day or the data does.
  const [now] = useState(() => new Date());
  const week = pickWeekKey(now);
  const skipped = storedWeek === week ? storedSkips : [];

  const pick = useMemo(() => {
    if (!isPickDay(now)) return null;
    const loved = rankings
      .filter((row) => row.bucket === 'loved' && row.hike_type === DEFAULT_HIKE_TYPE)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.trail_id);
    const pickTrails: PickTrail[] = trails.map((t) => ({
      id: t.id,
      name: t.name,
      region: t.region,
      source: t.source,
      distance_km: t.distance_km,
      elevation_gain_m: t.elevation_gain_m,
      start: startOf(t),
    }));

    const area = hikingArea(logs, trails);
    let home = area ? { ...area, fromHike: true } : null;
    if (!home) {
      const top = loved.map((id) => pickTrails.find((t) => t.id === id)).find((t) => t?.start);
      if (top?.start) home = { lon: top.start[0], lat: top.start[1], fromHike: false };
    }

    return (
      weekendPicks({
        trails: pickTrails,
        loved,
        done: [...logs.map((log) => log.trail_id), ...rankings.map((row) => row.trail_id)],
        saved: saved.map((row) => row.trailId),
        home,
        skipped,
      })[0] ?? null
    );
  }, [now, rankings, trails, logs, saved, skipped]);

  const weather = useWeekendWeather(now);
  return {
    pick,
    weather: pick ? weather : null,
    skip: () => {
      if (pick) skipTrail(week, pick.trail.id);
    },
  };
}
