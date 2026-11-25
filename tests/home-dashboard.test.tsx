import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));

const mockKnownPosition = jest.fn();
const mockCatalogNear = jest.fn();
const mockFetchCatalogTrails = jest.fn();
jest.mock('@/lib/catalogRemote', () => ({
  knownPosition: () => mockKnownPosition(),
  catalogNear: (...args: unknown[]) => mockCatalogNear(...args),
  fetchCatalogTrails: (...args: unknown[]) => mockFetchCatalogTrails(...args),
}));

jest.mock('@/hooks/useWeekendPick', () => ({ useWeekendPick: () => ({ pick: null, weather: null, skip: () => {} }) }));

/* eslint-disable import/first */
import { NearbyTrails } from '@/components/home/NearbyTrails';
import { SignInStrip, StartHikeCard } from '@/components/home/StartHikeCard';
import { TopTrails } from '@/components/home/TopTrails';
import { WeekHero } from '@/components/home/WeekHero';
import { CATALOG_TRAILS } from '@/lib/catalog';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
/* eslint-enable import/first */

function draw(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  return tree;
}

const text = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat(Infinity).join(''))
    .join(' | ');

const pressable = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0]!;

const ranking = (trail_id: string, score: number, position: string) => ({
  id: `r-${trail_id}`,
  user_id: 'me',
  trail_id,
  hike_type: 'hike',
  bucket: 'loved' as const,
  position,
  comparison_count: 2,
  score,
  updated_at: new Date().toISOString(),
});

beforeEach(() => {
  mockPush.mockReset();
  mockNavigate.mockReset();
  mockKnownPosition.mockReset().mockResolvedValue(null);
  mockCatalogNear.mockReset().mockResolvedValue([]);
  mockFetchCatalogTrails.mockReset().mockResolvedValue([]);
  useRankingStore.setState({ rankings: [], comparisons: [] });
  useTrailCache.setState({ logs: [] });
});

describe('a new user', () => {
  it('sees the week card at zero against the goal, and it opens the goal', () => {
    const tree = draw(<WeekHero />);
    expect(text(tree)).toContain('THIS WEEK');
    expect(text(tree)).toContain('Goal 3,000 ft');
    act(() => pressable(tree, 'This week').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/goal');
  });

  it('can start a hike from Home, which opens Log', () => {
    const tree = draw(<StartHikeCard />);
    expect(text(tree)).toContain('Start a hike');
    expect(text(tree)).toContain('Records your route, even locked');
    act(() => pressable(tree, 'Start a hike').props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/log');
  });

  it('sees three empty top-trail slots and an invitation to rank', () => {
    const tree = draw(<TopTrails />);
    const shown = text(tree);
    expect(shown).toContain('Your top trails');
    expect(shown).toContain('Rank your first hike and it lands here');
    for (const slot of ['#1', '#2', '#3']) expect(shown).toContain(slot);
  });

  it('gets a sign-in strip that opens sign-in', () => {
    const tree = draw(<SignInStrip />);
    expect(text(tree)).toContain("Sign in to see friends' hikes");
    act(() => pressable(tree, "Sign in to see friends' hikes").props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/account');
  });
});

describe('Your top trails', () => {
  it('shows the rankings there are, then empty slots for the rest', () => {
    const [a, b] = CATALOG_TRAILS;
    useRankingStore.setState({ rankings: [ranking(a.id, 9.84, 'a0'), ranking(b.id, 9.12, 'a1')] });
    const tree = draw(<TopTrails />);
    const shown = text(tree);
    expect(shown).toContain(a.name);
    expect(shown).toContain(b.name);
    expect(shown).toContain('#3');
    expect(shown).not.toContain('#1');
    expect(shown).toContain('All 2');
    act(() => pressable(tree, 'All 2 ranked trails').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/rankings');
  });

  it('fetches a ranked trail the phone has not seen yet', () => {
    const missing = '22222222-2222-4222-8222-222222222222';
    useRankingStore.setState({ rankings: [ranking(missing, 9.5, 'a0')] });
    const tree = draw(<TopTrails />);
    expect(text(tree)).toContain('Loading trail');
    expect(mockFetchCatalogTrails).toHaveBeenCalledWith([missing]);
  });
});

describe('Trails near you', () => {
  it('without location, never asks the server and shows bundled trails', async () => {
    const tree = draw(<NearbyTrails />);
    await act(async () => {});
    expect(mockCatalogNear).not.toHaveBeenCalled();
    expect(text(tree)).toContain('Trails near you');
    expect(text(tree)).toContain(CATALOG_TRAILS[0].name);
  });

  it('with location, asks for trails within 5 km', async () => {
    mockKnownPosition.mockResolvedValue([-84.14, 34.03]);
    draw(<NearbyTrails />);
    await act(async () => {});
    expect(mockCatalogNear).toHaveBeenCalledWith(-84.14, 34.03, 5000);
  });
});
