jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
let mockHasNative = true;
jest.mock('expo', () => ({ requireOptionalNativeModule: () => (mockHasNative ? {} : null) }));

const mockActivity = { update: jest.fn(async () => undefined), end: jest.fn(async () => undefined) };
const mockFactory = { start: jest.fn(() => mockActivity), getInstances: jest.fn((): unknown[] => []) };
jest.mock('@/widgets/HikeActivity', () => ({ __esModule: true, default: mockFactory }));

let mockListener: ((hike: unknown) => void) | null = null;
jest.mock('@/lib/activeHike', () => ({
  subscribeHike: (fn: (hike: unknown) => void) => {
    mockListener = fn;
    return () => {
      mockListener = null;
    };
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const hike = (extra: object = {}) => ({
  trailId: 't1', startedAt: Date.now() - 600_000, pausedAt: null, pausedMs: 0, distanceM: 1609.344, elevationGainM: 100, ...extra,
});

describe('hike live activity', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockHasNative = true;
    mockFactory.getInstances.mockReturnValue([]);
  });

  function load() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTrailCache } = require('@/stores/trailCache');
    useTrailCache.setState({ trails: [{ id: 't1', name: 'Raven Cliff Falls' }] });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/liveActivity') as typeof import('@/lib/liveActivity');
  }

  it('starts with the hike, pushes a pause at once, and ends when it’s saved', async () => {
    const { startLiveActivitySync } = load();
    await flush();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/stores/trailCache').useTrailCache.setState({ trails: [{ id: 't1', name: 'Raven Cliff Falls' }] });
    startLiveActivitySync(Promise.resolve(null));
    await flush();
    mockListener!(hike());
    await flush();
    expect(mockFactory.start).toHaveBeenCalledWith(
      expect.objectContaining({ trail: 'Raven Cliff Falls', miles: '1.00', climbFt: '328', paused: false }),
      'apex://log',
    );
    mockListener!(hike({ distanceM: 1700 }));
    await flush();
    expect(mockActivity.update).not.toHaveBeenCalled();
    mockListener!(hike({ pausedAt: Date.now() }));
    await flush();
    expect(mockActivity.update).toHaveBeenCalledWith(expect.objectContaining({ paused: true }));
    mockListener!(null);
    await flush();
    expect(mockActivity.end).toHaveBeenCalledWith('immediate');
  });

  it('picks up a running activity after a restart instead of starting another', async () => {
    mockFactory.getInstances.mockReturnValue([mockActivity]);
    const { startLiveActivitySync } = load();
    startLiveActivitySync(Promise.resolve(hike() as never));
    await flush();
    expect(mockFactory.start).not.toHaveBeenCalled();
    expect(mockActivity.update).toHaveBeenCalledWith(expect.objectContaining({ trail: 'Raven Cliff Falls' }));
  });

  it('does nothing on a build without the widget extension', async () => {
    mockHasNative = false;
    const { startLiveActivitySync } = load();
    startLiveActivitySync(Promise.resolve(null));
    mockListener!(hike());
    await flush();
    expect(mockFactory.start).not.toHaveBeenCalled();
  });
});
