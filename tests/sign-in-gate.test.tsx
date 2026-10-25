import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SignInGate } from '@/components/social/SignInGate';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockState: Record<string, unknown> = {};
jest.mock('@/hooks/useProfile', () => ({ useMyProfile: () => mockState }));

const base = { configured: true, session: null, profile: null, loading: false, error: null, refetch: jest.fn() };

function render() {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SignInGate why="see friends">{(profile) => <Text>{`hello ${profile.username}`}</Text>}</SignInGate>,
    );
  });
  return tree;
}

function texts(tree: ReactTestRenderer) {
  return tree.root
    .findAll((node) => typeof node.props.children === 'string')
    .map((node) => node.props.children as string);
}

function button(tree: ReactTestRenderer, label: string) {
  return tree.root.find(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

it('asks a signed-out hiker to sign in', () => {
  mockState = { ...base };
  const tree = render();
  act(() => button(tree, 'Sign in with email').props.onPress());
  expect(mockPush).toHaveBeenCalledWith('/account');
});

it('asks a signed-in hiker without a profile to pick a username', () => {
  mockState = { ...base, session: { user: { id: 'u1' } } };
  const tree = render();
  act(() => button(tree, 'Choose username').props.onPress());
  expect(mockPush).toHaveBeenCalledWith('/username');
});

it('shows the content once there is a profile', () => {
  mockState = {
    ...base,
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', username: 'maya_c', display_name: 'Maya', created_at: '' },
  };
  expect(texts(render()).join(' ')).toContain('maya_c');
});
