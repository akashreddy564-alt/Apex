import AsyncStorage from '@react-native-async-storage/async-storage';

import { HERO_STATE_KEY, loadHeroState, saveHeroState } from '@/lib/heroState';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const EMPTY = { bag: [], lastId: null };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

test('round-trips a saved bag and last place', async () => {
  await saveHeroState({ bag: ['b', 'c'], lastId: 'a' });
  await expect(loadHeroState()).resolves.toEqual({ bag: ['b', 'c'], lastId: 'a' });
});

test('starts fresh when nothing is saved', async () => {
  await expect(loadHeroState()).resolves.toEqual(EMPTY);
});

test('starts fresh when the saved value is not JSON', async () => {
  await AsyncStorage.setItem(HERO_STATE_KEY, '{not json');
  await expect(loadHeroState()).resolves.toEqual(EMPTY);
});

test('starts fresh when the saved value has the wrong shape', async () => {
  await AsyncStorage.setItem(HERO_STATE_KEY, JSON.stringify({ bag: [1, 2], lastId: 3 }));
  await expect(loadHeroState()).resolves.toEqual(EMPTY);
});

test('starts fresh when storage throws on read', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
  await expect(loadHeroState()).resolves.toEqual(EMPTY);
});

test('ignores a storage error on save', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
  await expect(saveHeroState({ bag: [], lastId: 'a' })).resolves.toBeUndefined();
});
