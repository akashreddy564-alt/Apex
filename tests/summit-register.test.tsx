import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { SummitRegister } from '@/components/craft/SummitRegister';
import type { HikeLog, Trail } from '@/types/trail';

const TRAIL: Trail = {
  id: 'angels',
  name: 'Angels Landing',
  region: 'Zion, UT',
  distance_km: 8.7,
  elevation_gain_m: 450,
  // 5,791 ft
  peak_elevation_m: 1765,
  path: { type: 'LineString', coordinates: [] },
  elevation_profile: [
    { distance_m: 0, elevation_m: 1300 },
    { distance_m: 2000, elevation_m: 1600 },
    { distance_m: 4500, elevation_m: 1765 },
  ],
  avg_moving_time_seconds: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const LOG: HikeLog = {
  id: 'log-7',
  user_id: 'me',
  trail_id: 'angels',
  duration_seconds: 3 * 3600 + 48 * 60,
  photos: [],
  notes: null,
  recorded_path: null,
  created_at: '2026-11-22T07:12:00',
  // 5.6 mi and 1,942 ft: the log's own numbers win over the trail's.
  distance_km: 9.0,
  elevation_gain_m: 592,
};

const NO_REASONS = { distance: null, climb: null, time: null };

function render(props: Partial<Parameters<typeof SummitRegister>[0]> = {}): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SummitRegister log={LOG} trail={TRAIL} number={7} reasons={NO_REASONS} rank={null} {...props} />,
    );
  });
  return tree;
}

const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map((n) => [n.props.children].flat().filter((k) => typeof k === 'string' || typeof k === 'number').join(''));

describe('SummitRegister', () => {
  it('prints the hike number, trail name, distance and climb', () => {
    const all = texts(render());
    expect(all).toEqual(expect.arrayContaining(['No. 0007', 'Angels Landing', '5.6 MI', '1,942 FT']));
  });

  it('stamps the summit only when the trail has a peak elevation', () => {
    expect(texts(render())).toContain('5,791 FT');
    const flat = texts(render({ trail: { ...TRAIL, peak_elevation_m: null } }));
    expect(flat).not.toContain('5,791 FT');
    expect(flat).not.toContain('SUMMIT');
  });

  it('shows a reason under its line only when there is one', () => {
    expect(texts(render())).not.toContain('Your biggest climb yet');
    const all = texts(render({ reasons: { distance: null, climb: 'Your biggest climb yet', time: null } }));
    expect(all).toContain('Your biggest climb yet');
    expect(all.indexOf('Your biggest climb yet')).toBe(all.indexOf('1,942 FT') + 1);
    expect(all).not.toContain('Your longest hike yet');
  });

  it('reads the rank, then the reason for it', () => {
    const all = texts(
      render({
        rank: { bucket: 'loved', count: 5, score: 9.1, ordinal: 2, total: 7, reason: 'Above Mission Peak, below Half Dome' },
      }),
    );
    const at = all.indexOf('Ranked #2 of 7');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(all[at + 1]).toBe('Above Mission Peak, below Half Dome');
  });

  it('opens the trail when tapped', () => {
    const onOpen = jest.fn();
    const t = render({ onOpen });
    const target = t.root.find((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'link');
    act(() => target.props.onPress());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the empty register with no log', () => {
    const all = texts(render({ log: null, trail: null, number: 0 }));
    expect(all).toContain('Your first hike prints here');
    expect(all).not.toContain('No. 0000');
  });
});

describe('StreakGrid', () => {
  const { StreakGrid, firstMonday } = require('@/components/craft/StreakGrid') as typeof import('@/components/craft/StreakGrid');
  const empty = () => Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0] as (0 | 1 | 2)[]);

  function grid(streakWeeks: number): ReactTestRenderer {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<StreakGrid grid={empty()} streakWeeks={streakWeeks} now={new Date(2026, 10, 21)} />);
    });
    return tree;
  }

  it('shows the streak, and hides it at zero', () => {
    expect(texts(grid(3))).toContain('3-week streak');
    expect(texts(grid(0)).some((s) => s.includes('streak'))).toBe(false);
  });

  it('warns when the streak is at risk, in the fine color', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<StreakGrid grid={empty()} streakWeeks={3} atRisk now={new Date(2026, 10, 21)} />);
    });
    const nudge = tree.root.findAllByType(Text).find((n) => n.props.children === 'Hike by Sunday to keep it');
    expect(nudge).toBeTruthy();
    const { palettes } = require('@/theme/tokens');
    expect(nudge!.props.style.color).toBe(palettes.dark.fine);
    expect(texts(grid(3))).not.toContain('Hike by Sunday to keep it');
  });

  it('labels the first Monday, the key and now', () => {
    expect(texts(grid(0))).toEqual(expect.arrayContaining(['AUG 31', '■ FULL HIKE  ▪ SHORT HIKE', 'NOW']));
    expect(firstMonday(12, new Date(2026, 10, 21))).toBe('AUG 31');
  });

  it('draws 12 by 7 cells', () => {
    const cells = grid(0).root.findAll(
      (n) => typeof n.type === 'string' && n.props.style?.aspectRatio === 1,
    );
    expect(cells).toHaveLength(84);
  });
});
