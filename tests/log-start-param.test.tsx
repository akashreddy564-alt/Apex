import { act, create } from 'react-test-renderer';

import { startLinkPlan } from '@/lib/startLink';

describe('startLinkPlan', () => {
  it('waits for the saved hike to load before acting', () => {
    expect(startLinkPlan({ param: 't1', hydrated: false, tracking: false })).toEqual({ start: null, clear: false });
  });

  it('starts the trail once hydrated and idle, and clears the param', () => {
    expect(startLinkPlan({ param: 't1', hydrated: true, tracking: false })).toEqual({ start: 't1', clear: true });
  });

  it('only clears the param while a hike is already recording', () => {
    expect(startLinkPlan({ param: 't1', hydrated: true, tracking: true })).toEqual({ start: null, clear: true });
  });

  it('ignores a missing param', () => {
    expect(startLinkPlan({ param: undefined, hydrated: true, tracking: false })).toEqual({ start: null, clear: false });
  });
});

// The Log screen wiring: an already-recording hike is never started twice.
const mockStart = jest.fn();
const mockSetParams = jest.fn();
const mockParams = { start: 'trail-1' };
const mockNavigation = { setOptions: jest.fn(), setParams: mockSetParams };
const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useNavigation: () => mockNavigation,
  useRouter: () => mockRouter,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockLocation = { message: null };
jest.mock('@/hooks/useLiveLocation', () => ({ useLiveLocation: () => mockLocation }));
jest.mock('@/components/log/RecordSession', () => ({ RecordSession: () => null }));
jest.mock('@/components/ranking/RankingsList', () => ({ RankingsList: () => null }));
jest.mock('@/components/ranking/PairwiseModal', () => ({ PairwiseModal: () => null }));
jest.mock('@/components/log/PastHikeSheet', () => ({ PastHikeSheet: () => null }));
jest.mock('@/components/log/TrailAssignSheet', () => ({ TrailAssignSheet: () => null }));
jest.mock('@/components/log/LogHeader', () => ({ LogHeader: () => null }));
const mockTracker = {
    isTracking: true,
    isPaused: false,
    hydrated: true,
    session: { trailId: 'other', points: [] },
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
jest.mock('@/hooks/useTrailTracker', () => ({ useTrailTracker: () => mockTracker }));

import LogScreen from '@/app/(tabs)/log';

describe('Log ?start=', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockSetParams.mockClear();
  });

  it('while a hike is recording, clears the param without starting another', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<LogScreen />);
    });
    act(() => tree.unmount());
    expect(mockSetParams).toHaveBeenCalledWith({ start: undefined });
    expect(mockStart).not.toHaveBeenCalled();
  });
});
