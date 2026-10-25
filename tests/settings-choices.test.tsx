import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import AccountScreen from '@/app/account';
import { useSettings } from '@/stores/settingsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock('lucide-react-native', () => ({ ChevronRight: () => null }));
jest.mock('@/hooks/useProfile', () => ({
  useMyProfile: () => ({ configured: false, session: null, profile: null, loading: false }),
}));

function radio(tree: ReactTestRenderer, label: string) {
  return tree.root.find(
    (node) =>
      node.props.accessibilityRole === 'radio' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
}

it('switches appearance and score style from Settings', () => {
  act(() => {
    useSettings.setState({ appearance: 'dark', scoreStyle: 'number' });
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<AccountScreen />);
  });
  expect(radio(tree, 'Dark').props.accessibilityState).toEqual({ checked: true });

  act(() => {
    radio(tree, 'Light').props.onPress();
  });
  expect(useSettings.getState().appearance).toBe('light');

  act(() => {
    radio(tree, 'Blaze').props.onPress();
  });
  expect(useSettings.getState().scoreStyle).toBe('blaze');
});
