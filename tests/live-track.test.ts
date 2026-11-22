import { climbRuns } from '@/components/log/LiveTrackMap';

describe('climbRuns', () => {
  it('splits the track where it starts and stops climbing, keeping the line joined', () => {
    const runs = climbRuns(['a', 'b', 'c', 'd', 'e'], [100, 105, 110, 110, 108]);
    expect(runs).toEqual([
      { up: true, points: ['a', 'b', 'c'] },
      { up: false, points: ['c', 'd', 'e'] },
    ]);
  });

  it('treats tiny rises and missing altitude as flat', () => {
    expect(climbRuns(['a', 'b', 'c'], [100, 100.2, null])).toEqual([{ up: false, points: ['a', 'b', 'c'] }]);
  });

  it('draws nothing for fewer than two points', () => {
    expect(climbRuns(['a'], [1])).toEqual([]);
  });
});
