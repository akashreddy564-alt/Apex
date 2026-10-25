import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/stores/settingsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Probe() {
  const c = useColors();
  return <Text testID="probe">{c.bg}</Text>;
}

/** Stands in for an open bottom sheet: a child mounted before the switch. */
function OpenSheet() {
  return (
    <View>
      <Probe />
    </View>
  );
}

it('repaints a mounted screen when appearance changes', () => {
  act(() => {
    useSettings.getState().setAppearance('dark');
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<OpenSheet />);
  });
  const probe = () => tree.root.findByProps({ testID: 'probe' }).props.children;
  expect(probe()).toBe('#09090B');
  act(() => {
    useSettings.getState().setAppearance('light');
  });
  expect(probe()).toBe('#FFFFFF');
});
