import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));

import { TrailStats } from '@/components/trail/TrailStats';

const telemetry = { peak_elevation_m: 1765, elevation_gain_m: 592, distance_km: 8.95, avg_moving_time_seconds: null };

function strings(el: React.ReactElement): string[] {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(el);
  });
  return tree.root.findAllByType(Text).map((n) => {
    const kids = n.props.children;
    return Array.isArray(kids) ? kids.join('') : String(kids ?? '');
  });
}

describe('TrailStats', () => {
  it('shows the difficulty row by default', () => {
    const all = strings(<TrailStats trailId="t" telemetry={telemetry} />);
    expect(all).toContain('DIFFICULTY');
    expect(all.some((s) => s.startsWith('NPS Shenandoah rating'))).toBe(true);
  });

  it('hides the difficulty row and rating line when showDifficulty is false', () => {
    const all = strings(<TrailStats trailId="t" telemetry={telemetry} showDifficulty={false} />);
    expect(all).not.toContain('DIFFICULTY');
    expect(all.some((s) => s.startsWith('NPS Shenandoah rating'))).toBe(false);
    expect(all).toContain('DISTANCE');
  });
});
