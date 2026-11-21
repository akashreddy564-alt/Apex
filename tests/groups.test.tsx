import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { GroupsSection } from '@/components/groups/GroupsSection';
import type { BoardRow, Group, GroupSummary } from '@/lib/groupRules';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'g1' }),
  Stack: { Screen: () => null },
}));
jest.mock('lucide-react-native', () => ({ ArrowDown: () => null, ArrowUp: () => null, ChevronRight: () => null }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `apex://${path.replace(/^\//, '')}` }));
jest.mock('@/components/social/SignInGate', () => ({
  SignInGate: ({ children }: { children: (p: unknown) => unknown }) =>
    children({ id: 'me', username: 'akash', display_name: 'Akash' }),
}));

const group: Group = {
  id: 'g1', name: 'Desk hikers', color: 'green', code: 'AB3K9Q', isOwner: true,
  memberCount: 3, place: 2, previousPlace: 1, weekGainM: 600,
};
const board: BoardRow[] = [
  { userId: 'u2', username: 'maya', displayName: 'Maya', gainM: 1800, hikes: 2, km: 18, place: 1, isMe: false, isOwner: false },
  { userId: 'me', username: 'akash', displayName: 'Akash', gainM: 600, hikes: 1, km: 8, place: 2, isMe: true, isOwner: true },
];
const summary: GroupSummary = {
  totalGainM: 2400, totalHikes: 3, totalKm: 26,
  topClimber: { name: 'Maya', gainM: 1800 }, longestDay: { name: 'Maya', km: 18 },
  favorite: null, tasteMatch: { name: 'Maya', percent: 83 },
};
const mockActions = { leave: jest.fn(() => Promise.resolve()), leaving: false, remove: jest.fn(), removingFor: null };
let mockGroups: Group[] = [group];
jest.mock('@/hooks/useGroups', () => ({
  useMyGroups: () => ({ groups: mockGroups, loading: false, error: null, refetch: jest.fn() }),
  useGroupPage: () => ({ board, summary, loading: false, refreshing: false, error: null, refetch: jest.fn() }),
  useGroupActions: () => mockActions,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GroupScreen = require('@/app/group/[id]').default as () => JSX.Element;

function texts(tree: ReactTestRenderer): string {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => [n.props.children].flat().join(''))
    .join(' | ');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGroups = [group];
});

it('lists groups with place and movement, and opens one', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GroupsSection />);
  });
  expect(texts(tree)).toContain('2nd this week · 3 people');
  const row = tree.root.find((n) => n.props.accessibilityLabel === 'Desk hikers, 2nd this week, moved down' && n.props.onPress);
  act(() => row.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/group/[id]', params: { id: 'g1' } });
});

it('shows the together number, cards, board and code', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GroupScreen />);
  });
  const all = texts(tree);
  expect(all).toContain('Together this week');
  expect(all).toContain('7,874 ft');
  expect(all).toContain('Higher than Half Dome’s face');
  expect(all).toContain('83% same order as you');
  expect(all).toContain('Needs 2 people to rank a trail');
  expect(all).toContain('You');
  expect(all).toContain('AB3 K9Q');
});

it('lets the owner remove someone after confirming, but not themselves', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GroupScreen />);
  });
  const mine = tree.root.find((n) => n.props.accessibilityLabel === '2. You, 1,969 ft' && n.props.onLongPress);
  act(() => mine.props.onLongPress());
  expect(alert).not.toHaveBeenCalled();
  const maya = tree.root.find((n) => n.props.accessibilityLabel === '1. Maya, 5,906 ft' && n.props.onLongPress);
  act(() => maya.props.onLongPress());
  const buttons = alert.mock.calls[0][2] ?? [];
  act(() => buttons.find((b) => b.text === 'Remove')?.onPress?.());
  expect(mockActions.remove).toHaveBeenCalledWith('g1', 'u2');
});

it('explains when you are no longer in the group', () => {
  mockGroups = [];
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GroupScreen />);
  });
  expect(texts(tree)).toContain('Not in this group');
});
