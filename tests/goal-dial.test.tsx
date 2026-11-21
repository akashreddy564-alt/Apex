import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { GoalDial, inRingBand } from '@/components/craft/GoalDial';
import { WeekBars } from '@/components/craft/WeekBars';
import type { GoalMetric } from '@/lib/weeklyGoal';

jest.mock('react-native-gesture-handler', () => {
  require('react-native-gesture-handler/jestSetup');
  return jest.requireActual('react-native-gesture-handler');
});

function render(metric: GoalMetric, display: number, onChange = jest.fn()): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<GoalDial metric={metric} display={display} onChange={onChange} />);
  });
  return tree;
}

function dial(tree: ReactTestRenderer) {
  return tree.root.find((n) => n.props.accessibilityRole === 'adjustable' && typeof n.type === 'string');
}

function action(node: ReturnType<typeof dial>, actionName: string) {
  act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName } }));
}

describe('GoalDial', () => {
  it('is adjustable and reads its value in words', () => {
    const node = dial(render('elevation', 3000));
    expect(node.props.accessibilityValue.text).toBe('3,000 feet a week');
    expect(node.props.accessibilityActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'increment' }), expect.objectContaining({ name: 'decrement' })]),
    );
  });

  it('steps up by one snap', () => {
    const onChange = jest.fn();
    action(dial(render('elevation', 3000, onChange)), 'increment');
    expect(onChange).toHaveBeenCalledWith(3250);
  });

  it('stays at the bottom of the range on decrement', () => {
    const onChange = jest.fn();
    action(dial(render('elevation', 1000, onChange)), 'decrement');
    expect(onChange).not.toHaveBeenCalledWith(750);
    for (const [value] of onChange.mock.calls) expect(value).toBe(1000);
  });

  it('steps miles for distance', () => {
    const onChange = jest.fn();
    const node = dial(render('distance', 10, onChange));
    expect(node.props.accessibilityValue.text).toBe('10 miles a week');
    action(node, 'increment');
    expect(onChange).toHaveBeenCalledWith(11);
  });

  it('clamps an out-of-range value for display without calling onChange', () => {
    const onChange = jest.fn();
    const node = dial(render('elevation', 12000, onChange));
    expect(node.props.accessibilityValue.text).toBe('8,000 feet a week');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('inRingBand', () => {
  it('accepts the ring between the centre disc and the dial edge', () => {
    expect(inRingBand(140, 140 - 110)).toBe(true); // top of the ring
    expect(inRingBand(140 + 130, 140)).toBe(true); // right edge
    expect(inRingBand(140, 140 + 76)).toBe(true); // just outside the disc
  });

  it('rejects the centre disc, the corners and bad input', () => {
    expect(inRingBand(140, 140)).toBe(false);
    expect(inRingBand(140 + 40, 140 - 30)).toBe(false); // on the disc
    expect(inRingBand(4, 4)).toBe(false); // corner of the square
    expect(inRingBand(276, 276)).toBe(false);
    expect(inRingBand(Number.NaN, 140)).toBe(false);
  });
});

describe('WeekBars', () => {
  it('labels the seven days and the daily pace', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<WeekBars totals={[0, 0, 0, 0, 0, 335, 257]} targetStored={914} />);
    });
    const texts = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string');
    const strings = texts.map((n) => n.props.children as string);
    expect(strings.filter((s) => ['M', 'T', 'W', 'F', 'S'].includes(s))).toHaveLength(7);
    expect(strings).toContain('Daily pace');
  });
});
