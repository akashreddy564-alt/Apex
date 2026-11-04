/**
 * Which reminders to schedule, and when. Pure, so the rules are tested under
 * node. The scheduler (`lib/nudgeScheduler.ts`) re-plans on every app open
 * and every trip to the background, so these rules always see fresh state.
 *
 * Borrowed from how Duolingo runs reminders:
 * - Send at the hour this person usually opens the app, never in quiet hours.
 * - Skip a reminder when they've opened the app recently, are mid-hike, or
 *   already did the thing it asks for.
 * - Rotate the wording, favouring what they've opened before but resting
 *   whatever was sent last (people tune out a repeated message).
 * - Escalate as there's more to lose (a long streak gets a Sunday last call).
 * - After three ignored reminders in a row, send one goodbye and stop until
 *   they come back on their own.
 */

import { weeklyStreak } from './streak.ts';

export type NudgeKind = 'weekend' | 'streak' | 'farewell';

export interface NudgeSend {
  kind: NudgeKind;
  variant: string;
  /** When it was (or will be) delivered, ms. */
  at: number;
  /** Tapped. */
  opened: boolean;
}

export interface NudgeState {
  /** App opens, ms, oldest first. */
  opens: number[];
  sends: NudgeSend[];
}

export const EMPTY_NUDGE_STATE: NudgeState = { opens: [], sends: [] };

export interface DayForecast {
  highF: number;
  /** Highest chance of rain in daylight, 0–100. */
  precipPct: number;
  /** WMO weather code. */
  code: number;
}

export interface NudgeContext {
  now: Date;
  /** Every hike's date, ISO. */
  hikeDates: string[];
  /** Mid-hike right now. */
  recording: boolean;
  /** Their top-ranked trail. */
  lovedTrail: string | null;
  /** The newest trail they saved from a friend's post. */
  savedTrail: string | null;
  /** The coming weekend near their last hike, when known. */
  forecast: { saturday: DayForecast | null; sunday: DayForecast | null } | null;
}

export interface PlannedNudge {
  kind: NudgeKind;
  variant: string;
  title: string;
  body: string;
  at: Date;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Look this far ahead. The plan is rebuilt long before it runs out. */
const HORIZON_MS = 8 * DAY_MS;
/** An app open this close before a reminder makes it pointless. */
const RECENT_OPEN_MS = 12 * HOUR_MS;
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;
export const DEFAULT_HOUR = 19;
/** Reminders ignored in a row before the goodbye. */
export const IGNORED_LIMIT = 3;
const KEEP_OPENS = 60;
const KEEP_SENDS = 60;

// ---------------------------------------------------------------------------
// State bookkeeping
// ---------------------------------------------------------------------------

export function recordOpen(state: NudgeState, at: number): NudgeState {
  const last = state.opens[state.opens.length - 1];
  // A quick background/foreground flip isn't a new open.
  if (last !== undefined && at - last < 10 * 60_000) return state;
  return { ...state, opens: [...state.opens, at].slice(-KEEP_OPENS) };
}

export function recordTap(state: NudgeState, variant: string, at: number): NudgeState {
  // The tapped one is the newest delivered send with that variant.
  let index = -1;
  state.sends.forEach((send, i) => {
    if (send.variant === variant && send.at <= at) index = i;
  });
  if (index < 0) return state;
  return { ...state, sends: state.sends.map((send, i) => (i === index ? { ...send, opened: true } : send)) };
}

/** Drop what hasn't been delivered (it's about to be re-planned), add the new plan. */
export function withPlan(state: NudgeState, plan: PlannedNudge[], now: number): NudgeState {
  const delivered = state.sends.filter((send) => send.at <= now);
  const planned = plan.map((p) => ({ kind: p.kind, variant: p.variant, at: p.at.getTime(), opened: false }));
  return { ...state, sends: [...delivered, ...planned].slice(-KEEP_SENDS) };
}

function lastOpen(state: NudgeState): number {
  return state.opens[state.opens.length - 1] ?? 0;
}

/** Delivered since they last opened the app, so nobody acted on them. */
export function ignoredInARow(state: NudgeState, now: number): number {
  const since = lastOpen(state);
  return state.sends.filter((send) => send.at > since && send.at <= now && !send.opened).length;
}

/** The goodbye went out and they haven't been back since. */
export function isStopped(state: NudgeState, now: number): boolean {
  const since = lastOpen(state);
  return state.sends.some((send) => send.kind === 'farewell' && send.at > since && send.at <= now);
}

/**
 * The hour they usually open Apex, from the last couple of months. Only hours
 * outside quiet time count; ties go to the later hour (evenings plan weekends).
 */
export function typicalHour(opens: number[], now: number): number {
  const counts = new Map<number, number>();
  for (const at of opens) {
    if (now - at > 60 * DAY_MS) continue;
    const hour = new Date(at).getHours();
    if (hour < QUIET_END_HOUR || hour >= QUIET_START_HOUR) continue;
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let best = DEFAULT_HOUR;
  let bestCount = 0;
  for (const [hour, count] of counts) {
    if (count > bestCount || (count === bestCount && hour > best)) {
      best = hour;
      bestCount = count;
    }
  }
  return bestCount >= 3 ? best : DEFAULT_HOUR;
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

/** Dry and pleasant enough that "go hike" isn't a bad suggestion. */
export function isGoodHikingDay(day: DayForecast | null): day is DayForecast {
  return !!day && day.precipPct < 35 && day.highF >= 45 && day.highF <= 92 && day.code <= 3;
}

function sky(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'mostly sunny';
  return 'dry';
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

interface Vars {
  streak: number;
  loved: string | null;
  saved: string | null;
  goodDay: { name: 'Saturday' | 'Sunday'; day: DayForecast } | null;
}

interface Variant {
  id: string;
  /** Null when this wording can't be filled in. */
  write: (v: Vars) => { title: string; body: string } | null;
}

const WEEKEND: Variant[] = [
  {
    id: 'w_weather',
    write: ({ goodDay, saved, loved }) =>
      goodDay
        ? {
            title: `${goodDay.name} looks good`,
            body: `${Math.round(goodDay.day.highF)}° and ${sky(goodDay.day.code)}.${
              saved ? ` A good day for ${saved}.` : loved ? ` Back to ${loved}, or something new?` : ' Pick a trail tonight.'
            }`,
          }
        : null,
  },
  {
    id: 'w_saved',
    write: ({ saved }) => (saved ? { title: 'Weekend plans?', body: `You saved ${saved}. This could be the weekend.` } : null),
  },
  {
    id: 'w_loved',
    write: ({ loved }) =>
      loved ? { title: 'Weekend plans?', body: `${loved} is still your top trail. Find one to beat it.` } : null,
  },
  {
    id: 'w_plain',
    write: () => ({ title: 'The weekend’s almost here', body: 'Pick a trail tonight and you’re halfway out the door.' }),
  },
];

const STREAK: Variant[] = [
  {
    id: 's_keep',
    write: ({ streak }) => ({ title: `Keep your ${streak}-week streak`, body: 'Any hike this weekend counts, even a short one.' }),
  },
  {
    id: 's_next',
    write: ({ streak }) => ({ title: `${streak} weeks in a row`, body: `Make it ${streak + 1}. A short loop counts.` }),
  },
];

const LAST_CALL: Variant = {
  id: 's_last',
  write: ({ streak }) => ({
    title: `Your ${streak}-week streak ends tonight`,
    body: 'There’s still time. A short walk on a trail counts.',
  }),
};

const FAREWELL: Variant = {
  id: 'farewell',
  write: () => ({
    title: 'We’ll stop the reminders',
    body: 'They don’t seem to be helping. Your trails and rankings will be here when you’re ready.',
  }),
};

/**
 * Pick the wording: the one they've opened most (smoothed so new ones get a
 * chance), resting whatever went out last. A simplified version of
 * Duolingo's "recovering bandit".
 */
export function pickVariant(
  variants: Variant[],
  vars: Vars,
  sends: NudgeSend[],
  random: () => number,
): { id: string; title: string; body: string } | null {
  const recent = sends.slice(-6).map((send) => send.variant);
  let best: { id: string; title: string; body: string; score: number } | null = null;
  for (const variant of variants) {
    const text = variant.write(vars);
    if (!text) continue;
    const mine = sends.filter((send) => send.variant === variant.id);
    const rate = (mine.filter((send) => send.opened).length + 1) / (mine.length + 2);
    const lastUse = recent.lastIndexOf(variant.id);
    const rest = lastUse < 0 ? 1 : lastUse === recent.length - 1 ? 0.25 : 0.6;
    const score = rate * rest * (0.9 + random() * 0.2);
    if (!best || score > best.score) best = { id: variant.id, ...text, score };
  }
  return best ? { id: best.id, title: best.title, body: best.body } : null;
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

/** The next `weekday` (0 = Sunday) at `hour`, strictly after `from`. */
export function nextAt(from: Date, weekday: number, hour: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hour, 0, 0, 0);
  at.setDate(at.getDate() + ((weekday - at.getDay() + 7) % 7));
  if (at.getTime() <= from.getTime()) at.setDate(at.getDate() + 7);
  return at;
}

function clampHour(hour: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, hour));
}

export function planNudges(state: NudgeState, ctx: NudgeContext, random: () => number = Math.random): PlannedNudge[] {
  const now = ctx.now.getTime();
  // Nothing before their first hike: the reminders lean on what they've done.
  if (ctx.hikeDates.length === 0 || isStopped(state, now)) return [];

  const hour = typicalHour(state.opens, now);
  const ignored = ignoredInARow(state, now);

  if (ignored >= IGNORED_LIMIT) {
    const tomorrow = new Date(ctx.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const at = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), clampHour(hour, 9, 20));
    const text = FAREWELL.write({ streak: 0, loved: null, saved: null, goodDay: null })!;
    return [{ kind: 'farewell', variant: FAREWELL.id, ...text, at }];
  }

  const candidates: { kind: NudgeKind; at: Date; variants: Variant[]; vars: Vars; priority: number }[] = [];
  const base = { loved: ctx.lovedTrail, saved: ctx.savedTrail };

  // Thursday evening: plan the weekend. Skipped when the forecast says rain.
  const thursday = nextAt(ctx.now, 4, clampHour(hour, 17, 20));
  const forecast = ctx.forecast;
  const goodDay = forecast
    ? isGoodHikingDay(forecast.saturday)
      ? { name: 'Saturday' as const, day: forecast.saturday }
      : isGoodHikingDay(forecast.sunday)
        ? { name: 'Sunday' as const, day: forecast.sunday }
        : null
    : null;
  if (!forecast || goodDay) {
    candidates.push({
      kind: 'weekend',
      at: thursday,
      variants: goodDay ? WEEKEND : WEEKEND.filter((v) => v.id !== 'w_weather'),
      vars: { ...base, streak: 0, goodDay },
      priority: 1,
    });
  }

  // Saturday morning: the streak needs a hike this week.
  const saturday = nextAt(ctx.now, 6, 9);
  const satStreak = weeklyStreak(ctx.hikeDates, saturday);
  if (satStreak.atRisk) {
    candidates.push({ kind: 'streak', at: saturday, variants: STREAK, vars: { ...base, streak: satStreak.weeks, goodDay: null }, priority: 2 });
  }

  // Sunday last call, only once a streak is worth saving.
  const sunday = nextAt(ctx.now, 0, 11);
  const sunStreak = weeklyStreak(ctx.hikeDates, sunday);
  if (sunStreak.atRisk && sunStreak.weeks >= 3) {
    candidates.push({ kind: 'streak', at: sunday, variants: [LAST_CALL], vars: { ...base, streak: sunStreak.weeks, goodDay: null }, priority: 3 });
  }

  const lastOpenAt = lastOpen(state);
  const usable = candidates.filter(({ at }) => {
    const t = at.getTime();
    if (t - now > HORIZON_MS || t - now < 5 * 60_000) return false;
    if (at.getHours() < QUIET_END_HOUR || at.getHours() >= QUIET_START_HOUR) return false;
    // They were just here. Re-planned on every open, so this stays current.
    if (t - lastOpenAt < RECENT_OPEN_MS) return false;
    // Don't buzz someone on the trail.
    if (ctx.recording && t - now < RECENT_OPEN_MS) return false;
    return true;
  });

  // Two ignored in a row: only the one that matters most.
  const chosen = ignored >= 2 ? usable.sort((a, b) => b.priority - a.priority).slice(0, 1) : usable;

  const plan: PlannedNudge[] = [];
  let sends = state.sends;
  for (const candidate of chosen.sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const text = pickVariant(candidate.variants, candidate.vars, sends, random);
    if (!text) continue;
    plan.push({ kind: candidate.kind, variant: text.id, title: text.title, body: text.body, at: candidate.at });
    sends = [...sends, { kind: candidate.kind, variant: text.id, at: candidate.at.getTime(), opened: false }];
  }
  return plan;
}
