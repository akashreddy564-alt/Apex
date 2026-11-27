import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  useFocusEffect: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, []);
  },
}));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));

/* eslint-disable import/first */
import { TrailIqCard } from '@/components/home/TrailIqCard';
import { dayNumber, questionForDay, shuffledAnswers } from '@/lib/trailIq';
import { useTrailIqStore } from '@/stores/trailIqStore';
/* eslint-enable import/first */

const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map((n) => [n.props.children].flat(Infinity).join('')).join(' | ');
const draw = () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<TrailIqCard />);
  });
  return tree;
};
const pressAnswer = (tree: ReactTestRenderer, text: string) => {
  const node = tree.root.findAll((n) => n.props.accessibilityLabel === text && typeof n.props.onPress === 'function')[0]!;
  act(() => node.props.onPress());
};

beforeEach(() => useTrailIqStore.setState({ picks: {}, right: {} }));

describe('trail IQ', () => {
  const day = dayNumber(new Date());
  const q = questionForDay(day);
  const { answers, correct } = shuffledAnswers(q, day);

  it('asks today’s question and explains after a right answer', () => {
    const tree = draw();
    expect(texts(tree)).toContain(q.question);
    expect(texts(tree)).not.toContain(q.why);
    pressAnswer(tree, answers[correct]!);
    expect(texts(tree)).toContain('Right.');
    expect(texts(tree)).toContain(q.why);
    expect(texts(tree)).toContain('1 DAY IN A ROW');
    expect(useTrailIqStore.getState().right[String(day)]).toBe(true);
  });

  it('marks a wrong answer, shows the right one, and keeps the first pick', () => {
    const wrong = answers.findIndex((_, i) => i !== correct);
    const tree = draw();
    pressAnswer(tree, answers[wrong]!);
    expect(texts(tree)).toContain('Not quite.');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === `${answers[correct]}, right answer`).length).toBeGreaterThan(0);
    useTrailIqStore.getState().answer(day, correct, true);
    expect(useTrailIqStore.getState().picks[String(day)]).toBe(wrong);
  });
});
