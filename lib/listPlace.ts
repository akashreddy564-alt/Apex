/**
 * Where a trail sits on someone's list. List order is score, then position,
 * then trail id: the same as `overallByScore` and the SQL in migration 028.
 */

interface ListRow {
  trail_id: string;
  score: number;
  position: string;
}

export interface Placement {
  rank: number;
  size: number;
  aboveTrailId: string | null;
  belowTrailId: string | null;
}

/** Best first: score, then position, then trail id. */
export function order<T extends ListRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.position !== b.position) return a.position < b.position ? -1 : 1;
    return a.trail_id < b.trail_id ? -1 : a.trail_id > b.trail_id ? 1 : 0;
  });
}

/** Rank (1 = best), list size and the trails just above and below. Null when the trail isn't on the list. */
export function listPlacement(rows: ListRow[], trailId: string): Placement | null {
  const sorted = order(rows);
  const index = sorted.findIndex((row) => row.trail_id === trailId);
  if (index < 0) return null;
  return {
    rank: index + 1,
    size: sorted.length,
    aboveTrailId: sorted[index - 1]?.trail_id ?? null,
    belowTrailId: sorted[index + 1]?.trail_id ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Your list as the server holds it: the standard hike type, on trails with a
 * server id. Use this for "#2 of 14" and "You: #5" so they match the list
 * friends see, whether or not this phone has the trail's name cached.
 */
export function serverListRows<T extends { trail_id: string; hike_type: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.hike_type === 'hike' && UUID.test(row.trail_id));
}

/** A post's neighbour trail isn't on the server (foreign-key failure); send it without neighbours. */
export function isMissingNeighbour(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23503';
}

/** "#2 of 14 · just above Angels Landing". Null for older posts that have no placement. */
export function placementLine(p: {
  listRank: number | null;
  listSize: number | null;
  aboveTrailName: string | null;
  belowTrailName: string | null;
  firstName: string;
  isMine: boolean;
}): string | null {
  if (p.listRank == null || p.listSize == null) return null;
  if (p.listSize === 1) return p.isMine ? 'First trail on your list' : `First trail on ${p.firstName}’s list`;
  const rank = `#${p.listRank} of ${p.listSize}`;
  if (p.belowTrailName) return `${rank} · just above ${p.belowTrailName}`;
  if (p.aboveTrailName) return `${rank} · just below ${p.aboveTrailName}`;
  return rank;
}

/** Your own rank for a trail, or null if you haven't ranked it. */
export function myRankOf(mine: { trailId: string; score: number; position?: string }[], trailId: string): number | null {
  return (
    listPlacement(
      mine.map((row) => ({ trail_id: row.trailId, score: row.score, position: row.position ?? '' })),
      trailId,
    )?.rank ?? null
  );
}
