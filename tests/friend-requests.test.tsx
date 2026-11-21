import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import FriendRequestsScreen from '@/app/friend-requests';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/social/SignInGate', () => ({
  SignInGate: ({ children }: { children: (p: unknown) => unknown }) =>
    children({ id: 'me', username: 'akash', display_name: 'Akash' }),
}));

const mockRefetch = jest.fn();
let mockFriends: Record<string, unknown> = {};
jest.mock('@/hooks/useFriends', () => ({ useFriendships: () => mockFriends }));

const base = { incoming: [], outgoing: [], loading: false, error: null, refetch: mockRefetch };

function shown(tree: ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((n) => String([n.props.children].flat().join('')));
}

function render() {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<FriendRequestsScreen />);
  });
  return tree;
}

it('says there are no requests only when the load worked', () => {
  mockFriends = { ...base };
  expect(shown(render())).toContain('No requests right now.');
});

it('shows the error and a retry instead of "no requests" when the load fails', () => {
  mockFriends = { ...base, error: 'Network request failed' };
  const tree = render();
  const text = shown(tree).join(' ');
  expect(text).not.toContain('No requests right now.');
  expect(text).toContain('Network request failed');
  const retry = tree.root.find(
    (node) => node.props.accessibilityLabel === 'Try again' && typeof node.props.onPress === 'function',
  );
  act(() => retry.props.onPress());
  expect(mockRefetch).toHaveBeenCalled();
});
