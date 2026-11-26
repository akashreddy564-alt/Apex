import { act, create } from 'react-test-renderer';

import { startPlan } from '@/lib/pendingStartPlan';
import { PENDING_START_MAX_AGE_MS, usePendingStart } from '@/stores/pendingStart';

const known = new Set(['t1']);

describe('startPlan', () => {
  it('starts a known trail once hydrated and idle', () => {
    expect(startPlan({ pending: 't1', knownIds: known, hydrated: true, tracking: false })).toEqual({ start: 't1' });
  });
  it('does nothing before hydration, while tracking, for an unknown id, or with nothing pending', () => {
    expect(startPlan({ pending: 't1', knownIds: known, hydrated: false, tracking: false }).start).toBeNull();
    expect(startPlan({ pending: 't1', knownIds: known, hydrated: true, tracking: true }).start).toBeNull();
    expect(startPlan({ pending: 'nope', knownIds: known, hydrated: true, tracking: false }).start).toBeNull();
    expect(startPlan({ pending: null, knownIds: known, hydrated: true, tracking: false }).start).toBeNull();
  });
});

describe('usePendingStart', () => {
  afterEach(() => jest.useRealTimers());

  it('hands the request over once', () => {
    usePendingStart.getState().request('t1');
    expect(usePendingStart.getState().take()).toBe('t1');
    expect(usePendingStart.getState().take()).toBeNull();
  });

  it('drops a request older than 10 s, and clears it', () => {
    jest.useFakeTimers();
    usePendingStart.getState().request('t1');
    jest.advanceTimersByTime(PENDING_START_MAX_AGE_MS + 1);
    expect(usePendingStart.getState().take()).toBeNull();
    expect(usePendingStart.getState().pending).toBeNull();
  });
});

// The Log screen wiring.
const mockStart = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};
const mockNavigation = { setOptions: jest.fn(), setParams: mockSetParams };
const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useLocalSearchParams: () => mockParams,
    useNavigation: () => mockNavigation,
    useRouter: () => mockRouter,
    useIsFocused: () => true,
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockLocation = { message: null };
jest.mock('@/hooks/useLiveLocation', () => ({ useLiveLocation: () => mockLocation }));
jest.mock('@/hooks/useProfile', () => ({ useMyProfile: () => ({ profile: null }) }));
jest.mock('@/components/log/RecordSession', () => ({ RecordSession: () => null }));
jest.mock('@/components/ranking/RankingsList', () => ({ RankingsList: () => null }));
jest.mock('@/components/ranking/PairwiseModal', () => ({ PairwiseModal: () => null }));
jest.mock('@/components/log/PastHikeSheet', () => ({ PastHikeSheet: () => null }));
jest.mock('@/components/log/TrailAssignSheet', () => ({ TrailAssignSheet: () => null }));
jest.mock('@/components/log/LogHeader', () => ({ LogHeader: () => null }));
const base = {
  isPaused: false,
  hydrated: true,
  start: mockStart,
  tick: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  dismissRecovery: jest.fn(),
  elapsedSeconds: 0,
  totalSeconds: 0,
  distanceM: 0,
  elevationGainM: 0,
  elevationLossM: 0,
  currentElevationM: null,
  savedAt: null,
};
const mockIdle = { ...base, isTracking: false, session: null };
const mockBusy = { ...base, isTracking: true, session: { trailId: 'other', points: [] } };
let mockTracker: typeof mockIdle | typeof mockBusy = mockIdle;
jest.mock('@/hooks/useTrailTracker', () => ({ useTrailTracker: () => mockTracker }));

import LogScreen from '@/app/(tabs)/log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTrailCache } from '@/stores/trailCache';

const ANGELS = '63cfe6e0-2d47-4a81-b087-a146d1fd9a4f';

async function mount() {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<LogScreen />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  act(() => tree.unmount());
}

describe('Log start hand-off', () => {
  beforeAll(async () => {
    // Explainer already accepted, so a start goes straight to the tracker.
    await AsyncStorage.setItem('apex-location-explainer-accepted', '1');
    expect(useTrailCache.getState().getTrail(ANGELS)).toBeTruthy();
  });
  beforeEach(() => {
    mockStart.mockClear();
    mockParams = {};
    mockTracker = mockIdle;
    usePendingStart.setState({ pending: null });
  });

  it('ignores a start URL param', async () => {
    mockParams = { start: ANGELS };
    await mount();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('starts a pending request once', async () => {
    usePendingStart.getState().request(ANGELS);
    await mount();
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith(ANGELS);
    await mount();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale request', async () => {
    usePendingStart.setState({ pending: { trailId: ANGELS, at: Date.now() - PENDING_START_MAX_AGE_MS - 1 } });
    await mount();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('ignores an unknown trail id', async () => {
    usePendingStart.getState().request('not-a-trail');
    await mount();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('while tracking, does not start and clears the request', async () => {
    mockTracker = mockBusy;
    usePendingStart.getState().request(ANGELS);
    await mount();
    expect(mockStart).not.toHaveBeenCalled();
    expect(usePendingStart.getState().pending).toBeNull();
  });
});

describe('Log slider', () => {
  beforeAll(async () => {
    await AsyncStorage.setItem('apex-location-explainer-accepted', '1');
  });
  beforeEach(() => {
    mockStart.mockClear();
    mockParams = {};
    mockTracker = mockIdle;
    usePendingStart.setState({ pending: null });
  });

  it('starts a freeform hike from the slide, with no trail picked', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LogScreen />);
    });
    const slider = tree.root.find(
      (n) => n.props.accessibilityLabel === 'Start a hike' && typeof n.type === 'string',
    );
    await act(async () => {
      slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockStart).toHaveBeenCalledWith('');
    act(() => tree.unmount());
  });

  it('hides the slider until a restored session has loaded', async () => {
    mockTracker = { ...mockIdle, hydrated: false };
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LogScreen />);
    });
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Start a hike')).toHaveLength(0);
    act(() => tree.unmount());
  });
});
