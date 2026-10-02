import { useCallback, useMemo, useRef, useState } from 'react';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { newId } from '@/lib/geo';
import { pushComparison, pushRankings } from '@/lib/remoteSync';
import {
  answer,
  bandScore,
  currentProbe,
  DEFAULT_HIKE_TYPE,
  expectedComparisons,
  positionForInsert,
  rankingsToSync,
  sortByPosition,
  startSession,
  undo as undoSession,
  type Bucket,
  type PlacementAnswer,
  type PlacementSession,
} from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type {
  ComparisonChoice,
  ComparisonRound,
  LeaderboardEntry,
  PairwiseComparison,
  TrailRanking,
} from '@/types/trail';

export interface ComparisonSessionResult {
  insertedTrailId: string;
  bucket: Bucket;
  leaderboard: LeaderboardEntry[];
  ordinalRank: number;
  score: number;
  /** Full bucket size. The visible leaderboard may be shorter. */
  count: number;
}

export interface UseTrailComparisonResult {
  phase: 'idle' | 'bucket' | 'compare' | 'preview';
  bucket: Bucket | null;
  round: ComparisonRound | null;
  preview: ComparisonSessionResult | null;
  progress: { step: number; estimate: number } | null;
  canUndo: boolean;
  start: (challengerTrailId: string, contextLogId?: string | null) => void;
  pickBucket: (bucket: Bucket) => void;
  choose: (choice: ComparisonChoice) => void;
  undo: () => void;
  /** Persist the single ranking row and the session's comparisons. */
  place: () => void;
  reset: () => void;
}

const CHOICE_TO_ANSWER: Record<ComparisonChoice, PlacementAnswer> = {
  challenger: 'new',
  opponent: 'opponent',
  too_close: 'too_close',
  skip: 'skip',
};

interface FrozenOpponent {
  id: string;
  position: string;
}

/**
 * Bucket, then binary insert over a snapshot frozen at session start.
 * The store is unchanged until `place`.
 */
export function useTrailComparison(): UseTrailComparisonResult {
  const trails = useTrailCache((s) => s.trails);
  const placeRanking = useRankingStore((s) => s.place);

  const orderRef = useRef<FrozenOpponent[]>([]);
  const sessionRef = useRef<PlacementSession | null>(null);
  const pendingRef = useRef<PairwiseComparison[]>([]);
  const placedRef = useRef(false);
  const contextLogIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [trailId, setTrailId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [phase, setPhase] = useState<UseTrailComparisonResult['phase']>('idle');
  const [preview, setPreview] = useState<ComparisonSessionResult | null>(null);
  const [tick, setTick] = useState(0);

  const challenger = useMemo(
    () => trails.find((trail) => trail.id === trailId) ?? null,
    [trails, trailId],
  );

  const buildPreview = useCallback(
    (session: PlacementSession, selected: Bucket): ComparisonSessionResult | null => {
      if (!trailId || session.done == null) return null;
      const insertAt = session.done;
      const ids = orderRef.current.map((row) => row.id);
      ids.splice(insertAt, 0, trailId);
      const allTrails = useTrailCache.getState().trails;
      const shown: LeaderboardEntry[] = [];
      ids.forEach((id, index) => {
        const trail = allTrails.find((item) => item.id === id);
        if (!trail) return;
        const existing = orderRef.current.find((row) => row.id === id);
        const score = bandScore(selected, index, ids.length);
        const ranking: TrailRanking = {
          id: `rank-${id}`,
          user_id: MOCK_USER_ID,
          trail_id: id,
          hike_type: DEFAULT_HIKE_TYPE,
          bucket: selected,
          position: existing?.position ?? '',
          comparison_count: existing ? 0 : pendingRef.current.length,
          updated_at: '',
          score,
        };
        shown.push({
          trail,
          ranking,
          score,
          ordinal: index + 1,
          isNew: id === trailId,
        });
      });

      const visible =
        shown.length <= 10
          ? shown
          : shown.filter((entry, index) => index < 9 || entry.isNew).slice(0, 10);
      const placed = shown.find((entry) => entry.isNew);

      return {
        insertedTrailId: trailId,
        bucket: selected,
        leaderboard: visible,
        ordinalRank: placed?.ordinal ?? insertAt + 1,
        score: placed?.score ?? bandScore(selected, insertAt, ids.length),
        count: ids.length,
      };
    },
    [trailId],
  );

  const start = useCallback((challengerTrailId: string, contextLogId?: string | null) => {
    orderRef.current = [];
    sessionRef.current = null;
    pendingRef.current = [];
    placedRef.current = false;
    contextLogIdRef.current = contextLogId ?? null;
    sessionIdRef.current = newId();
    setTrailId(challengerTrailId);
    setBucket(null);
    setPreview(null);
    setPhase('bucket');
    setTick((value) => value + 1);
  }, []);

  const pickBucket = useCallback(
    (selected: Bucket) => {
      if (!trailId) return;
      const snapshot = sortByPosition(
        useRankingStore
          .getState()
          .rankings.filter(
            (row) =>
              row.bucket === selected &&
              row.hike_type === DEFAULT_HIKE_TYPE &&
              row.trail_id !== trailId,
          ),
      );
      orderRef.current = snapshot.map((row) => ({
        id: row.trail_id,
        position: row.position,
      }));
      pendingRef.current = [];
      const session = startSession(orderRef.current.map((row) => row.id));
      sessionRef.current = session;
      setBucket(selected);
      if (session.done != null) {
        setPreview(buildPreview(session, selected));
        setPhase('preview');
      } else {
        setPreview(null);
        setPhase('compare');
      }
      setTick((value) => value + 1);
    },
    [buildPreview, trailId],
  );

  const choose = useCallback(
    (choice: ComparisonChoice) => {
      const session = sessionRef.current;
      if (!session || !bucket || !trailId || session.done != null) return;
      const probe = currentProbe(session);
      const opponentId = session.order[probe];
      const next = answer(session, CHOICE_TO_ANSWER[choice]);
      sessionRef.current = next;
      if (opponentId && sessionIdRef.current) {
        pendingRef.current = [
          ...pendingRef.current,
          {
            id: newId(),
            user_id: MOCK_USER_ID,
            session_id: sessionIdRef.current,
            hike_type: DEFAULT_HIKE_TYPE,
            challenger_trail_id: trailId,
            opponent_trail_id: opponentId,
            result: CHOICE_TO_ANSWER[choice],
            context_log_id: contextLogIdRef.current,
            created_at: new Date().toISOString(),
          },
        ];
      }
      if (next.done != null) {
        setPreview(buildPreview(next, bucket));
        setPhase('preview');
      }
      setTick((value) => value + 1);
    },
    [bucket, buildPreview, trailId],
  );

  const undo = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.history.length === 0) {
      sessionRef.current = null;
      pendingRef.current = [];
      setPreview(null);
      setBucket(null);
      setPhase('bucket');
      setTick((value) => value + 1);
      return;
    }
    const next = undoSession(session);
    sessionRef.current = next;
    pendingRef.current = pendingRef.current.slice(0, -1);
    if (next.done != null && bucket) {
      setPreview(buildPreview(next, bucket));
      setPhase('preview');
    } else {
      setPreview(null);
      setPhase('compare');
    }
    setTick((value) => value + 1);
  }, [bucket, buildPreview]);

  const place = useCallback(() => {
    const session = sessionRef.current;
    if (placedRef.current || !trailId || !bucket || session?.done == null) return;
    placedRef.current = true;
    const existing = useRankingStore.getState().getRanking(trailId, DEFAULT_HIKE_TYPE);
    const ranking: TrailRanking = {
      id: existing?.id ?? newId(),
      user_id: MOCK_USER_ID,
      trail_id: trailId,
      hike_type: DEFAULT_HIKE_TYPE,
      bucket,
      position: positionForInsert(
        orderRef.current.map((row) => row.position),
        session.done,
      ),
      comparison_count: (existing?.comparison_count ?? 0) + pendingRef.current.length,
      updated_at: new Date().toISOString(),
      score: 0,
    };
    const comparisons = pendingRef.current;
    const before = useRankingStore.getState().rankings;
    placeRanking(ranking, comparisons);
    const after = useRankingStore.getState().rankings;
    void pushRankings(rankingsToSync(before, after));
    for (const comparison of comparisons) void pushComparison(comparison);
  }, [bucket, placeRanking, trailId]);

  const reset = useCallback(() => {
    orderRef.current = [];
    sessionRef.current = null;
    pendingRef.current = [];
    placedRef.current = false;
    contextLogIdRef.current = null;
    sessionIdRef.current = null;
    setTrailId(null);
    setBucket(null);
    setPreview(null);
    setPhase('idle');
  }, []);

  const round: ComparisonRound | null = useMemo(() => {
    void tick;
    const session = sessionRef.current;
    if (!challenger || phase !== 'compare' || !session || session.done != null) return null;
    const probe = currentProbe(session);
    const opponent = trails.find((trail) => trail.id === session.order[probe]);
    if (!opponent) return null;
    return { challenger, opponent, low: session.low, high: session.high };
  }, [challenger, phase, tick, trails]);

  const progress = useMemo(() => {
    void tick;
    const session = sessionRef.current;
    if (phase !== 'compare' || !session) return null;
    return {
      step: session.history.length + 1,
      estimate: expectedComparisons(session.order.length),
    };
  }, [phase, tick]);

  const canUndo = phase === 'compare' || phase === 'preview';

  return {
    phase,
    bucket,
    round,
    preview,
    progress,
    canUndo,
    start,
    pickBucket,
    choose,
    undo,
    place,
    reset,
  };
}
