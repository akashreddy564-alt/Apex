import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useTaggable', () => ({
  useTaggable: () => [
    { id: 'u2', username: 'jordan', displayName: 'Jordan' },
    { id: 'u3', username: 'maya', displayName: 'Maya' },
  ],
}));

/* eslint-disable import/first */
import { PostDetails } from '@/components/feed/PostDetails';
import { HikeDetailsFields, type HikeDetails } from '@/components/log/HikeDetailsFields';
import { mapFeedPost } from '@/lib/postRules';
import { useGearStore } from '@/stores/gearStore';
/* eslint-enable import/first */

const draw = (el: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree;
};
const text = (t: ReactTestRenderer) =>
  t.root
    .findAllByType(Text)
    .map((n) => [n.props.children].flat(Infinity).join(''))
    .join(' | ');
const tap = (t: ReactTestRenderer, label: string) =>
  act(() => t.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0]!.props.onPress());

beforeEach(() => {
  mockPush.mockReset();
  useGearStore.setState({ items: ['Black Diamond poles'] });
});

describe('hike details fields', () => {
  function harness() {
    let value: HikeDetails = { chips: [], gear: [], companions: [] };
    const onChange = jest.fn((next: HikeDetails) => {
      value = next;
      tree.update(<HikeDetailsFields value={value} onChange={onChange} />);
    });
    const tree = draw(<HikeDetailsFields value={value} onChange={onChange} />);
    return { tree, get: () => value };
  }

  it('picks terrain, conditions and who you hiked with', () => {
    const { tree, get } = harness();
    tap(tree, 'Rocky');
    tap(tree, 'Muddy');
    tap(tree, 'Hiked with Jordan');
    expect(get().chips).toEqual(['Rocky', 'Muddy']);
    expect(get().companions).toEqual(['u2']);
    tap(tree, 'Rocky');
    expect(get().chips).toEqual(['Muddy']);
  });

  it('offers saved gear as a chip, and new gear is picked and saved for next time', () => {
    const { tree, get } = harness();
    tap(tree, 'Gear: Black Diamond poles');
    expect(get().gear).toEqual(['Black Diamond poles']);
    const input = tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === 'Add gear')[0]!;
    act(() => input.props.onChangeText('Salomon X Ultra 4'));
    act(() => input.props.onSubmitEditing());
    expect(get().gear).toEqual(['Black Diamond poles', 'Salomon X Ultra 4']);
    expect(useGearStore.getState().items[0]).toBe('Salomon X Ultra 4');
  });
});

describe('post details', () => {
  const post = (extra: object) => mapFeedPost({ post_id: 'p1', username: 'maya', bucket: 'loved', ...extra })!;

  it('shows who they hiked with, chips, and gear on the hike page', () => {
    const t = draw(
      <PostDetails
        full
        post={post({
          companions: [{ id: 'u2', username: 'jordan', display_name: 'Jordan' }, { id: 'u3', username: 'sam', display_name: 'Sam' }],
          terrain: ['Rocky'],
          conditions: ['Muddy'],
          gear: ['Poles', 'Salomon X Ultra 4'],
        })}
      />,
    );
    const shown = text(t);
    expect(shown).toContain('Jordan');
    expect(shown).toContain(' and ');
    expect(shown).toContain('Rocky');
    expect(shown).toContain('Poles · Salomon X Ultra 4');
    const jordan = t.root.findAll((n) => n.props.accessibilityRole === 'link' && typeof n.props.onPress === 'function')[0]!;
    act(() => jordan.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/friend/[id]', params: { id: 'u2' } });
  });

  it('keeps gear off the feed card', () => {
    expect(text(draw(<PostDetails full={false} post={post({ gear: ['Poles'] })} />))).toBe('');
  });

  it('shows nothing for a post without details', () => {
    expect(draw(<PostDetails full post={post({})} />).toJSON()).toBeNull();
  });
});
