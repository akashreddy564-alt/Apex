import { useCallback, useMemo, useRef, useState } from 'react';

import { applyElo, DEFAULT_ELO } from '@/lib/elo';
import { newId } from '@/lib/geo';
import { pushAllRankings, pushComparison } from '@/lib/remoteSync';
import { useComparisonStore } from '@/stores/comparisonStore';
import { MOCK_USER_ID } from '@/data/mockTrails';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type {
  ComparisonChoice,
  ComparisonRound,
  LeaderboardEntry,
  PairwiseComparison,
  Trail,
  TrailRanking,
} from '@/types/trail';

export interface ComparisonSessionResult {
  insertedTrailId: string;
  leaderboard: LeaderboardEntry[];
  ordinalRank: number;
}

export interface UseTrailComparisonResult {
  isActive: boolean;
  round: ComparisonRound | null;
  isComplete: boolean;
  result: ComparisonSessionResult | null;
  start: (challengerTrailId: string, contextLogId?: string | null) => void;
  choose: (choice: ComparisonChoice) => void;
  reset: () => void;
}

/**
 * Binary-insertion ranking via pairwise comparisons, with Elo updates.
 * Opponent list is snapshotted at session start so mid-search Elo churn
 * does not invalidate binary-search indices.
 */
export function useTrailComparison(): UseTrailComparisonResult {
  const trails = useTrailCache((s) => s.trails);
  const ensureRanking = useRankingStore((s) => s.ensureRanking);
  const upsertRanking = useRankingStore((s) => s.upsertRanking);

  const opponentsRef = useRef<Trail[]>([]);
  const contextLogIdRef = useRef<string | null>(null);
  const [challengerId, setChallengerId] = useState<string | null>(null);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<ComparisonSessionResult | null>(null);
  const [tick, setTick] = useState(0);

  const challenger = useMemo(
    () => trails.find((t) => t.id === challengerId) ?? null,
    [trails, challengerId],
  );

  const finalize = useCallback(
    (trailId: string, insertAt: number) => {
      const ranking = ensureRanking(trailId);
      const neighbors = useRankingStore
        .getState()
        .rankings.filter((r) => r.trail_id !== trailId)
        .sort((a, b) => b.rank_score - a.rank_score);

      let nextScore = ranking.rank_score;
      if (neighbors.length === 0) {
        nextScore = DEFAULT_ELO;
      } else if (insertAt <= 0) {
        nextScore = neighbors[0].rank_score + 16;
      } else if (insertAt >= neighbors.length) {
        nextScore = neighbors[neighbors.length - 1].rank_score - 16;
      } else {
        const above = neighbors[insertAt - 1].rank_score;
        const below = neighbors[insertAt].rank_score;
        nextScore = (above + below) / 2;
      }

      const updated: TrailRanking = {
        ...ranking,
        rank_score: nextScore,
        updated_at: new Date().toISOString(),
      };
      upsertRanking(updated);

      const allTrails = useTrailCache.getState().trails;
      const leaderboard: LeaderboardEntry[] = useRankingStore
        .getState()
        .rankings.filter((r) => allTrails.some((t) => t.id === r.trail_id))
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, 10)
        .map((r) => ({
          trail: allTrails.find((t) => t.id === r.trail_id)!,
          ranking: r,
          isNew: r.trail_id === trailId,
        }));

      const ordinal =
        leaderboard.find((e) => e.trail.id === trailId)?.ranking.ordinal_rank ??
        insertAt + 1;

      setIsComplete(true);
      setResult({
        insertedTrailId: trailId,
        leaderboard,
        ordinalRank: ordinal,
      });
      void pushAllRankings();
    },
    [ensureRanking, upsertRanking],
  );

  const start = useCallback(
    (challengerTrailId: string, contextLogId?: string | null) => {
      contextLogIdRef.current = contextLogId ?? null;
      ensureRanking(challengerTrailId);

      const ranked = useRankingStore
        .getState()
        .rankings.filter((r) => r.trail_id !== challengerTrailId)
        .sort((a, b) => b.rank_score - a.rank_score);

      const snapshot = ranked
        .map((r) => useTrailCache.getState().trails.find((t) => t.id === r.trail_id))
        .filter((t): t is Trail => Boolean(t));

      opponentsRef.current = snapshot;
      setChallengerId(challengerTrailId);
      setIsComplete(false);
      setResult(null);
      setLow(0);
      setHigh(snapshot.length - 1);
      setTick((n) => n + 1);

      if (snapshot.length === 0) {
        finalize(challengerTrailId, 0);
      }
    },
    [ensureRanking, finalize],
  );

  const round: ComparisonRound | null = useMemo(() => {
    void tick;
    if (!challenger || isComplete || high < low) return null;
    const mid = Math.floor((low + high) / 2);
    const opponent = opponentsRef.current[mid];
    if (!opponent) return null;
    return { challenger, opponent, low, high };
  }, [challenger, high, isComplete, low, tick]);

  const choose = useCallback(
    (choice: ComparisonChoice) => {
      if (!challenger || !round) return;

      const mid = Math.floor((low + high) / 2);
      const opponent = opponentsRef.current[mid];
      if (!opponent) return;

      const challengerRank = ensureRanking(challenger.id);
      const opponentRank = ensureRanking(opponent.id);
      const challengerWins = choice === 'challenger';

      const { winnerElo, loserElo } = applyElo(
        challengerWins ? challengerRank.elo_rating : opponentRank.elo_rating,
        challengerWins ? opponentRank.elo_rating : challengerRank.elo_rating,
      );

      const now = new Date().toISOString();
      const record: PairwiseComparison = {
        id: newId(),
        user_id: MOCK_USER_ID,
        winner_trail_id: challengerWins ? challenger.id : opponent.id,
        loser_trail_id: challengerWins ? opponent.id : challenger.id,
        context_log_id: contextLogIdRef.current,
        created_at: now,
      };
      useComparisonStore.getState().add(record);
      void pushComparison(record);

      upsertRanking({
        ...challengerRank,
        elo_rating: challengerWins ? winnerElo : loserElo,
        rank_score: challengerWins ? winnerElo : loserElo,
        comparison_count: challengerRank.comparison_count + 1,
        updated_at: now,
      });
      upsertRanking({
        ...opponentRank,
        elo_rating: challengerWins ? loserElo : winnerElo,
        rank_score: challengerWins ? loserElo : winnerElo,
        comparison_count: opponentRank.comparison_count + 1,
        updated_at: now,
      });

      let nextLow = low;
      let nextHigh = high;
      if (challengerWins) {
        nextHigh = mid - 1;
      } else {
        nextLow = mid + 1;
      }

      setLow(nextLow);
      setHigh(nextHigh);

      if (nextLow > nextHigh) {
        finalize(challenger.id, nextLow);
      } else {
        void pushAllRankings();
      }
    },
    [challenger, ensureRanking, finalize, high, low, round, upsertRanking],
  );

  const reset = useCallback(() => {
    opponentsRef.current = [];
    contextLogIdRef.current = null;
    setChallengerId(null);
    setLow(0);
    setHigh(-1);
    setIsComplete(false);
    setResult(null);
  }, []);

  return {
    isActive: challengerId !== null && !isComplete,
    round,
    isComplete,
    result,
    start,
    choose,
    reset,
  };
}
