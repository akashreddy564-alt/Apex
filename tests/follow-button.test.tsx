import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

const mockMutate = jest.fn();
jest.mock('@/hooks/useFollows', () => ({
  useFollowToggle: () => ({ mutate: mockMutate, isPending: false, variables: undefined }),
}));

// eslint-disable-next-line import/first
import { FollowButton } from '@/components/social/FollowButton';

const draw = (el: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree;
};
const label = (t: ReactTestRenderer) => t.root.findAllByType(Text).map((n) => n.props.children).join('');
const press = (t: ReactTestRenderer) =>
  act(() => t.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button')[0]!.props.onPress());

beforeEach(() => mockMutate.mockReset());

it('says Follow, and following sends a follow', () => {
  const t = draw(<FollowButton personId="maya" name="Maya" following={false} />);
  expect(label(t)).toBe('Follow');
  press(t);
  expect(mockMutate).toHaveBeenCalledWith({ personId: 'maya', follow: true });
});

it('says Following, and tapping it unfollows', () => {
  const t = draw(<FollowButton personId="maya" name="Maya" following />);
  expect(label(t)).toBe('Following');
  press(t);
  expect(mockMutate).toHaveBeenCalledWith({ personId: 'maya', follow: false });
});
