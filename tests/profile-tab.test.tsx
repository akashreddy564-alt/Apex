import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProfileScreen from '@/app/(tabs)/profile';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useScrollToTop: () => undefined }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/hooks/useTabBarInset', () => ({ useTabBarInset: () => 0 }));
jest.mock('@/components/home/WeekHero', () => ({ WeekHero: () => null }));
jest.mock('@/components/social/WeekCard', () => ({
  WeekCard: ({ name }: { name: string }) => {
    const { Text: T } = require('react-native');
    return <T>{`week ${name}`}</T>;
  },
}));
jest.mock('@/app/friend/[id]', () => ({
  PersonPage: ({ id }: { id: string }) => {
    const { Text: T } = require('react-native');
    return <T>{`person ${id}`}</T>;
  },
}));

let mockState: Record<string, unknown> = {};
jest.mock('@/hooks/useProfile', () => ({ useMyProfile: () => mockState, profileKey: (id: string) => ['profile', id] }));
jest.mock('@/lib/profile', () => ({ acceptTerms: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => undefined) }));

const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
afterAll(() => client.clear());

const base = { configured: true, session: null, profile: null, loading: false, error: null, refetch: jest.fn() };

function render() {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <QueryClientProvider client={client}>
        <ProfileScreen />
      </QueryClientProvider>,
    );
  });
  return tree;
}

function texts(tree: ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((node) => String(node.props.children));
}

function press(tree: ReactTestRenderer, label: string) {
  const node = tree.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  act(() => node.props.onPress());
}

beforeEach(() => mockPush.mockClear());

it('shows your own page, your week and Edit profile when signed in', () => {
  mockState = {
    ...base,
    session: { user: { id: 'me' } },
    profile: { id: 'me', username: 'maya', display_name: 'Maya Chen', terms_accepted: true },
  };
  const tree = render();
  expect(texts(tree)).toEqual(expect.arrayContaining(['Profile', 'week Maya Chen', 'person me']));
  press(tree, 'Edit profile');
  expect(mockPush).toHaveBeenCalledWith('/username');
});

it('keeps Settings one tap away, signed in or out', () => {
  mockState = { ...base };
  const tree = render();
  expect(texts(tree)).toContain('Sign in to make your profile');
  press(tree, 'Settings');
  expect(mockPush).toHaveBeenCalledWith('/account');
});
