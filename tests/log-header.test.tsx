import { act, create, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('@/components/habit/NotificationAsk', () => ({ NotificationAsk: () => null }));
const mockGoal = {
  goal: { metric: 'elevation', target: 3000 / 3.28084 },
  progress: { done: 1942 / 3.28084, target: 3000 / 3.28084, fraction: 0.65, complete: false, hikes: 2, weekOf: '2026-11-16' },
  hasHiked: true,
};
jest.mock('@/hooks/useWeeklyGoal', () => ({ useWeeklyGoal: () => mockGoal }));

import { LogHeader } from '@/components/log/LogHeader';

describe('LogHeader', () => {
  it('opens the weekly goal from the week block, labelled with progress', () => {
    const onGoal = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <LogHeader view="hikes" onView={jest.fn()} onStart={jest.fn()} onLogPast={jest.fn()} onProfile={jest.fn()} onGoal={onGoal} />,
      );
    });
    const button = tree.root.find(
      (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Weekly goal, 1,942 of 3,000 ft',
    );
    expect(button.props.accessibilityRole).toBe('button');
    const pressable = tree.root.find(
      (n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Weekly goal, 1,942 of 3,000 ft',
    );
    act(() => pressable.props.onPress());
    expect(onGoal).toHaveBeenCalled();
  });
});
