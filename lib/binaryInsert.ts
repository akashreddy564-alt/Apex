import { applyElo, DEFAULT_ELO } from './elo';

export type ComparisonSide = 'challenger' | 'opponent';

/** Opponent row frozen when a ranking session starts. */
export interface FrozenOpponent {
  id: string;
  elo: number;
  rankScore: number;
}

export interface PlayedGame {
  opponentId: string;
  challengerWins: boolean;
}

export interface Placement {
  /** Index in the frozen opponent list, best-first. */
  insertAt: number;
  /** Ordinal key. Taken from frozen rank scores, never from Elo. */
  rankScore: number;
  /** Challenger Elo after every recorded game is replayed once. */
  elo: number;
  /** Where `rankScore` sits among the frozen opponent scores. */
  sortedIndex: number;
  games: PlayedGame[];
  /** Opponent Elo after the same replay. Rank scores are not included. */
  opponentElo: Record<string, number>;
}

export function nextBounds(
  low: number,
  high: number,
  choice: ComparisonSide,
): { low: number; high: number; mid: number; done: boolean; insertAt: number } {
  const mid = Math.floor((low + high) / 2);
  const nextLow = choice === 'challenger' ? low : mid + 1;
  const nextHigh = choice === 'challenger' ? mid - 1 : high;
  return {
    low: nextLow,
    high: nextHigh,
    mid,
    done: nextLow > nextHigh,
    insertAt: nextLow,
  };
}

/** Insertion index for a scripted sequence of pairwise winners. */
export function binaryInsertIndex(count: number, choices: readonly ComparisonSide[]): number {
  let low = 0;
  let high = count - 1;
  let insertAt = 0;
  for (const choice of choices) {
    if (low > high) break;
    const step = nextBounds(low, high, choice);
    low = step.low;
    high = step.high;
    insertAt = step.insertAt;
    if (step.done) break;
  }
  return insertAt;
}

/**
 * Rank score that sorts to `insertAt` while every opponent score stays put.
 * Empty list uses `emptyScore`. Ends sit 16 points outside the edge.
 */
export function placementRankScore(
  rankScoresDesc: readonly number[],
  insertAt: number,
  emptyScore: number = DEFAULT_ELO,
): number {
  if (rankScoresDesc.length === 0) return emptyScore;
  if (insertAt <= 0) return rankScoresDesc[0] + 16;
  if (insertAt >= rankScoresDesc.length) {
    return rankScoresDesc[rankScoresDesc.length - 1] - 16;
  }
  return (rankScoresDesc[insertAt - 1] + rankScoresDesc[insertAt]) / 2;
}

/** Index `score` would take in a descending list. Ties land on the first equal. */
export function indexAmongDescending(rankScoresDesc: readonly number[], score: number): number {
  let index = 0;
  for (const existing of rankScoresDesc) {
    if (existing > score) index += 1;
    else break;
  }
  return index;
}

/**
 * Binary-insert over the opponent list exactly as it was at session start,
 * then replay Elo once in game order. Opponent rank scores are not modified,
 * so the slot stays next to the trails the user actually compared.
 */
export function placeByChoices(
  opponents: readonly FrozenOpponent[],
  challengerElo: number,
  choices: readonly ComparisonSide[],
  emptyScore: number = DEFAULT_ELO,
): Placement {
  let low = 0;
  let high = opponents.length - 1;
  let insertAt = 0;
  let elo = challengerElo;
  const games: PlayedGame[] = [];
  const opponentElo: Record<string, number> = {};
  for (const opponent of opponents) opponentElo[opponent.id] = opponent.elo;

  for (const choice of choices) {
    if (low > high) break;
    const step = nextBounds(low, high, choice);
    const opponent = opponents[step.mid];
    if (opponent) {
      const challengerWins = choice === 'challenger';
      const current = opponentElo[opponent.id] ?? opponent.elo;
      const result = challengerWins ? applyElo(elo, current) : applyElo(current, elo);
      if (challengerWins) {
        elo = result.winnerElo;
        opponentElo[opponent.id] = result.loserElo;
      } else {
        opponentElo[opponent.id] = result.winnerElo;
        elo = result.loserElo;
      }
      games.push({ opponentId: opponent.id, challengerWins });
    }
    low = step.low;
    high = step.high;
    insertAt = step.insertAt;
    if (step.done) break;
  }

  const rankScores = opponents.map((opponent) => opponent.rankScore);
  const rankScore = placementRankScore(rankScores, insertAt, emptyScore);
  return {
    insertAt,
    rankScore,
    elo,
    sortedIndex: indexAmongDescending(rankScores, rankScore),
    games,
    opponentElo,
  };
}
