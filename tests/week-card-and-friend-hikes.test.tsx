import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { WeekCard } from '@/components/social/WeekCard';
import { useTrailCache } from '@/stores/trailCache';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'u2' }),
  Stack: { Screen: () => null },
}));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), ImpactFeedbackStyle: {} }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///week.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock('@/components/social/SignInGate', () => ({
  SignInGate: ({ children }: { children: (p: unknown) => unknown }) =>
    children({ id: 'me', username: 'akash', display_name: 'Akash' }),
}));

let mockRelation = 'friend';
jest.mock('@/hooks/useFriends', () => ({
  usePerson: () => ({ person: { id: 'u2', username: 'maya', display_name: 'Maya Chen' }, friendCount: 4, loading: false, error: null }),
  useFriendships: () => ({ relationTo: () => mockRelation }),
}));
const mockPersonPosts = jest.fn();
jest.mock('@/hooks/useFeed', () => ({
  useLike: () => jest.fn(),
  usePersonPosts: (...args: unknown[]) => mockPersonPosts(...args),
}));
jest.mock('@/hooks/useMyRankedTrails', () => ({ useMyRankedTrails: () => [] }));
jest.mock('@/components/safety/useSafetyMenu', () => ({ useSafetyMenu: () => jest.fn() }));
jest.mock('@/components/social/RelationButton', () => ({ RelationButton: () => null }));
jest.mock('@/components/feed/PostCard', () => {
  const { Text: T } = jest.requireActual('react-native');
  return { PostCard: ({ post }: { post: { trailName: string } }) => <T>{`post:${post.trailName}`}</T> };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FriendScreen = require('@/app/friend/[id]').default as () => JSX.Element;

function texts(tree: ReactTestRenderer): string {
  return tree.root
    .findAll((n) => n.type === Text)
    .map((n) => [n.props.children].flat().join(''))
    .join(' | ');
}

describe('week card', () => {
  it('sums this week from the logs and offers to share', () => {
    const now = new Date();
    useTrailCache.setState({
      trails: [{ id: 't1', name: 'Mount Si', distance_km: 12, elevation_gain_m: 1000 } as never],
      logs: [{ id: 'l1', user_id: 'me', trail_id: 't1', duration_seconds: 3600, photos: [], notes: null, recorded_path: null, created_at: now.toISOString(), elevation_gain_m: 900 }],
    });
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<WeekCard name="Akash" />);
    });
    const all = texts(tree);
    expect(all).toContain('Your week in hiking');
    expect(all).toContain('climbed in 1 hike');
    expect(all).toContain('Mount Si');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Share your week').length).toBeGreaterThan(0);
  });

  it('calls an empty week a rest week and hides Share', () => {
    useTrailCache.setState({ logs: [] });
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<WeekCard name="Akash" />);
    });
    expect(texts(tree)).toContain('Rest week so far');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Share your week').length).toBe(0);
  });
});

describe('friend page', () => {
  beforeEach(() => {
    mockPersonPosts.mockReturnValue({
      posts: [{ id: 'p1', authorId: 'u2', trailName: 'Lake Serene', isMine: false }],
      loading: false, error: null, hasMore: false, loadingMore: false, loadMore: jest.fn(), refetch: jest.fn(),
    });
  });

  it('lists a friend’s hikes', () => {
    mockRelation = 'friend';
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FriendScreen />);
    });
    expect(texts(tree)).toContain('post:Lake Serene');
    expect(mockPersonPosts).toHaveBeenCalledWith('u2', true);
  });

  it('keeps a stranger’s hikes hidden', () => {
    mockRelation = 'none';
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FriendScreen />);
    });
    expect(texts(tree)).not.toContain('post:Lake Serene');
    expect(mockPersonPosts).toHaveBeenCalledWith('u2', false);
  });
});
