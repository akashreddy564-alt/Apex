interface RevealRanking {
  elo_rating: number;
  rank_score: number;
}

/** Rating printed on the reveal row. This is Elo, not the placement rank score. */
export function displayedElo(ranking: { elo_rating: number }): number {
  return ranking.elo_rating;
}

/**
 * Reveal order follows Elo. Placement rank_score can put a new trail above
 * an opponent whose Elo is higher; ordering the rows that way makes #1 show
 * a lower Elo than #2.
 */
export function orderRevealEntries<T extends { ranking: RevealRanking }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => {
    const byElo = b.ranking.elo_rating - a.ranking.elo_rating;
    if (byElo !== 0) return byElo;
    return b.ranking.rank_score - a.ranking.rank_score;
  });
}
