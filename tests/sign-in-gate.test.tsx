import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SignInGate } from '@/components/social/SignInGate';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockState: Record<string, unknown> = {};
jest.mock('@/hooks/useProfile', () => ({ useMyProfile: () => mockState, profileKey: (id: string) => ['profile', id] }));
const mockAccept = jest.fn();
jest.mock('@/lib/profile', () => ({ acceptTerms: (...args: unknown[]) => mockAccept(...args) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => undefined) }));

const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
afterAll(() => client.clear());

const base = { configured: true, session: null, profile: null, loading: false, error: null, refetch: jest.fn() };

function render() {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <QueryClientProvider client={client}>
        <SignInGate why="see friends">{(profile) => <Text>{`hello ${profile.username}`}</Text>}</SignInGate>
      </QueryClientProvider>,
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
    profile: { id: 'u1', username: 'maya_c', display_name: 'Maya', created_at: '', terms_accepted: true },
  };
  expect(texts(render()).join(' ')).toContain('maya_c');
});

it('asks an older account to agree to the terms once, then shows the content', async () => {
  mockState = {
    ...base,
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', username: 'maya_c', display_name: 'Maya', created_at: '', terms_accepted: false },
  };
  mockAccept.mockResolvedValueOnce({ id: 'u1', username: 'maya_c', display_name: 'Maya', created_at: '', terms_accepted: true });
  const tree = render();
  expect(texts(tree).join(' ')).toContain('One thing before you post');
  expect(texts(tree).join(' ')).not.toContain('hello maya_c');
  await act(async () => button(tree, 'Agree and continue').props.onPress());
  expect(mockAccept).toHaveBeenCalledWith('u1');
});
