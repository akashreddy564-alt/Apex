import { useCallback, useMemo, useRef, useState } from 'react';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { haversineMeters, newId } from '@/lib/geo';
import { pushLog } from '@/lib/remoteSync';
import { useTrailCache } from '@/stores/trailCache';
import type { HikeLog } from '@/types/trail';

export interface TrackPoint {
  longitude: number;
  latitude: number;
  altitude: number | null;
  timestamp: number;
}

export interface ActiveSession {
  trailId: string;
  startedAt: number;
  notes: string;
  photos: string[];
  points: TrackPoint[];
}

export interface UseTrailTrackerResult {
  session: ActiveSession | null;
  elapsedSeconds: number;
  isTracking: boolean;
  start: (trailId: string) => void;
  setNotes: (notes: string) => void;
  addPhoto: (uri: string) => void;
  replacePhoto: (from: string, to: string) => void;
  addPoint: (point: TrackPoint) => void;
  distanceM: number;
  elevationGainM: number;
  tick: () => void;
  complete: () => HikeLog | null;
  discard: () => void;
}

/**
 * Local hike session tracker. Persists completion into the offline trail cache.
 */
export function useTrailTracker(): UseTrailTrackerResult {
  const upsertLog = useTrailCache((s) => s.upsertLog);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const start = useCallback((trailId: string) => {
    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    setElapsedSeconds(0);
    setSession({ trailId, startedAt, notes: '', photos: [], points: [] });
  }, []);

  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setSession((prev) => (prev ? { ...prev, notes } : prev));
  }, []);

  const addPhoto = useCallback((uri: string) => {
    setSession((prev) =>
      prev ? { ...prev, photos: [...prev.photos, uri] } : prev,
    );
  }, []);

  const addPoint = useCallback((point: TrackPoint) => {
    setSession((prev) => {
      if (!prev) return prev;
      const last = prev.points[prev.points.length - 1];
      if (last && last.timestamp === point.timestamp) return prev;
      return { ...prev, points: [...prev.points, point] };
    });
  }, []);

  const distanceM = useMemo(() => {
    const points = session?.points ?? [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += haversineMeters(points[i - 1], points[i]);
    }
    return total;
  }, [session?.points]);

  const elevationGainM = useMemo(() => {
    const points = session?.points ?? [];
    let gain = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].altitude;
      const next = points[i].altitude;
      if (prev == null || next == null) continue;
      const delta = next - prev;
      if (delta > 0.5) gain += delta;
    }
    return gain;
  }, [session?.points]);

  const replacePhoto = useCallback((from: string, to: string) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            photos: prev.photos.map((uri) => (uri === from ? to : uri)),
          }
        : prev,
    );
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

  const discard = useCallback(() => {
    startedAtRef.current = null;
    setSession(null);
    setElapsedSeconds(0);
  }, []);

  const complete = useCallback((): HikeLog | null => {
    if (!session || !startedAtRef.current) return null;
    const duration = Math.max(
      1,
      Math.floor((Date.now() - startedAtRef.current) / 1000),
    );
    const log: HikeLog = {
      id: newId(),
      user_id: MOCK_USER_ID,
      trail_id: session.trailId,
      duration_seconds: duration,
      photos: session.photos,
      notes: session.notes.trim() || null,
      recorded_path:
        session.points.length >= 2
          ? {
              type: 'LineString',
              coordinates: session.points.map(
                (point) => [point.longitude, point.latitude] as [number, number],
              ),
            }
          : null,
      created_at: new Date().toISOString(),
    };
    upsertLog(log);
    void pushLog(log);
    discard();
    return log;
  }, [discard, session, upsertLog]);

  return useMemo(
    () => ({
      session,
      elapsedSeconds,
      isTracking: session !== null,
      start,
      setNotes,
      addPhoto,
      replacePhoto,
      addPoint,
      distanceM,
      elevationGainM,
      tick,
      complete,
      discard,
    }),
    [
      session,
      elapsedSeconds,
      start,
      setNotes,
      addPhoto,
      replacePhoto,
      addPoint,
      distanceM,
      elevationGainM,
      tick,
      complete,
      discard,
    ],
  );
}
