/**
 * Classic Elo helpers used by pairwise trail ranking.
 */

export const DEFAULT_ELO = 1000;
export const ELO_K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloPairResult {
  winnerElo: number;
  loserElo: number;
}

export function applyElo(
  winnerElo: number,
  loserElo: number,
  k: number = ELO_K,
): EloPairResult {
  const expWinner = expectedScore(winnerElo, loserElo);
  const expLoser = expectedScore(loserElo, winnerElo);
  return {
    winnerElo: winnerElo + k * (1 - expWinner),
    loserElo: loserElo + k * (0 - expLoser),
  };
}
