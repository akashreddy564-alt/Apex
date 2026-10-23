import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { ScoreBadge } from '@/components/score/ScoreBadge';
import type { ScoreStyle } from '@/lib/appearance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function texts(style: ScoreStyle, count: number, score: number): string[] {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ScoreBadge bucket="loved" count={count} score={score} style={style} size="lg" />);
  });
  return tree.root.findAllByType(Text).map((node) => String([node.props.children].flat().join('')));
}

describe.each<ScoreStyle>(['number', 'peak', 'blaze'])('%s badge', (style) => {
  it('shows the bucket word and no number for a one-hike bucket', () => {
    const shown = texts(style, 1, 9.6);
    expect(shown.some((t) => t === 'Loved')).toBe(true);
    expect(shown.some((t) => /\d/.test(t))).toBe(false);
  });

  it('shows the score for a bucket of 3', () => {
    expect(texts(style, 3, 9.43)).toContain('9.4');
  });
});
