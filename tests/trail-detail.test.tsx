import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { MOCK_TRAILS } from '@/data/mockTrails';
import { CATALOG_TRAILS } from '@/lib/catalog';

jest.mock('react-native-gesture-handler', () => {
  require('react-native-gesture-handler/jestSetup');
  return jest.requireActual('react-native-gesture-handler');
});

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockId = '';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useRouter: () => ({ push: mockPush, dismissTo: mockDismissTo }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// Skia has no jest runtime; the full map is not under test here.
jest.mock('@/components/trail/TrailMap', () => ({ TrailMap: () => null }));

const mockTrails = [...CATALOG_TRAILS, ...MOCK_TRAILS];
let mockLogs: unknown[] = [];
jest.mock('@/stores/trailCache', () => {
  const state = () => ({
    trails: mockTrails,
    logs: mockLogs,
    getTrail: (id: string) => mockTrails.find((t) => t.id === id),
  });
  return { useTrailCache: (select: (s: unknown) => unknown) => select(state()) };
});

let mockTracking = false;
let mockHydrated = true;
jest.mock('@/hooks/useTrailTracker', () => ({
  useTrailTracker: () => ({ isTracking: mockTracking, hydrated: mockHydrated }),
}));

import TrailDetailScreen from '@/app/trail/[id]';
import { usePendingStart } from '@/stores/pendingStart';

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
  mockDismissTo.mockClear();
  mockTracking = false;
  mockHydrated = true;
  mockLogs = [];
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

  it('leaves an in-app start request and opens Log, with no URL param', () => {
    const t = render(ANGELS);
    const [node] = slider(t);
    act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    // Pops back to the tabs under Trail detail rather than pushing a second tab navigator.
    expect(mockDismissTo).toHaveBeenCalledWith('/log');
    expect(mockPush).not.toHaveBeenCalled();
    expect(usePendingStart.getState().take()).toBe(ANGELS);
  });

  it('holds the slider back until the saved hike has been read', () => {
    mockHydrated = false;
    expect(slider(render(ANGELS))).toHaveLength(0);
    mockHydrated = true;
    expect(slider(render(ANGELS)).length).toBeGreaterThan(0);
  });

  it('keeps each difficulty reason reachable by screen readers', () => {
    const t = render(ANGELS);
    const reasons = t.root.findAllByType(Text).filter((n) => {
      const kids = n.props.children;
      return typeof kids === 'string' && /^(of climbing|feet of climb per mile|at the summit)/.test(kids);
    });
    expect(reasons).toHaveLength(3);
    for (const node of reasons) {
      // No ancestor merges it into one labelled element.
      for (let p = node.parent; p; p = p.parent) {
        expect(Boolean(p.props.accessible && p.props.accessibilityLabel)).toBe(false);
      }
    }
    // The bar alone carries the rating.
    const bar = t.root.find((n) => n.props.accessibilityRole === 'progressbar' && typeof n.type === 'string');
    expect(bar.props.accessibilityLabel).toBe('Difficulty: Moderately strenuous');
  });

  it('shows difficulty once: the card, not TrailStats', () => {
    const all = texts(render(ANGELS));
    expect(all.filter((s) => s.endsWith(' on the NPS Shenandoah scale'))).toHaveLength(1);
    expect(all).not.toContain('DIFFICULTY');
    expect(all.some((s) => s.startsWith('NPS Shenandoah rating'))).toBe(false);
  });

  it('hides the slider while a hike is recording', () => {
    mockTracking = true;
    expect(slider(render(ANGELS))).toHaveLength(0);
  });

  it('offers the flyover of your last recorded hike on that trail', () => {
    expect(texts(render(ANGELS))).not.toContain('Play flyover');
    mockLogs = [
      {
        id: 'log-1',
        user_id: 'u',
        trail_id: ANGELS,
        duration_seconds: 3600,
        photos: [],
        notes: null,
        created_at: '2026-11-20T10:00:00Z',
        recorded_path: { type: 'LineString', coordinates: [[-112.95, 37.26], [-112.94, 37.27]] },
      },
    ];
    const tree = render(ANGELS);
    expect(texts(tree)).toContain('Play flyover');
    const button = tree.root.find((n) => n.props.accessibilityLabel === 'Play the flyover of your last hike here' && typeof n.props.onPress === 'function');
    act(() => button.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/flyover/[logId]', params: { logId: 'log-1' } });
  });
});
