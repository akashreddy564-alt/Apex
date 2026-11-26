// Every themed component reads the persisted settings store, which needs AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated needs its native worklets runtime; tests use its official mocks.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // The mock predates these; tests run as if Reduce Motion were on.
  return { ...mock, useReducedMotion: () => true };
});

// lucide-react-native ships ESM that jest can't parse, and the motion barrel imports it.
// Trade-off: a misspelled icon name will not fail in jest. Icons render nothing in tests; a test can still mock specific icons itself.
jest.mock('lucide-react-native', () => new Proxy({ __esModule: true }, { get: (t, k) => (k in t ? t[k] : () => null) }));

// Ranked lists, trail boards and taste match come from the server through TanStack Query.
// Screens that only show them get empty results; a test can mock '@/hooks/useRankLists' itself.
jest.mock('@/hooks/useRankLists', () => {
  const empty = (data) => () => ({ data, loading: false, error: null, refetch: jest.fn() });
  return {
    usePersonRankings: empty([]),
    useTrailBoard: empty([]),
    useTasteMatch: empty(null),
    useTastePicks: empty([]),
  };
});
