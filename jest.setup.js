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
