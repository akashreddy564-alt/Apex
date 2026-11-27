import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
let mockHits: unknown[] = [];
jest.mock('@/hooks/useCatalogSearch', () => ({ useCatalogSearch: () => ({ hits: mockHits, loading: false }) }));
jest.mock('@/lib/catalogRemote', () => ({ ensureTrail: jest.fn() }));

/* eslint-disable import/first */
import { TrailNameField } from '@/components/log/TrailNameField';
/* eslint-enable import/first */

const labels = (t: ReactTestRenderer) =>
  t.root
    .findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string)
    .filter((v, i, all) => all.indexOf(v) === i);

it('keeps "Add as a new trail" first, above results that arrive later', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<TrailNameField trails={[]} onPick={jest.fn()} onCreate={jest.fn()} />);
  });
  act(() => tree.root.findByType(TextInput).props.onChangeText('Cauley'));
  expect(labels(tree)[0]).toBe('Add Cauley as a new trail');

  // Server results come in after typing; the button must not move down.
  mockHits = [{ id: 'c1', name: 'Cauley Creek Park', region: 'Duluth, GA', distance_km: null, elevation_gain_m: null, away_m: 900 }];
  act(() => tree.update(<TrailNameField trails={[]} onPick={jest.fn()} onCreate={jest.fn()} />));
  const after = labels(tree);
  expect(after[0]).toBe('Add Cauley as a new trail');
  expect(after).toContain('Cauley Creek Park, Duluth, GA');
});
