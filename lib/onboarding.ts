/**
 * First-launch onboarding: how far you usually hike (sets the goal's
 * default), a weekly goal, and what you hike for. Pure, so it runs under
 * node tests. Distances show in miles and feet like the rest of the app.
 */

export type DistanceBand = 'short' | 'medium' | 'long';

export const DISTANCE_BANDS: readonly { value: DistanceBand; label: string; hint: string }[] = [
  { value: 'short', label: 'Under 5 mi', hint: 'Lake loops and after-work walks' },
  { value: 'medium', label: '5 to 10 mi', hint: 'Most day hikes' },
  { value: 'long', label: '10+ mi', hint: 'Big days and summits' },
];

/** Goal suggestions per band, in display units (miles, feet). Each is one of `GOAL_PRESETS`. */
const SUGGESTED: Record<DistanceBand, { distance: number; elevation: number }> = {
  short: { distance: 5, elevation: 1000 },
  medium: { distance: 10, elevation: 3000 },
  long: { distance: 15, elevation: 5000 },
};

export function suggestedGoal(band: DistanceBand | null, metric: 'distance' | 'elevation'): number {
  return SUGGESTED[band ?? 'medium'][metric];
}

export const INTERESTS = [
  'Summits',
  'Lakes',
  'Waterfalls',
  'Big views',
  'Forests',
  'Wildflowers',
  'Solitude',
  'Dog-friendly',
  'Trail running',
  'Desert',
] as const;
export type Interest = (typeof INTERESTS)[number];

export function toggleInterest(list: readonly Interest[], item: Interest): Interest[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

export interface OnboardingAnswers {
  /** Onboarding reached the sign-up step (or was skipped there); it doesn't show again. */
  seen: boolean;
  band: DistanceBand | null;
  interests: Interest[];
}

export function parseOnboarding(raw: unknown): OnboardingAnswers {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const band = DISTANCE_BANDS.find((b) => b.value === r.band)?.value ?? null;
  const interests = Array.isArray(r.interests)
    ? (INTERESTS.filter((i) => (r.interests as unknown[]).includes(i)) as Interest[])
    : [];
  return { seen: r.seen === true, band, interests };
}

/** Steps in order. The last one is sign-up, which can always be skipped. */
export const ONBOARDING_STEPS = ['distance', 'goal', 'interests', 'account'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
