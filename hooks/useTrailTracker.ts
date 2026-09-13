import { useCallback, useMemo, useRef, useState } from 'react';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { useTrailCache } from '@/stores/trailCache';
import type { HikeLog } from '@/types/trail';

export interface ActiveSession {
  trailId: string;
  startedAt: number;
  notes: string;
  photos: string[];
}

export interface UseTrailTrackerResult {
  session: ActiveSession | null;
  elapsedSeconds: number;
  isTracking: boolean;
  start: (trailId: string) => void;
  setNotes: (notes: string) => void;
  addPhoto: (uri: string) => void;
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
    setSession({ trailId, startedAt, notes: '', photos: [] });
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
      id: `log-${Date.now()}`,
      user_id: MOCK_USER_ID,
      trail_id: session.trailId,
      duration_seconds: duration,
      photos: session.photos,
      notes: session.notes.trim() || null,
      recorded_path: null,
      created_at: new Date().toISOString(),
    };
    upsertLog(log);
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
      tick,
      complete,
      discard,
    ],
  );
}
