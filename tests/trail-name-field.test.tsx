import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';

import { TrailNameField } from '@/components/log/TrailNameField';
import type { Trail } from '@/types/trail';

jest.mock('lucide-react-native', () => ({ Plus: () => null }));

const trail = (id: string, name: string, region: string): Trail => ({
  id,
  name,
  region,
  distance_km: 9.7,
  elevation_gain_m: 640,
  peak_elevation_m: 766,
  path: { type: 'LineString', coordinates: [] },
  elevation_profile: [],
  avg_moving_time_seconds: null,
  created_at: '',
  updated_at: '',
});

const trails = [trail('a', 'Mission Peak', 'Fremont, CA'), trail('b', 'Mount Si', 'North Bend, WA')];

function render(onPick = jest.fn(), onCreate = jest.fn()) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<TrailNameField trails={trails} onPick={onPick} onCreate={onCreate} />);
  });
  const type = (text: string) =>
    act(() => {
      tree.root.findByType(TextInput).props.onChangeText(text);
    });
  const button = (label: string) =>
    tree.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  return { tree, type, button };
}

describe('TrailNameField', () => {
  it('offers no new trail for a blank name', () => {
    const { tree, type } = render();
    type('    ');
    const adds = tree.root.findAll(
      (node) => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Add '),
    );
    expect(adds).toHaveLength(0);
  });

  it('creates a trail with the cleaned name', () => {
    const onCreate = jest.fn();
    const { type, button } = render(jest.fn(), onCreate);
    type('  Bear   Gulch ');
    act(() => button('Add Bear Gulch as a new trail')!.props.onPress());
    expect(onCreate).toHaveBeenCalledWith('Bear Gulch');
  });

  it('lists matching trails and picks one', () => {
    const onPick = jest.fn();
    const { type, button } = render(onPick);
    type('mission');
    act(() => button('Mission Peak, Fremont, CA')!.props.onPress());
    expect(onPick).toHaveBeenCalledWith('a');
  });

  it('does not offer to add a name that is already a trail', () => {
    const { type, button } = render();
    type('mount si');
    expect(button('Add mount si as a new trail')).toBeUndefined();
  });
});
