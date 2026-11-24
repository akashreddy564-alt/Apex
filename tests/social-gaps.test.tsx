import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { FriendsBoard } from '@/components/social/FriendsBoard';
import { OrganizationsSection } from '@/components/social/OrganizationsSection';
import type { BoardRow } from '@/lib/groupRules';
import type { Organization } from '@/lib/orgRules';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'o1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock('@/components/social/SignInGate', () => ({
  SignInGate: ({ children }: { children: (p: unknown) => unknown }) =>
    children({ id: 'me', username: 'akash', display_name: 'Akash' }),
}));

const board: BoardRow[] = [
  { userId: 'u2', username: 'maya', displayName: 'Maya', gainM: 1800, hikes: 2, km: 18, place: 1, isMe: false, isOwner: false },
  { userId: 'me', username: 'akash', displayName: 'Akash', gainM: 600, hikes: 1, km: 8, place: 2, isMe: true, isOwner: false },
];
let mockFriendBoard: BoardRow[] = board;
jest.mock('@/hooks/useGroups', () => ({
  useFriendBoard: () => ({ board: mockFriendBoard, loading: false, error: null, refetch: jest.fn() }),
}));

const org: Organization = {
  id: 'o1', name: 'University of Washington', kind: 'school', domain: 'uw.edu',
  verifiedAt: new Date().toISOString(), memberCount: 2, place: 1, weekGainM: 600,
};
let mockOrgs: Organization[] = [org];
const mockOrgActions = {
  sendCode: jest.fn(async () => undefined),
  sending: false,
  confirm: jest.fn(),
  confirming: false,
  create: jest.fn(async () => 'o-new'),
  creating: false,
  leave: jest.fn(async () => undefined),
  leaving: false,
};
jest.mock('@/hooks/useOrganizations', () => ({
  useMyOrganizations: () => ({ organizations: mockOrgs, loading: false, error: null, refetch: jest.fn() }),
  useOrgBoard: () => ({ board, loading: false, refreshing: false, error: null, refetch: jest.fn() }),
  useOrgActions: () => mockOrgActions,
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const VerifyOrgScreen = require('@/app/verify-org').default as () => JSX.Element;
const OrgScreen = require('@/app/org/[id]').default as () => JSX.Element;
/* eslint-enable @typescript-eslint/no-require-imports */

function texts(tree: ReactTestRenderer): string {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => [n.props.children].flat().join(''))
    .join(' | ');
}

function input(tree: ReactTestRenderer, label: string) {
  return tree.root.find((n) => n.props.accessibilityLabel === label && n.props.onChangeText);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOrgs = [org];
  mockFriendBoard = board;
  mockParams = { id: 'o1' };
});

describe('friends board', () => {
  it('ranks you with your friends and opens a friend', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FriendsBoard />);
    });
    expect(texts(tree)).toContain('Who climbed the most this week');
    const maya = tree.root.find((n) => n.props.accessibilityLabel === '1. Maya, 5,906 ft' && n.props.onPress);
    act(() => maya.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/friend/[id]', params: { id: 'u2' } });
  });

  it('nudges you to add friends when it’s just you', () => {
    mockFriendBoard = [board[1]];
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<FriendsBoard />);
    });
    expect(texts(tree)).toContain('Add friends and their recorded climbs show up here');
  });
});

describe('schools and companies', () => {
  it('lists verified boards and offers to verify', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<OrganizationsSection />);
    });
    expect(texts(tree)).toContain('University of Washington');
    expect(texts(tree)).toContain('1st this week · 2 people');
    act(() => tree.root.find((n) => n.props.label === 'Verify school or work email').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/verify-org');
  });

  it('refuses personal email before sending anything', async () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<VerifyOrgScreen />);
    });
    act(() => input(tree, 'School or work email').props.onChangeText('me@gmail.com'));
    await act(async () => tree.root.find((n) => n.props.label === 'Send code').props.onPress());
    expect(mockOrgActions.sendCode).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Use your school or work email, not a personal one.');
  });

  it('takes the first person from a domain through code and naming', async () => {
    mockOrgActions.confirm
      .mockResolvedValueOnce({ status: 'wrong_code', triesLeft: 3 })
      .mockResolvedValueOnce({ status: 'name_it', domain: 'uw.edu', kind: 'school' });
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<VerifyOrgScreen />);
    });
    act(() => input(tree, 'School or work email').props.onChangeText('maya@uw.edu'));
    await act(async () => tree.root.find((n) => n.props.label === 'Send code').props.onPress());
    expect(mockOrgActions.sendCode).toHaveBeenCalledWith('maya@uw.edu');
    expect(texts(tree)).toContain('We sent a 6-digit code to maya@uw.edu');

    act(() => input(tree, 'Code from the email').props.onChangeText('111 111'));
    await act(async () => tree.root.find((n) => n.props.label === 'Verify').props.onPress());
    expect(texts(tree)).toContain('That code didn’t match. 3 tries left.');

    act(() => input(tree, 'Code from the email').props.onChangeText('482913'));
    await act(async () => tree.root.find((n) => n.props.label === 'Verify').props.onPress());
    expect(mockOrgActions.confirm).toHaveBeenLastCalledWith('482913');
    expect(texts(tree)).toContain('You’re the first from uw.edu');
    expect(input(tree, 'School name').props.value).toBe('UW');

    act(() => input(tree, 'School name').props.onChangeText('University of Washington'));
    await act(async () => tree.root.find((n) => n.props.label === 'Create school board').props.onPress());
    expect(mockOrgActions.create).toHaveBeenCalledWith('University of Washington', 'school');
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/org/[id]', params: { id: 'o-new' } });
  });

  it('joins an existing board straight from the code', async () => {
    mockOrgActions.confirm.mockResolvedValueOnce({ status: 'joined', organizationId: 'o1', name: 'University of Washington', kind: 'school' });
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<VerifyOrgScreen />);
    });
    act(() => input(tree, 'School or work email').props.onChangeText('jordan@uw.edu'));
    await act(async () => tree.root.find((n) => n.props.label === 'Send code').props.onPress());
    act(() => input(tree, 'Code from the email').props.onChangeText('123456'));
    await act(async () => tree.root.find((n) => n.props.label === 'Verify').props.onPress());
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/org/[id]', params: { id: 'o1' } });
  });

  it('shows the verified board and leaves after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<OrgScreen />);
    });
    const all = texts(tree);
    expect(all).toContain('School · verified @uw.edu · 2 people');
    expect(all).toContain('Climbed this week');
    expect(all).toContain('You');
    act(() => tree.root.find((n) => n.props.label === 'Leave school').props.onPress());
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => buttons.find((b) => b.text === 'Leave')?.onPress?.());
    expect(mockOrgActions.leave).toHaveBeenCalledWith('o1');
  });

  it('asks you to verify again when a year is nearly up', () => {
    mockOrgs = [{ ...org, verifiedAt: new Date(Date.now() - 350 * 86_400_000).toISOString() }];
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<OrgScreen />);
    });
    expect(texts(tree)).toMatch(/Verify your email again within \d+ days/);
  });
});
