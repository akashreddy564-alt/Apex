import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let mockPeople: unknown[] = [];
jest.mock('@/hooks/useFollows', () => ({ useTrailPeopleRankings: () => ({ people: mockPeople, loading: false }) }));

/* eslint-disable import/first */
import { TrailRankings } from '@/components/trail/TrailRankings';
import { useRankingStore } from '@/stores/rankingStore';
/* eslint-enable import/first */

const draw = (el: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree;
};
const text = (t: ReactTestRenderer) =>
  t.root
    .findAllByType(Text)
    .map((n) => [n.props.children].flat(Infinity).join(''))
    .join(' | ');

const maya = { personId: 'maya', username: 'maya_test', displayName: 'Maya', bucket: 'loved', score: 9.4, difficulty: 4, isFriend: true };
const sam = { personId: 'sam', username: 'sam_test', displayName: null, bucket: 'fine', score: 6.1, difficulty: 4, isFriend: true };

beforeEach(() => {
  mockPeople = [];
  mockPush.mockReset();
  useRankingStore.setState({ rankings: [], comparisons: [] });
});

it('shows nothing when nobody has ranked the trail', () => {
  expect(draw(<TrailRankings trailId="t1" />).toJSON()).toBeNull();
});

it('lists friends and people you follow with bucket and difficulty, and the common rating', () => {
  mockPeople = [maya, sam];
  const t = draw(<TrailRankings trailId="t1" />);
  const shown = text(t);
  expect(shown).toContain('Most rate it Strenuous');
  expect(shown).toContain('Maya');
  expect(shown).toContain('  Friend');
  expect(shown).toContain('@sam_test');
  expect(shown).toContain('SA');
  expect(shown).toContain('Loved · Strenuous');
  const row = t.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel?.startsWith('Maya'))[0]!;
  act(() => row.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/friend/[id]', params: { id: 'maya' } });
});

it('puts your own ranking and rating first', () => {
  useRankingStore.setState({
    rankings: [
      { id: 'r', user_id: 'me', trail_id: 't1', hike_type: 'hike', bucket: 'loved', position: 'a0', comparison_count: 1, score: 9.84, updated_at: '', difficulty: 2 },
    ],
    comparisons: [],
  });
  mockPeople = [sam];
  const shown = text(draw(<TrailRankings trailId="t1" />));
  expect(shown.indexOf('You')).toBeLessThan(shown.indexOf('@sam_test'));
  expect(shown).toContain('Loved · Moderate');
  // Your own rating leads the line, even though sam rated it Strenuous.
  expect(shown).toContain('You rated it Moderate');
});
