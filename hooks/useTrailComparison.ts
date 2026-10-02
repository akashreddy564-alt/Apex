import { useCallback, useMemo, useRef, useState } from 'react';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { nextBounds, placeByChoices, type FrozenOpponent } from '@/lib/binaryInsert';
import { DEFAULT_ELO } from '@/lib/elo';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type {
  ComparisonChoice,
  ComparisonRound,
  LeaderboardEntry,
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
  start: (challengerTrailId: string) => void;
  choose: (choice: ComparisonChoice) => void;
  reset: () => void;
}

interface SessionOpponent extends FrozenOpponent {
  trail: Trail;
}

/**
 * Binary-insertion ranking. The opponent list and its rank scores are frozen
 * at session start. Choices only move the search. Elo and the ordinal slot
 * are written once, when the search finishes, so the landing index matches
 * the trails the user compared.
 */
export function useTrailComparison(): UseTrailComparisonResult {
  const trails = useTrailCache((s) => s.trails);
  const setRankings = useRankingStore((s) => s.setRankings);

  const opponentsRef = useRef<SessionOpponent[]>([]);
  const choicesRef = useRef<ComparisonChoice[]>([]);
  const challengerEloRef = useRef(DEFAULT_ELO);
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
    (trailId: string, choices: readonly ComparisonChoice[]) => {
      const snapshot = opponentsRef.current;
      const placed = placeByChoices(
        snapshot.map((opponent) => ({
          id: opponent.id,
          elo: opponent.elo,
          rankScore: opponent.rankScore,
        })),
        challengerEloRef.current,
        choices,
      );

      const now = new Date().toISOString();
      const state = useRankingStore.getState();
      const existing = state.getRanking(trailId);
      const played = new Map<string, number>();
      for (const game of placed.games) {
        played.set(game.opponentId, (played.get(game.opponentId) ?? 0) + 1);
      }

      const next: TrailRanking[] = state.rankings
        .filter((ranking) => ranking.trail_id !== trailId)
        .map((ranking) => {
          const gamesPlayed = played.get(ranking.trail_id) ?? 0;
          const nextElo = placed.opponentElo[ranking.trail_id];
          if (gamesPlayed === 0 || nextElo == null) return ranking;
          return {
            ...ranking,
            elo_rating: nextElo,
            comparison_count: ranking.comparison_count + gamesPlayed,
            updated_at: now,
          };
        });

      next.push({
        id: existing?.id ?? `rank-${trailId}`,
        user_id: existing?.user_id ?? MOCK_USER_ID,
        trail_id: trailId,
        elo_rating: placed.elo,
        rank_score: placed.rankScore,
        ordinal_rank: null,
        comparison_count: (existing?.comparison_count ?? 0) + placed.games.length,
        updated_at: now,
      });
      setRankings(next);

      const allTrails = useTrailCache.getState().trails;
      const stored = useRankingStore.getState().getRanking(trailId);
      const leaderboard: LeaderboardEntry[] = useRankingStore
        .getState()
        .rankings.filter((ranking) => allTrails.some((trail) => trail.id === ranking.trail_id))
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, 10)
        .map((ranking) => ({
          trail: allTrails.find((trail) => trail.id === ranking.trail_id)!,
          ranking,
          isNew: ranking.trail_id === trailId,
        }));

      setIsComplete(true);
      setResult({
        insertedTrailId: trailId,
        leaderboard,
        ordinalRank: stored?.ordinal_rank ?? placed.insertAt + 1,
      });
    },
    [setRankings],
  );

  const start = useCallback(
    (challengerTrailId: string) => {
      const state = useRankingStore.getState();
      const existing = state.getRanking(challengerTrailId);
      challengerEloRef.current = existing?.elo_rating ?? DEFAULT_ELO;

      const ranked = state.rankings
        .filter((ranking) => ranking.trail_id !== challengerTrailId)
        .sort((a, b) => b.rank_score - a.rank_score);

      const snapshot = ranked.flatMap((ranking) => {
        const trail = useTrailCache.getState().trails.find((item) => item.id === ranking.trail_id);
        if (!trail) return [];
        return [
          {
            trail,
            id: ranking.trail_id,
            elo: ranking.elo_rating,
            rankScore: ranking.rank_score,
          },
        ];
      });

      opponentsRef.current = snapshot;
      choicesRef.current = [];
      setChallengerId(challengerTrailId);
      setIsComplete(false);
      setResult(null);
      setLow(0);
      setHigh(snapshot.length - 1);
      setTick((n) => n + 1);

      if (snapshot.length === 0) {
        finalize(challengerTrailId, []);
      }
    },
    [finalize],
  );

  const round: ComparisonRound | null = useMemo(() => {
    void tick;
    if (!challenger || isComplete || high < low) return null;
    const mid = Math.floor((low + high) / 2);
    const opponent = opponentsRef.current[mid];
    if (!opponent) return null;
    return { challenger, opponent: opponent.trail, low, high };
  }, [challenger, high, isComplete, low, tick]);

  const choose = useCallback(
    (choice: ComparisonChoice) => {
      if (!challenger || !round || high < low) return;

      const step = nextBounds(low, high, choice);
      const choices = [...choicesRef.current, choice];
      choicesRef.current = choices;
      setLow(step.low);
      setHigh(step.high);

      if (step.done) {
        finalize(challenger.id, choices);
      }
    },
    [challenger, finalize, high, low, round],
  );

  const reset = useCallback(() => {
    opponentsRef.current = [];
    choicesRef.current = [];
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
