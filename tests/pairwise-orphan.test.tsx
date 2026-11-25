import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { LOADER_TIMEOUT_MS, PairwiseModal } from '@/components/ranking/PairwiseModal';
import { useTrailComparison, type UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';

jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function ranking(trailId: string, position: string) {
  return {
    id: `r-${trailId}`,
    user_id: 'me',
    trail_id: trailId,
    hike_type: 'hike',
    bucket: 'loved' as const,
    position,
    score: 0,
    comparison_count: 0,
    updated_at: '',
  };
}

let comparison!: UseTrailComparisonResult;
let closed = 0;

function Harness() {
  comparison = useTrailComparison();
  return <PairwiseModal visible comparison={comparison} onClose={() => (closed += 1)} />;
}

function texts(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
}

beforeEach(() => {
  jest.useFakeTimers();
  closed = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

it('never shows the loader when a bucket holds an orphan ranking beside a real one', () => {
  const [challenger, real] = useTrailCache.getState().trails;
  expect(challenger && real).toBeTruthy();
  // The orphan sorts first, so the binary search would probe it before the real trail.
  act(() => {
    useRankingStore
      .getState()
      .setRankings([ranking('orphan-trail-not-cached', 'a0'), ranking(real!.id, 'a1')]);
  });

  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness />);
  });
  act(() => comparison.start(challenger!.id));
  act(() => comparison.pickBucket('loved'));

  expect(texts(tree)).not.toContain('Preparing comparison');
  expect(texts(tree)).toContain('Which hike was better?');
  expect(comparison.round?.opponent.id).toBe(real!.id);
});

it('places directly when every ranking in the bucket is an orphan', () => {
  const [challenger] = useTrailCache.getState().trails;
  act(() => {
    useRankingStore
      .getState()
      .setRankings([ranking('orphan-a', 'a0'), ranking('orphan-b', 'a1')]);
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness />);
  });
  act(() => comparison.start(challenger!.id));
  act(() => comparison.pickBucket('loved'));

  expect(comparison.phase).toBe('preview');
  expect(texts(tree)).not.toContain('Preparing comparison');
});

it('closes a lingering loader with Cancel or after the fallback', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness />);
  });
  // A compare phase with no buildable round: the state that used to hang.
  const stuck = (): UseTrailComparisonResult => ({
    ...comparison,
    phase: 'compare',
    round: null,
    preview: null,
  });
  act(() => {
    tree.update(<PairwiseModal visible comparison={stuck()} onClose={() => (closed += 1)} />);
  });
  expect(texts(tree)).toContain('Preparing comparison');
  const cancel = tree.root.findAll(
    (n) => n.props.accessibilityLabel === 'Cancel' && typeof n.props.onPress === 'function',
  )[0]!;
  act(() => cancel.props.onPress());
  expect(closed).toBe(1);

  act(() => {
    tree.update(<PairwiseModal visible={false} comparison={stuck()} onClose={() => (closed += 1)} />);
  });
  act(() => {
    tree.update(<PairwiseModal visible comparison={stuck()} onClose={() => (closed += 1)} />);
  });
  act(() => {
    jest.advanceTimersByTime(LOADER_TIMEOUT_MS + 10);
  });
  expect(closed).toBe(2);
});
