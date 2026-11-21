import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SlideToStart } from '@/components/motion';

jest.mock('lucide-react-native', () => ({ ArrowRight: () => null }));

jest.mock('react-native-gesture-handler',() => {
  require('react-native-gesture-handler/jestSetup');
  return jest.requireActual('react-native-gesture-handler');
});

function render(props: { disabled?: boolean; onComplete: () => void }): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<SlideToStart label="Slide to start" a11yLabel="Start hike" {...props} />);
  });
  return tree;
}

function root(tree: ReactTestRenderer) {
  return tree.root.find((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string');
}

describe('SlideToStart', () => {
  it('is a labelled button with an activate action', () => {
    const node = root(render({ onComplete: jest.fn() }));
    expect(node.props.accessibilityLabel).toBe('Start hike');
    expect(node.props.accessibilityActions).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'activate' })]));
  });

  it('calls onComplete once on activate', () => {
    const onComplete = jest.fn();
    const node = root(render({ onComplete }));
    act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does nothing on activate when disabled', () => {
    const onComplete = jest.fn();
    const node = root(render({ onComplete, disabled: true }));
    act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes once for repeated activates, and again after the latch clears', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const node = root(render({ onComplete }));
    const activate = () => act(() => node.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    activate();
    activate();
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    activate();
    expect(onComplete).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
