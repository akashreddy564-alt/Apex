import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import DeleteAccountScreen from '@/app/delete-account';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args), auth: { signOut: jest.fn() } },
  isSupabaseConfigured: true,
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ email: 'me@example.com', session: { user: { id: 'u1' } } }),
}));
jest.mock('@/lib/hikePhotos', () => ({ deleteMyPhotos: jest.fn(async () => undefined) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function byLabel(tree: ReactTestRenderer, label: string) {
  return tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0]!;
}

function texts(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
}

async function confirm(tree: ReactTestRenderer) {
  act(() => byLabel(tree, 'Delete account').props.onPress());
  const input = tree.root.findAll((n) => n.props.accessibilityLabel === 'Type DELETE to confirm' && n.props.onChangeText)[0]!;
  act(() => input.props.onChangeText('DELETE'));
  await act(async () => {
    byLabel(tree, 'Confirm delete account').props.onPress();
  });
}

it('shows a failed delete inside the confirm sheet, in words', async () => {
  mockRpc.mockResolvedValueOnce({ error: { message: 'TypeError: Network request failed' } });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<DeleteAccountScreen />);
  });
  await confirm(tree);
  // The sheet is still open and carries the message.
  const sheet = tree.root.findAll((n) => n.props.visible === true && n.props.transparent === true)[0]!;
  const inSheet = sheet.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
  expect(inSheet).toContain('You’re offline. Connect to the internet and try again.');
});

it('says Deleting… while the request runs', async () => {
  let finish!: (value: { error: null }) => void;
  mockRpc.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<DeleteAccountScreen />);
  });
  await confirm(tree);
  expect(texts(tree)).toContain('Deleting…');
  await act(async () => finish({ error: null }));
  expect(texts(tree)).not.toContain('Deleting…');
});
