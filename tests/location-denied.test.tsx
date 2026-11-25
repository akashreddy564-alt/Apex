import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking, Text } from 'react-native';

import { LocationDenied } from '@/components/log/LocationDenied';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function press(tree: ReactTestRenderer, label: string) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0]!;
  act(() => node.props.onPress());
}

it('offers Settings and a time-only hike when location is denied', () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  const timeOnly = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<LocationDenied onTimeOnly={timeOnly} onDismiss={() => {}} />);
  });
  const shown = tree.root.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
  expect(shown).toContain('Location is off for Apex');

  press(tree, 'Open Settings');
  expect(settings).toHaveBeenCalled();
  press(tree, 'Record time only');
  expect(timeOnly).toHaveBeenCalledTimes(1);
});
