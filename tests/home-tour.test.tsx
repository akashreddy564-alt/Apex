import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create } from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* eslint-disable import/first */
import { TOUR_SEEN_KEY, useHomeTour } from '@/hooks/useHomeTour';
import { useTrailCache } from '@/stores/trailCache';
/* eslint-enable import/first */

function Probe({ ready, out }: { ready: boolean; out: { current: ReturnType<typeof useHomeTour> | null } }) {
  out.current = useHomeTour(ready);
  return null;
}

async function mount(ready: boolean) {
  const out: { current: ReturnType<typeof useHomeTour> | null } = { current: null };
  await act(async () => {
    create(<Probe ready={ready} out={out} />);
  });
  return out;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useTrailCache.setState({ logs: [] });
});

it('waits for the opening to finish, then shows once', async () => {
  expect((await mount(false)).current?.show).toBe(false);
  const out = await mount(true);
  expect(out.current?.show).toBe(true);
  await act(async () => out.current?.done());
  expect(out.current?.show).toBe(false);
  expect(await AsyncStorage.getItem(TOUR_SEEN_KEY)).toBe('1');
  expect((await mount(true)).current?.show).toBe(false);
});

it('skips the tour for someone who already has hikes', async () => {
  useTrailCache.setState({ logs: [{ id: 'l1' } as never] });
  expect((await mount(true)).current?.show).toBe(false);
});
