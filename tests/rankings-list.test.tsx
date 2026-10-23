import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { RankingsList } from '@/components/ranking/RankingsList';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type { Bucket } from '@/lib/ranking';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () => ({ ChevronRight: () => null }));

function ranking(trailId: string, bucket: Bucket, position: string) {
  return {
    id: `r-${trailId}`,
    user_id: 'me',
    trail_id: trailId,
    hike_type: 'hike',
    bucket,
    position,
    score: 0,
    comparison_count: 0,
    updated_at: '',
  };
}

it('groups trails by bucket and hides the number in a one-hike bucket', () => {
  const trails = useTrailCache.getState().trails.slice(0, 4);
  act(() => {
    useRankingStore.getState().setRankings([
      ranking(trails[0]!.id, 'loved', 'a0'),
      ranking(trails[1]!.id, 'loved', 'a1'),
      ranking(trails[2]!.id, 'loved', 'a2'),
      ranking(trails[3]!.id, 'fine', 'a0'),
    ]);
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <QueryClientProvider client={new QueryClient()}>
        <RankingsList onOpenTrail={() => {}} />
      </QueryClientProvider>,
    );
  });
  const shown = tree.root.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
  expect(shown.some((t) => t.startsWith('Loved'))).toBe(true);
  expect(shown.filter((t) => /^\d+\.\d$/.test(t))).toHaveLength(3);
  // The single Fine hike shows the word, not a score.
  expect(shown.filter((t) => t === 'Fine').length).toBeGreaterThanOrEqual(1);
  expect(shown.some((t) => /^[4-6]\.\d$/.test(t))).toBe(false);
});
