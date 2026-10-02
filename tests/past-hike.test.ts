import { buildPastHikeLog, durationFromParts, hikeTimestamp } from '@/lib/pastHike';

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
});
