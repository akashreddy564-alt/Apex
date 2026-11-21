import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_NUDGE_STATE,
  ignoredInARow,
  isGoodHikingDay,
  isStopped,
  nextAt,
  pickVariant,
  planNudges,
  recordOpen,
  recordTap,
  typicalHour,
  withPlan,
  type NudgeContext,
  type NudgeState,
} from './nudges.ts';

// Monday 2026-11-02, 10:00 local.
const MON = new Date('2026-11-02T10:00:00');
const at = (iso: string) => new Date(iso).getTime();
const fixed = () => 0.5;

function ctx(over: Partial<NudgeContext> = {}): NudgeContext {
  return {
    now: MON,
    // Hiked the last three weekends, not yet this week.
    hikeDates: ['2026-11-01T09:00:00', '2026-10-25T09:00:00', '2026-10-18T09:00:00'],
    recording: false,
    lovedTrail: 'Mount Si',
    savedTrail: null,
    forecast: null,
    ...over,
  };
}

const opened: NudgeState = { opens: [at('2026-11-01T20:00:00')], sends: [] };

describe('nextAt', () => {
  it('finds the next weekday at an hour, never now or earlier', () => {
    assert.equal(nextAt(MON, 4, 19).toString(), new Date('2026-11-05T19:00:00').toString());
    assert.equal(nextAt(new Date('2026-11-05T19:00:00'), 4, 19).toString(), new Date('2026-11-12T19:00:00').toString());
  });
});

describe('typicalHour', () => {
  it('uses the most common hour outside quiet time, once there are a few opens', () => {
    const opens = ['2026-10-28T18:10:00', '2026-10-29T18:40:00', '2026-10-30T18:05:00', '2026-10-30T23:00:00'].map(at);
    assert.equal(typicalHour(opens, MON.getTime()), 18);
    assert.equal(typicalHour(opens.slice(0, 2), MON.getTime()), 19);
  });
});

describe('planNudges', () => {
  it('plans Thursday, Saturday morning and a Sunday last call for a 3-week streak', () => {
    const plan = planNudges(opened, ctx(), fixed);
    assert.deepEqual(
      plan.map((p) => [p.kind, p.variant, p.at.getDay(), p.at.getHours()]),
      [
        ['weekend', 'w_loved', 4, 19],
        ['streak', 's_keep', 6, 9],
        ['streak', 's_last', 0, 11],
      ],
    );
    assert.equal(plan[2].title, 'Your 3-week streak ends tonight');
  });

  it('drops the streak reminders once they hike this week', () => {
    const plan = planNudges(opened, ctx({ hikeDates: ['2026-11-03T09:00:00', ...ctx().hikeDates], now: new Date('2026-11-03T12:00:00') }), fixed);
    assert.deepEqual(plan.map((p) => p.kind), ['weekend']);
  });

  it('sends nothing before the first hike', () => {
    assert.deepEqual(planNudges(opened, ctx({ hikeDates: [] })), []);
  });

  it('skips a reminder right after they opened the app', () => {
    const state = { opens: [at('2026-11-05T09:00:00')], sends: [] };
    const plan = planNudges(state, ctx({ now: new Date('2026-11-05T09:00:00') }), fixed);
    assert.ok(!plan.some((p) => p.kind === 'weekend'));
  });

  it('does not tell them to hike into a rainy weekend', () => {
    const rain = { highF: 55, precipPct: 80, code: 61 };
    const plan = planNudges(opened, ctx({ forecast: { saturday: rain, sunday: rain } }), fixed);
    assert.ok(!plan.some((p) => p.kind === 'weekend'));
  });

  it('leads with the weather when the weekend looks good', () => {
    const sunny = { highF: 68.4, precipPct: 5, code: 0 };
    const plan = planNudges(opened, ctx({ forecast: { saturday: sunny, sunday: null }, savedTrail: 'Half Dome' }), fixed);
    const weekend = plan.find((p) => p.kind === 'weekend');
    assert.equal(weekend?.title, 'Saturday looks good');
    assert.equal(weekend?.body, '68° and clear. A good day for Half Dome.');
  });

  it('holds off while they are recording a hike', () => {
    const plan = planNudges(opened, ctx({ now: new Date('2026-11-07T08:00:00'), recording: true }), fixed);
    assert.ok(!plan.some((p) => p.at.getDay() === 6));
  });

  it('sends one goodbye after three ignored reminders, then nothing', () => {
    const sends = ['2026-10-22T19:00:00', '2026-10-24T09:00:00', '2026-10-29T19:00:00'].map((iso) => ({
      kind: 'weekend' as const,
      variant: 'w_plain',
      at: at(iso),
      opened: false,
    }));
    const state: NudgeState = { opens: [at('2026-10-20T19:00:00')], sends };
    assert.equal(ignoredInARow(state, MON.getTime()), 3);
    const plan = planNudges(state, ctx(), fixed);
    assert.deepEqual(plan.map((p) => p.kind), ['farewell']);

    const after = withPlan(state, plan, MON.getTime());
    const later = new Date('2026-11-04T10:00:00');
    assert.equal(isStopped(after, later.getTime()), true);
    assert.deepEqual(planNudges(after, ctx({ now: later })), []);

    // Coming back on their own starts things again.
    const back = recordOpen(after, later.getTime());
    assert.equal(isStopped(back, later.getTime()), false);
    assert.ok(planNudges(back, ctx({ now: later }), fixed).length > 0);
  });

  it('backs off to the single most important reminder after two ignored', () => {
    const sends = ['2026-10-29T19:00:00', '2026-10-31T09:00:00'].map((iso) => ({
      kind: 'weekend' as const,
      variant: 'w_plain',
      at: at(iso),
      opened: false,
    }));
    const plan = planNudges({ opens: [at('2026-10-20T19:00:00')], sends }, ctx(), fixed);
    assert.deepEqual(plan.map((p) => p.variant), ['s_last']);
  });
});

describe('pickVariant', () => {
  const variants = [
    { id: 'a', write: () => ({ title: 'A', body: '' }) },
    { id: 'b', write: () => ({ title: 'B', body: '' }) },
  ];
  const vars = { streak: 1, loved: null, saved: null, goodDay: null };

  it('rests the wording sent last time', () => {
    const sends = [{ kind: 'weekend' as const, variant: 'a', at: 1, opened: false }];
    assert.equal(pickVariant(variants, vars, sends, fixed)?.id, 'b');
  });

  it('favours wording they have opened', () => {
    const sends = [
      { kind: 'weekend' as const, variant: 'a', at: 1, opened: true },
      { kind: 'weekend' as const, variant: 'a', at: 2, opened: true },
      { kind: 'weekend' as const, variant: 'b', at: 3, opened: false },
      { kind: 'weekend' as const, variant: 'b', at: 4, opened: false },
      { kind: 'weekend' as const, variant: 'x', at: 5, opened: false },
    ];
    assert.equal(pickVariant(variants, vars, sends, fixed)?.id, 'a');
  });
});

describe('bookkeeping', () => {
  it('ignores a quick background flip as a new open', () => {
    const once = recordOpen(EMPTY_NUDGE_STATE, 1_000_000);
    assert.equal(recordOpen(once, 1_000_000 + 60_000).opens.length, 1);
  });

  it('marks the tapped reminder as opened', () => {
    const state: NudgeState = { opens: [], sends: [{ kind: 'weekend', variant: 'w_plain', at: 5, opened: false }] };
    assert.equal(recordTap(state, 'w_plain', 10).sends[0].opened, true);
  });

  it('only calls dry, mild days good for hiking', () => {
    assert.equal(isGoodHikingDay({ highF: 70, precipPct: 10, code: 1 }), true);
    assert.equal(isGoodHikingDay({ highF: 97, precipPct: 0, code: 0 }), false);
    assert.equal(isGoodHikingDay(null), false);
  });
});
