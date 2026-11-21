import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { Path } from 'react-native-svg';

import { ContourLoader, ContourTexture, DrawIn, Eyebrow, Odometer, ReasonLine, Skeleton } from '@/components/motion';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

const comma = (n: number) => Math.round(n).toLocaleString('en-US');

describe('Odometer', () => {
  it('announces the formatted value', () => {
    const tree = render(<Odometer value={1942} format={comma} />);
    expect(tree.root.findByProps({ accessibilityLabel: '1,942' })).toBeTruthy();
  });

  it('renders the comma as a static character', () => {
    const tree = render(<Odometer value={1942} format={comma} />);
    expect(tree.root.findAllByType(Text).some((t) => t.props.children === ',')).toBe(true);
  });
});

describe('ContourLoader', () => {
  it('is a progressbar labelled Loading', () => {
    const tree = render(<ContourLoader size="md" />);
    const bar = tree.root.findByProps({ accessibilityRole: 'progressbar' });
    expect(bar.props.accessibilityLabel).toBe('Loading');
  });

  it('uses the label prop and shows it on the screen size', () => {
    const tree = render(<ContourLoader size="screen" label="Finding trails" />);
    expect(tree.root.findByProps({ accessibilityRole: 'progressbar' }).props.accessibilityLabel).toBe('Finding trails');
    expect(tree.root.findAllByType(Text).some((t) => t.props.children === 'Finding trails')).toBe(true);
  });
});

describe('DrawIn', () => {
  it('shows the full line under Reduce Motion', () => {
    const tree = render(<DrawIn d="M0 0 L10 10" stroke="#fff" length={14} />);
    expect(tree.root.findByType(Path).props.strokeDashoffset).toBe(0);
  });
});

describe('ContourTexture', () => {
  it('is hidden from accessibility', () => {
    const tree = render(<ContourTexture seed="a" width={100} height={100} />);
    expect(tree.root.findByProps({ 'aria-hidden': true })).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('is hidden from accessibility', () => {
    const tree = render(<Skeleton shape="card" count={2} />);
    expect(tree.root.findByProps({ importantForAccessibility: 'no-hide-descendants' })).toBeTruthy();
  });
});

describe('ReasonLine and Eyebrow', () => {
  it('ReasonLine renders both strings', () => {
    const tree = render(<ReasonLine value="Fits" text="About an hour from you" />);
    const shown = tree.root.findAllByType(Text).map((t) => String(t.props.children));
    expect(shown).toEqual(expect.arrayContaining(['Fits', 'About an hour from you']));
  });

  it('Eyebrow uppercases via style', () => {
    const tree = render(<Eyebrow>This week</Eyebrow>);
    const style = [tree.root.findByType(Text).props.style].flat(5).filter(Boolean);
    expect(Object.assign({}, ...style)).toMatchObject({ textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 10 });
  });
});
