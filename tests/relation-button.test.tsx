import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { RelationButton } from '@/components/social/RelationButton';
import type { Relation } from '@/lib/friendRules';

const mockActions = { add: jest.fn(), accept: jest.fn(), decline: jest.fn(), remove: jest.fn(), pendingFor: null };
jest.mock('@/hooks/useFriends', () => ({ useFriendActions: () => mockActions }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function render(relation: Relation) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<RelationButton personId="p1" name="Maya" relation={relation} />);
  });
  return tree;
}

function press(tree: ReactTestRenderer, label: string) {
  const node = tree.root.find(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  act(() => node.props.onPress());
}

beforeEach(() => jest.clearAllMocks());

it('adds a stranger', () => {
  press(render('none'), 'Add Maya');
  expect(mockActions.add).toHaveBeenCalledWith('p1');
});

it('accepts or declines a request to you', () => {
  const tree = render('incoming');
  press(tree, 'Accept Maya');
  press(tree, 'Decline Maya');
  expect(mockActions.accept).toHaveBeenCalledWith('p1');
  expect(mockActions.decline).toHaveBeenCalledWith('p1');
});

it('asks before unfriending', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  press(render('friend'), 'Friends with Maya. Unfriend');
  expect(mockActions.remove).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2] ?? [];
  act(() => buttons.find((b) => b.text === 'Unfriend')?.onPress?.());
  expect(mockActions.remove).toHaveBeenCalledWith('p1');
});

it('shows nothing on your own page', () => {
  expect(render('self').toJSON()).toBeNull();
});
