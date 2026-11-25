import { buildPastHikeLog, durationFromParts, formatHikeDay, hikeTimestamp, suggestHikeType } from '@/lib/pastHike';
import { weeklyProgress } from '@/lib/weeklyGoal';

describe('buildPastHikeLog', () => {
  const now = new Date(2026, 9, 2, 15, 0, 0);

  it('stores the chosen day, duration, and notes', () => {
    const hikedOn = new Date(2024, 5, 2, 18, 40, 0);
    const log = buildPastHikeLog({
      trailId: 'trail-angel',
      hikedOn,
      hours: 2,
      minutes: 15,
      notes: '  windy ridge  ',
      id: 'log-1',
      userId: 'user-1',
      now,
    });

    expect(log).toMatchObject({
      id: 'log-1',
      user_id: 'user-1',
      trail_id: 'trail-angel',
      duration_seconds: 2 * 3600 + 15 * 60,
      photos: [],
      notes: 'windy ridge',
      recorded_path: null,
      created_at: hikeTimestamp(hikedOn),
    });
    const stored = new Date(log!.created_at);
    expect(stored.getFullYear()).toBe(2024);
    expect(stored.getMonth()).toBe(5);
    expect(stored.getDate()).toBe(2);
  });

  it('treats a blank note as no note and allows a same-day backfill', () => {
    const log = buildPastHikeLog({
      trailId: 'trail-tam',
      hikedOn: now,
      hours: 0,
      minutes: 0,
      notes: '   ',
      now,
    });
    expect(log?.notes).toBeNull();
    expect(log?.duration_seconds).toBe(0);
    expect(log?.created_at).toBe(hikeTimestamp(now));
  });

  it('rejects a future day and a missing trail', () => {
    expect(
      buildPastHikeLog({
        trailId: 'trail-tam',
        hikedOn: new Date(2026, 9, 3),
        hours: 1,
        minutes: 0,
        notes: '',
        now,
      }),
    ).toBeNull();
    expect(
      buildPastHikeLog({
        trailId: '',
        hikedOn: now,
        hours: 1,
        minutes: 0,
        notes: '',
        now,
      }),
    ).toBeNull();
  });

  it('ignores negative duration parts', () => {
    expect(durationFromParts(-2, -30)).toBe(0);
  });

  it('keeps a hike when only the trail and date are set', () => {
    const log = buildPastHikeLog({
      trailId: 'trail-mission',
      hikedOn: new Date(2024, 0, 4),
      now,
    });
    expect(log).toMatchObject({
      trail_id: 'trail-mission',
      duration_seconds: 0,
      notes: null,
      photos: [],
      distance_km: null,
      terrain: [],
      conditions: [],
      difficulty: null,
      hike_type: null,
    });
  });

  it('stores optional distance, terrain, conditions, effort, type, and photos', () => {
    const log = buildPastHikeLog({
      trailId: 'trail-mission',
      hikedOn: new Date(2024, 0, 4),
      distanceKm: 9.8,
      terrain: ['rock'],
      conditions: ['windy'],
      difficulty: 'hard',
      hikeType: 'hike',
      photos: ['file://ridge.jpg'],
      now,
    });
    expect(log).toMatchObject({
      distance_km: 9.8,
      terrain: ['rock'],
      conditions: ['windy'],
      difficulty: 'hard',
      hike_type: 'hike',
      photos: ['file://ridge.jpg'],
    });
  });

  it('uses the ranking hike type and labels the day', () => {
    expect(suggestHikeType(8.9, 520)).toBe('hike');
    expect(suggestHikeType(23, 400)).toBe('hike');
    expect(suggestHikeType(12, 1060)).toBe('hike');
    expect(suggestHikeType(3, 80)).toBe('hike');
    expect(formatHikeDay(new Date(2026, 8, 27))).toBe('Sun, Sep 27, 2026');
  });
});

describe('a past hike logged for today', () => {
  // 00:30 on a Wednesday: noon today is still in the future.
  const now = new Date(2026, 10, 25, 0, 30, 0);

  it('counts toward this week right away, not from noon', () => {
    const log = buildPastHikeLog({
      trailId: 'trail-tam',
      hikedOn: now,
      hours: 2,
      minutes: 0,
      elevationGainM: 640.4,
      now,
    })!;
    const stamp = new Date(log.created_at);
    expect(stamp.getTime()).toBeLessThanOrEqual(now.getTime());
    // Still today, even though the hike would have started yesterday.
    expect(stamp.getDate()).toBe(25);
    expect(log.elevation_gain_m).toBe(640);

    const progress = weeklyProgress([log], () => undefined, { metric: 'elevation', target: 1000 }, now);
    expect(progress.hikes).toBe(1);
    expect(progress.done).toBe(640);
  });

  it('uses noon unless the hike must have started earlier', () => {
    const evening = new Date(2026, 10, 25, 20, 0, 0);
    const log = buildPastHikeLog({ trailId: 't', hikedOn: evening, hours: 1, now: evening })!;
    expect(new Date(log.created_at).getHours()).toBe(12);
    // Logged at 13:00 for three hours: it began by 10:00.
    const early = new Date(2026, 10, 25, 13, 0, 0);
    const long = buildPastHikeLog({ trailId: 't', hikedOn: early, hours: 3, now: early })!;
    expect(new Date(long.created_at).getHours()).toBe(10);
  });

  it('falls back to the trail climb only when the draft has one', () => {
    const log = buildPastHikeLog({ trailId: 't', hikedOn: new Date(2026, 9, 1), now })!;
    expect(log.elevation_gain_m).toBeNull();
  });
});
