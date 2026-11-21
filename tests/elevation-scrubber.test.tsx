import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ElevationScrubber } from '@/components/craft/ElevationScrubber';
import { RouteTracer } from '@/components/craft/RouteTracer';

jest.mock('react-native-gesture-handler', () => {
  require('react-native-gesture-handler/jestSetup');
  return jest.requireActual('react-native-gesture-handler');
});

// Metres, chosen so the display reads in feet: 304.8 m = 1,000 ft.
const profile = [
  { distance_m: 0, elevation_m: 304.8 },
  { distance_m: 2000, elevation_m: 609.6 },
  { distance_m: 4000, elevation_m: 457.2 },
];

function render(el: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree;
}
const root = (t: ReactTestRenderer) =>
  t.root.find((n) => n.props.accessibilityRole === 'adjustable' && typeof n.type === 'string');
const act2 = (t: ReactTestRenderer, actionName: string) =>
  act(() => root(t).props.onAccessibilityAction({ nativeEvent: { actionName } }));

describe('ElevationScrubber', () => {
  it('is an adjustable control with a starting value', () => {
    const node = root(render(<ElevationScrubber profile={profile} />));
    expect(node.props.accessibilityLabel).toBe('Elevation profile');
    expect(node.props.accessibilityValue.text).toBe('0.0 mi, 1,000 ft elevation, 0 ft climbed');
  });

  it('increment moves 0.1 of the distance and reports the route fraction', () => {
    const onScrub = jest.fn();
    const t = render(<ElevationScrubber profile={profile} onScrub={onScrub} />);
    act2(t, 'increment');
    // 0.1 of 4000 m = 400 m = 0.2 mi; elevation 304.8 + 0.2*304.8 = 365.76 m = 1,200 ft.
    expect(root(t).props.accessibilityValue.text).toBe('0.2 mi, 1,200 ft elevation, 200 ft climbed');
    expect(onScrub).toHaveBeenLastCalledWith(expect.closeTo(0.1, 5));
  });

  it('decrement at the start stays at zero', () => {
    const t = render(<ElevationScrubber profile={profile} />);
    act2(t, 'decrement');
    expect(root(t).props.accessibilityValue.text).toBe('0.0 mi, 1,000 ft elevation, 0 ft climbed');
  });

  it('folds the route fraction for out-and-back', () => {
    const onScrub = jest.fn();
    const t = render(<ElevationScrubber profile={profile} shape="out-and-back" onScrub={onScrub} />);
    act2(t, 'increment');
    expect(onScrub).toHaveBeenLastCalledWith(expect.closeTo(0.2, 5));
  });

  it('increment clamps at the end', () => {
    const t = render(<ElevationScrubber profile={profile} />);
    for (let i = 0; i < 14; i++) act2(t, 'increment');
    expect(root(t).props.accessibilityValue.text).toBe('2.5 mi, 1,500 ft elevation, 1,000 ft climbed');
  });

  it('renders with a zero-width layout and no NaN', () => {
    const t = render(<ElevationScrubber profile={profile} />);
    expect(JSON.stringify(t.toJSON())).not.toContain('NaN');
  });

  it('renders null for an empty profile', () => {
    expect(render(<ElevationScrubber profile={[]} />).toJSON()).toBeNull();
  });
});

describe('RouteTracer', () => {
  it('renders null for a one-point path', () => {
    const path = { type: 'LineString' as const, coordinates: [[1, 2]] as [number, number][] };
    expect(render(<RouteTracer path={path} fraction={0} />).toJSON()).toBeNull();
  });

  it('renders when every point shares a latitude', () => {
    const path = { type: 'LineString' as const, coordinates: [[1, 2], [1.1, 2], [1.2, 2]] as [number, number][] };
    const t = render(<RouteTracer path={path} fraction={0.5} />);
    expect(JSON.stringify(t.toJSON())).not.toContain('NaN');
  });

  it('renders for a real path', () => {
    const path = { type: 'LineString' as const, coordinates: [[1, 2], [1.1, 2.1], [1.2, 2.0]] as [number, number][] };
    expect(render(<RouteTracer path={path} fraction={0.5} />).toJSON()).not.toBeNull();
  });
});
