import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { MOCK_TRAILS } from '@/data/mockTrails';
import { CATALOG_TRAILS } from '@/lib/catalog';

jest.mock('react-native-gesture-handler', () => {
  require('react-native-gesture-handler/jestSetup');
  return jest.requireActual('react-native-gesture-handler');
});

const mockPush = jest.fn();
let mockId = '';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// Skia has no jest runtime; the full map is not under test here.
jest.mock('@/components/trail/TrailMap', () => ({ TrailMap: () => null }));
jest.mock('@/components/trail/ElevationSparkline', () => ({ ElevationSparkline: () => null }));

const mockTrails = [...CATALOG_TRAILS, ...MOCK_TRAILS];
jest.mock('@/stores/trailCache', () => {
  const state = () => ({
    trails: mockTrails,
    logs: [],
    getTrail: (id: string) => mockTrails.find((t) => t.id === id),
  });
  return { useTrailCache: (select: (s: unknown) => unknown) => select(state()) };
});

let mockTracking = false;
jest.mock('@/hooks/useTrailTracker', () => ({
  useTrailTracker: () => ({ isTracking: mockTracking, hydrated: true }),
}));

import TrailDetailScreen from '@/app/trail/[id]';

const ANGELS = '63cfe6e0-2d47-4a81-b087-a146d1fd9a4f';

function render(id: string): ReactTestRenderer {
  mockId = id;
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<TrailDetailScreen />);
  });
  return tree;
}

const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map((n) => {
    const kids = n.props.children;
    return Array.isArray(kids) ? kids.join('') : String(kids ?? '');
  });

const slider = (t: ReactTestRenderer) =>
  t.root.findAll((n) => n.props.accessibilityLabel === 'Start this hike' && typeof n.type === 'string');

beforeEach(() => {
  mockPush.mockClear();
  mockTracking = false;
});

describe('Trail detail', () => {
  it('shows a catalog trail’s flags as chips and its route sentence', () => {
    const all = texts(render(ANGELS));
    expect(all).toEqual(expect.arrayContaining(['Permit required', 'Chains section', 'Unranked']));
    expect(all.some((s) => s.startsWith('From The Grotto up the sandy West Rim Trail'))).toBe(true);
    expect(all).toEqual(expect.arrayContaining(['Zion, UT · Out and back']));
  });

  it('renders a trail with no profile without a scrubber', () => {
    const t = render('trail-unmapped');
    expect(texts(t)).toEqual(expect.arrayContaining(['Unmapped Spur']));
    expect(t.root.findAll((n) => n.props.accessibilityRole === 'adjustable')).toHaveLength(0);
  });

  it('starts this hike on Log when the slider activates', () => {
    const t = render(ANGELS);
    const [node] = slider(t);
    act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    expect(mockPush).toHaveBeenCalledWith(`/log?start=${ANGELS}`);
  });

  it('hides the slider while a hike is recording', () => {
    mockTracking = true;
    expect(slider(render(ANGELS))).toHaveLength(0);
  });
});
