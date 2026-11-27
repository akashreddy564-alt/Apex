import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockPush = jest.fn();
let mockKey = '';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ key: mockKey }),
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, []);
  },
  Stack: { Screen: () => null },
}));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: { user: { id: 'me' } } }) }));
let mockJoined = new Set<string>();
const mockMutate = jest.fn();
let mockRows: unknown[] = [];
jest.mock('@/hooks/useChallenges', () => ({
  useMyChallenges: () => ({ joined: mockJoined, signedIn: true, loading: false }),
  useChallengeToggle: () => ({ mutate: mockMutate, isPending: false, variables: undefined, error: null }),
  useChallengeBoard: () => ({ rows: mockRows, loading: false, error: null, refetch: jest.fn() }),
}));

/* eslint-disable import/first */
import { ChallengesCard } from '@/components/home/ChallengesCard';
import { monthChallenges } from '@/lib/challenges';
import { useTrailCache } from '@/stores/trailCache';
/* eslint-enable import/first */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChallengeScreen = require('@/app/challenge/[key]').default as () => JSX.Element;

const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map((n) => [n.props.children].flat(Infinity).join('')).join(' | ');
const draw = (el: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree;
};
const path = { type: 'LineString', coordinates: [] };

beforeEach(() => {
  mockPush.mockReset();
  mockMutate.mockReset();
  mockJoined = new Set();
  mockRows = [];
  useTrailCache.setState({
    logs: [
      { id: 'l1', user_id: 'me', trail_id: 't1', duration_seconds: 3600, photos: [], notes: null, recorded_path: path as never, created_at: new Date().toISOString(), elevation_gain_m: 1000, distance_km: 16.09344 },
    ],
  });
});

describe('challenges', () => {
  it('shows this month’s three challenges with your recorded progress', () => {
    const [climb] = monthChallenges();
    const tree = draw(<ChallengesCard />);
    // Folded by default: one row. Tap it to show the three challenges.
    expect(texts(tree)).not.toContain(climb!.title);
    const fold = tree.root.findAll((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel ?? '').includes('challenges,'))[0]!;
    act(() => fold.props.onPress());
    const all = texts(tree);
    expect(all).toContain(`${climb!.month.toUpperCase()} CHALLENGES`);
    expect(all).toContain(climb!.title);
    expect(all).toContain('3,281 / 10,000 ft');
    expect(all).toContain('10.0 / 50 mi');
    expect(all).toContain('1 / 8 hikes');
    const row = tree.root.findAll((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel ?? '').startsWith(climb!.title))[0]!;
    act(() => row.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/challenge/[key]', params: { key: climb!.key } });
  });

  it('joins from the challenge page', () => {
    const [climb] = monthChallenges();
    mockKey = climb!.key;
    const tree = draw(<ChallengeScreen />);
    expect(texts(tree)).toContain(climb!.title);
    const join = tree.root.findAll((n) => typeof n.props.onPress === 'function' && texts({ root: n } as unknown as ReactTestRenderer).includes('Join challenge'))[0]!;
    act(() => join.props.onPress());
    expect(mockMutate).toHaveBeenCalledWith({ key: climb!.key, join: true });
  });

  it('once joined, lists friends in the challenge by place', () => {
    const [, distance] = monthChallenges();
    mockKey = distance!.key;
    mockJoined = new Set([distance!.key]);
    mockRows = [
      { userId: 'u2', username: 'maya', displayName: 'Maya Chen', amount: 40, hikes: 4, place: 1, isMe: false },
      { userId: 'me', username: 'akash', displayName: 'Akash', amount: 16.1, hikes: 1, place: 2, isMe: true },
    ];
    const all = texts(draw(<ChallengeScreen />));
    expect(all).toContain('Friends in this challenge');
    expect(all).toContain('Maya Chen');
    expect(all).toContain('24.9 mi');
    expect(all).toContain('You');
    expect(all).not.toContain('Join challenge');
  });

  it('says so when no friends have joined', () => {
    const [, , hikes] = monthChallenges();
    mockKey = hikes!.key;
    mockJoined = new Set([hikes!.key]);
    mockRows = [{ userId: 'me', username: 'akash', displayName: 'Akash', amount: 1, hikes: 1, place: 1, isMe: true }];
    expect(texts(draw(<ChallengeScreen />))).toContain('No friends have joined yet');
  });
});
