import { Platform } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-symbols', () => {
  const { View } = require('react-native');
  return { SymbolView: (props: Record<string, unknown>) => <View testID="sf-symbol" {...props} /> };
});

// eslint-disable-next-line import/first
import { SymbolIcon } from '@/components/SymbolIcon';

// jest.setup.js stubs every lucide icon with a fresh function, so use a stand-in with a stable identity.
function House() {
  return null;
}
House.displayName = 'House';

const realOS = Platform.OS;
afterEach(() => {
  Platform.OS = realOS;
});

function draw(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  return tree;
}

const symbols = (tree: ReactTestRenderer) => tree.root.findAll((n) => n.props.testID === 'sf-symbol' && typeof n.type === 'string');

test('Android draws the lucide fallback, never a blank', () => {
  Platform.OS = 'android';
  const tree = draw(<SymbolIcon name="house" filledName="house.fill" fallback={House as never} size={20} color="#000" focused />);
  expect(symbols(tree)).toHaveLength(0);
  expect(tree.root.findAllByType(House)).toHaveLength(1);
});

test('web draws the lucide fallback', () => {
  Platform.OS = 'web';
  const tree = draw(<SymbolIcon name="house" fallback={House as never} size={20} color="#000" />);
  expect(symbols(tree)).toHaveLength(0);
  expect(tree.root.findAllByType(House)).toHaveLength(1);
});

test('iOS draws the filled SF Symbol when focused', () => {
  Platform.OS = 'ios';
  const tree = draw(<SymbolIcon name="house" filledName="house.fill" fallback={House as never} size={20} color="#123456" focused />);
  const [symbol] = symbols(tree);
  expect(symbol.props.name).toBe('house.fill');
  expect(symbol.props.tintColor).toBe('#123456');
  expect(tree.root.findAllByType(House)).toHaveLength(0);
});

test('iOS draws the outline SF Symbol when not focused', () => {
  Platform.OS = 'ios';
  const tree = draw(<SymbolIcon name="house" filledName="house.fill" fallback={House as never} size={20} color="#000" />);
  expect(symbols(tree)[0].props.name).toBe('house');
});
