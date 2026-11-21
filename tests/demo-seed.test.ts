jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// eslint-disable-next-line import/first
import { useRankingStore } from '@/stores/rankingStore';
// eslint-disable-next-line import/first
import { useTrailCache } from '@/stores/trailCache';

describe('demo seed on a fresh install', () => {
  it('keeps every trail the seeded rankings point at', async () => {
    await useTrailCache.persist.rehydrate();
    const ids = new Set(useTrailCache.getState().trails.map((t) => t.id));
    const ranked = useRankingStore.getState().rankings.map((r) => r.trail_id);
    expect(ranked.length).toBeGreaterThan(0);
    for (const id of ranked) expect(ids.has(id)).toBe(true);
  });
});
