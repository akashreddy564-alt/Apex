import { act, create } from 'react-test-renderer';

import { useTrailComparison, type UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';

jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
const mockPushRankings = jest.fn(async () => undefined);
jest.mock('@/lib/remoteSync', () => ({
  ...jest.requireActual('@/lib/remoteSync'),
  pushRankings: (rows: unknown) => mockPushRankings(rows),
  pushComparison: jest.fn(async () => undefined),
  pushPost: jest.fn(async () => undefined),
}));

let comparison!: UseTrailComparisonResult;
function Harness() {
  comparison = useTrailComparison();
  return null;
}

beforeEach(() => {
  mockPushRankings.mockClear();
  useRankingStore.setState({ rankings: [], comparisons: [] });
});

function rankFirstTrail(difficulty?: number | null) {
  const [trail] = useTrailCache.getState().trails;
  act(() => {
    create(<Harness />);
  });
  act(() => comparison.start(trail!.id));
  act(() => comparison.pickBucket('loved'));
  act(() => comparison.place(difficulty));
  return trail!.id;
}

it('saves the difficulty in the same ranking save (one request, no race)', () => {
  const id = rankFirstTrail(4);
  const row = useRankingStore.getState().rankings.find((r) => r.trail_id === id);
  expect(row?.difficulty).toBe(4);
  expect(mockPushRankings).toHaveBeenCalledTimes(1);
  const sent = mockPushRankings.mock.calls[0]![0] as { trail_id: string; difficulty?: number }[];
  expect(sent.find((r) => r.trail_id === id)?.difficulty).toBe(4);
});

it('without a new rating, keeps the one you gave before (never sends it as empty)', () => {
  const [trail] = useTrailCache.getState().trails;
  useRankingStore.setState({
    rankings: [
      { id: 'r1', user_id: 'me', trail_id: trail!.id, hike_type: 'hike', bucket: 'fine', position: 'a0', comparison_count: 1, score: 5, updated_at: '', difficulty: 3 },
    ],
    comparisons: [],
  });
  rankFirstTrail();
  const sent = mockPushRankings.mock.calls[0]![0] as { trail_id: string; difficulty?: number }[];
  expect(sent.find((r) => r.trail_id === trail!.id)?.difficulty).toBe(3);
});
