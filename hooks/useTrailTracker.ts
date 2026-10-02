import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_USER_ID } from '@/data/mockTrails';
import {
  clearHike,
  currentHike,
  elapsedSeconds,
  hydrateHike,
  pauseHike,
  resumeHike,
  startHike,
  subscribeHike,
  updateHike,
  type PersistedHike,
} from '@/lib/activeHike';
import { formatPace, paceSecondsPerKm, recordingPhase, totalSeconds } from '@/lib/hikeStats';
import { newId } from '@/lib/geo';
import { stopTracking } from '@/lib/locationTask';
import { buildPastHikeLog, type PastHikeDraft } from '@/lib/pastHike';
import { pushLog } from '@/lib/remoteSync';
import { useTrailCache } from '@/stores/trailCache';
import type { GeoJSONLineString, HikeLog } from '@/types/trail';

export type TrackPoint = PersistedHike['points'][number];
export type ActiveSession = PersistedHike;

export interface UseTrailTrackerResult {
  session: ActiveSession | null;
  elapsedSeconds: number;
  isTracking: boolean;
  isPaused: boolean;
  phase: 'idle' | 'recording' | 'paused';
  start: (trailId: string) => void;
  pause: () => void;
  resume: () => void;
  setNotes: (notes: string) => void;
  addPhoto: (uri: string) => void;
  replacePhoto: (from: string, to: string) => void;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  currentElevationM: number | null;
  totalSeconds: number;
  paceLabel: string;
  savedAt: number | null;
  recovered: boolean;
  dismissRecovery: () => void;
  tick: () => void;
  complete: () => HikeLog | null;
  logPast: (draft: PastHikeDraft) => HikeLog | null;
  discard: () => void;
}

/**
 * Local hike session. Points, pause, and running totals persist so a killed
 * app can resume the same hike.
 */
export function useTrailTracker(): UseTrailTrackerResult {
  const upsertLog = useTrailCache((s) => s.upsertLog);
  const [session, setSession] = useState<PersistedHike | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    void hydrateHike().then((hike) => {
      if (!alive) return;
      setSession(hike);
      if (hike) setRecovered(true);
    });
    return subscribeHike((hike) => {
      if (alive) setSession(hike);
    });
  }, []);

  const tick = useCallback(() => {
    setNow(Date.now());
  }, []);

  const dismissRecovery = useCallback(() => {
    setRecovered(false);
  }, []);

  const start = useCallback((trailId: string) => {
    void startHike(trailId);
  }, []);

  const pause = useCallback(() => {
    void pauseHike().then(() => stopTracking());
  }, []);

  const resume = useCallback(() => {
    void resumeHike();
  }, []);

  const setNotes = useCallback((notes: string) => {
    void updateHike((hike) => ({ ...hike, notes }));
  }, []);

  const addPhoto = useCallback((uri: string) => {
    void updateHike((hike) => ({ ...hike, photos: [...hike.photos, uri] }));
  }, []);

  const replacePhoto = useCallback((from: string, to: string) => {
    void updateHike((hike) => ({
      ...hike,
      photos: hike.photos.map((uri) => (uri === from ? to : uri)),
    }));
    const logs = useTrailCache.getState().logs.map((log) =>
      log.photos.includes(from)
        ? { ...log, photos: log.photos.map((uri) => (uri === from ? to : uri)) }
        : log,
    );
    if (logs.some((log, i) => log !== useTrailCache.getState().logs[i])) {
      useTrailCache.setState({ logs });
      const updated = logs.find((log) => log.photos.includes(to));
      if (updated) void pushLog(updated);
    }
  }, []);

  const logPast = useCallback(
    (draft: PastHikeDraft): HikeLog | null => {
      const log = buildPastHikeLog(draft);
      if (!log) return null;
      upsertLog(log);
      return log;
    },
    [upsertLog],
  );

  const discard = useCallback(() => {
    void clearHike();
    void stopTracking();
  }, []);

  const complete = useCallback((): HikeLog | null => {
    const hike = currentHike();
    if (!hike) return null;
    const duration = Math.max(1, elapsedSeconds(hike));
    const log: HikeLog = {
      id: newId(),
      user_id: MOCK_USER_ID,
      trail_id: hike.trailId,
      duration_seconds: duration,
      photos: hike.photos,
      notes: hike.notes.trim() || null,
      recorded_path:
        hike.points.length >= 2
          ? {
              type: 'LineString',
              coordinates: hike.points.map((point) =>
                point.altitude == null
                  ? [point.longitude, point.latitude]
                  : [point.longitude, point.latitude, point.altitude],
              ) as GeoJSONLineString['coordinates'],
            }
          : null,
      created_at: new Date().toISOString(),
    };
    upsertLog(log);
    void pushLog(log);
    void clearHike();
    void stopTracking();
    return log;
  }, [upsertLog]);

  const elapsed = session ? elapsedSeconds(session, now) : 0;
  const phase = recordingPhase(session);

  return useMemo(
    () => ({
      session,
      elapsedSeconds: elapsed,
      isTracking: phase !== 'idle',
      isPaused: phase === 'paused',
      phase,
      start,
      pause,
      resume,
      setNotes,
      addPhoto,
      replacePhoto,
      distanceM: session?.distanceM ?? 0,
      elevationGainM: session?.elevationGainM ?? 0,
      elevationLossM: session?.elevationLossM ?? 0,
      currentElevationM: session?.smoothedAltitude ?? null,
      totalSeconds: session ? totalSeconds(session.startedAt, now) : 0,
      paceLabel: formatPace(
        session ? paceSecondsPerKm(session.distanceM, elapsed) : null,
      ),
      savedAt: session?.savedAt ?? null,
      recovered,
      dismissRecovery,
      tick,
      complete,
      logPast,
      discard,
    }),
    [
      session,
      elapsed,
      phase,
      recovered,
      dismissRecovery,
      start,
      pause,
      resume,
      setNotes,
      addPhoto,
      replacePhoto,
      tick,
      complete,
      logPast,
      discard,
    ],
  );
}
