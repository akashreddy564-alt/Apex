jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// eslint-disable-next-line import/first
import { CATALOG_TRAILS } from '@/lib/catalog';
// eslint-disable-next-line import/first
import { useRankingStore } from '@/stores/rankingStore';
// eslint-disable-next-line import/first
import { useTrailCache } from '@/stores/trailCache';
// eslint-disable-next-line import/first
import type { Trail } from '@/types/trail';

describe('a fresh install', () => {
  it('starts with no hikes, no rankings and only the bundled catalog', async () => {
    await useTrailCache.persist.rehydrate();
    expect(useTrailCache.getState().logs).toEqual([]);
    expect(useRankingStore.getState().rankings).toEqual([]);
    const ids = useTrailCache.getState().trails.map((t) => t.id).sort();
    expect(ids).toEqual(CATALOG_TRAILS.map((t) => t.id).sort());
  });
});

describe('rememberTrails', () => {
  const server = (id: string, name: string): Trail => ({
    ...CATALOG_TRAILS[0],
    id,
    name,
    region: 'Cumming, GA',
  });

  it('adds catalog trails from the server without moving the list around', () => {
    const before = useTrailCache.getState().trails.map((t) => t.id);
    useTrailCache.getState().rememberTrails([server('11111111-1111-4111-8111-111111111111', 'Indian Seats Trail')]);
    const after = useTrailCache.getState().trails.map((t) => t.id);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after[after.length - 1]).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('updates a trail it already has instead of adding it twice', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    useTrailCache.getState().rememberTrails([server(id, 'Indian Seats Trail (updated)')]);
    const matches = useTrailCache.getState().trails.filter((t) => t.id === id);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('Indian Seats Trail (updated)');
  });
});

describe('difficulty on a ranking', () => {
  const base = {
    id: 'r1',
    user_id: 'me',
    trail_id: 't1',
    hike_type: 'hike',
    bucket: 'loved' as const,
    position: 'a0',
    comparison_count: 1,
    score: 9,
    updated_at: '2026-11-25T00:00:00Z',
  };

  it('setDifficulty stores 1-5 on the ranked trail and returns the row', () => {
    useRankingStore.setState({ rankings: [base], comparisons: [] });
    const row = useRankingStore.getState().setDifficulty('t1', 4);
    expect(row?.difficulty).toBe(4);
    expect(useRankingStore.getState().rankings[0].difficulty).toBe(4);
  });

  it('re-ranking a trail keeps the difficulty you gave before', () => {
    useRankingStore.setState({ rankings: [{ ...base, difficulty: 3 }], comparisons: [] });
    useRankingStore.getState().place({ ...base, position: 'a1', score: 8 }, []);
    expect(useRankingStore.getState().rankings[0].difficulty).toBe(3);
  });

  it('a ranking that brings its own difficulty replaces the old one', () => {
    useRankingStore.setState({ rankings: [{ ...base, difficulty: 3 }], comparisons: [] });
    useRankingStore.getState().place({ ...base, difficulty: 5 }, []);
    expect(useRankingStore.getState().rankings[0].difficulty).toBe(5);
  });
});
