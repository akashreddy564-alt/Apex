import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useSafetyMenu } from '@/components/safety/useSafetyMenu';
import type { AppNotification } from '@/lib/safetyRules';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
}));
jest.mock('lucide-react-native', () => ({ Check: () => null }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/components/social/SignInGate', () => ({
  SignInGate: ({ children }: { children: (p: unknown) => unknown }) =>
    children({ id: 'me', username: 'akash', display_name: 'Akash' }),
}));
const mockActions = {
  block: jest.fn(() => Promise.resolve()),
  unblock: jest.fn(),
  unblockingFor: null,
  report: jest.fn(() => Promise.resolve()),
  reporting: false,
};
jest.mock('@/hooks/useSafety', () => ({ useSafetyActions: () => mockActions }));
const mockNotes: AppNotification[] = [
  {
    id: 'n1', kind: 'passed', actorId: 'u2', actorName: 'Maya', actorUsername: 'maya', postId: null,
    trailName: null, groupId: 'g1', groupName: 'Desk hikers', commentBody: null,
    createdAt: new Date().toISOString(), read: false,
  },
];
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ notifications: mockNotes, loading: false, refreshing: false, error: null, refetch: jest.fn(), markRead: jest.fn() }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const NotificationsScreen = require('@/app/notifications').default as () => JSX.Element;
const ReportScreen = require('@/app/report').default as () => JSX.Element;
/* eslint-enable @typescript-eslint/no-require-imports */

const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => [n.props.children].flat().join(''))
    .join(' | ');

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

it('shows a notification and opens its group', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<NotificationsScreen />);
  });
  expect(texts(tree)).toContain('passed you in Desk hikers this week');
  const row = tree.root.find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Maya passed') && n.props.onPress);
  act(() => row.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/group/[id]', params: { id: 'g1' } });
});

function Menu({ onBlocked }: { onBlocked: () => void }) {
  const open = useSafetyMenu(onBlocked);
  open({ person: 'u2', name: 'Maya Chen', post: 'p1' });
  return null;
}

it('reports a hike or blocks after confirming', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const onBlocked = jest.fn();
  act(() => {
    create(<Menu onBlocked={onBlocked} />);
  });
  const buttons = alert.mock.calls[0][2] ?? [];
  expect(buttons.map((b) => b.text)).toEqual(['Report this hike', 'Block Maya', 'Cancel']);
  act(() => buttons[0].onPress?.());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/report', params: { person: 'u2', name: 'Maya Chen', post: 'p1' } });
  act(() => buttons[1].onPress?.());
  expect(mockActions.block).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[alert.mock.calls.length - 1][2] ?? [];
  await act(async () => {
    confirm.find((b) => b.text === 'Block')?.onPress?.();
  });
  expect(mockActions.block).toHaveBeenCalledWith('u2');
  expect(onBlocked).toHaveBeenCalled();
});

it('sends a report once a reason is picked', async () => {
  mockParams = { person: 'u2', name: 'Maya Chen', comment: 'c1' };
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ReportScreen />);
  });
  expect(texts(tree)).toContain('What’s wrong with Maya Chen’s comment?');
  const send = () => tree.root.find((n) => n.props.accessibilityLabel === 'Send report' && n.props.onPress);
  expect(send().props.disabled).toBe(true);
  const spam = tree.root.find((n) => n.props.accessibilityRole === 'radio' && texts({ root: n } as never).includes('Spam'));
  act(() => spam.props.onPress());
  await act(async () => {
    send().props.onPress();
  });
  expect(mockActions.report).toHaveBeenCalledWith({ person: 'u2', reason: 'spam', details: '', post: undefined, comment: 'c1' });
});
