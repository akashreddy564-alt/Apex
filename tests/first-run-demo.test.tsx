import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));

/* eslint-disable import/first */
import { DEMO_SCENES, FirstRunDemo, SCENE_MS } from '@/components/opening/FirstRunDemo';
import { DEMO_SEEN_KEY, useFirstRunDemo } from '@/hooks/useFirstRunDemo';
import { useTrailCache } from '@/stores/trailCache';
/* eslint-enable import/first */

const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map((n) => [n.props.children].flat(Infinity).join('')).join(' | ');
const press = (t: ReactTestRenderer, label: string) => {
  const node = t.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').at(-1)!;
  act(() => node.props.onPress());
};

describe('first-run demo', () => {
  it('walks through the scenes and finishes on Start exploring', () => {
    const onDone = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FirstRunDemo onDone={onDone} />);
    });
    expect(texts(tree)).toContain(DEMO_SCENES[0]!.title);
    for (let i = 1; i < DEMO_SCENES.length; i += 1) {
      press(tree, 'Next');
      expect(texts(tree)).toContain(DEMO_SCENES[i]!.title);
    }
    press(tree, 'Previous');
    expect(texts(tree)).toContain(DEMO_SCENES[DEMO_SCENES.length - 2]!.title);
    press(tree, 'Next');
    press(tree, 'Start exploring');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('moves on by itself and can be skipped', () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FirstRunDemo onDone={onDone} />);
    });
    act(() => {
      jest.advanceTimersByTime(SCENE_MS + 10);
    });
    expect(texts(tree)).toContain(DEMO_SCENES[1]!.title);
    press(tree, 'Skip the tour');
    expect(onDone).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('first-run gate', () => {
  let result: { show: boolean; done: () => void };
  function Probe({ ready }: { ready: boolean }) {
    result = useFirstRunDemo(ready);
    return null;
  }
  const mount = async (ready: boolean) => {
    await act(async () => {
      create(<Probe ready={ready} />);
    });
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    useTrailCache.setState({ logs: [] });
  });

  it('shows once after the opening for someone new, then never again', async () => {
    await mount(false);
    expect(result.show).toBe(false);
    await mount(true);
    expect(result.show).toBe(true);
    await act(async () => result.done());
    expect(result.show).toBe(false);
    expect(await AsyncStorage.getItem(DEMO_SEEN_KEY)).toBe('1');
    await mount(true);
    expect(result.show).toBe(false);
  });

  it('skips someone who already has hikes', async () => {
    useTrailCache.setState({ logs: [{ id: 'l1' } as never] });
    await mount(true);
    expect(result.show).toBe(false);
  });
});
