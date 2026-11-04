import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { currentHike } from '@/lib/activeHike';
import { forecastUrl, hikingArea, weekendFromResponse } from '@/lib/forecast';
import {
  EMPTY_NUDGE_STATE,
  planNudges,
  recordOpen,
  recordTap,
  withPlan,
  type NudgeContext,
  type NudgeState,
} from '@/lib/nudges';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useSavedTrails } from '@/stores/savedTrailsStore';
import { useTrailCache } from '@/stores/trailCache';

const STATE_KEY = 'apex-nudges';
const FORECAST_KEY = 'apex-forecast';
const ASK_KEY = 'apex-notification-ask';
/** Weather is re-fetched at most this often. */
const FORECAST_TTL_MS = 6 * 3_600_000;
/** "Not now" on the ask card hides it this long. */
const ASK_SNOOZE_MS = 21 * 86_400_000;

export const supported = Platform.OS === 'ios' || Platform.OS === 'android';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function loadState(): Promise<NudgeState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<NudgeState>) : null;
    return {
      opens: Array.isArray(parsed?.opens) ? parsed.opens.filter((n) => typeof n === 'number') : [],
      sends: Array.isArray(parsed?.sends) ? parsed.sends : [],
    };
  } catch {
    return EMPTY_NUDGE_STATE;
  }
}

async function saveState(state: NudgeState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => undefined);
}

// One read-modify-write at a time, so an open and a tap can't race.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export type NotificationAccess = 'full' | 'quiet' | 'undecided' | 'denied' | 'unsupported';

export async function notificationAccess(): Promise<NotificationAccess> {
  if (!supported) return 'unsupported';
  const status = await Notifications.getPermissionsAsync();
  if (Platform.OS === 'ios') {
    const ios = status.ios?.status;
    if (ios === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'quiet';
    if (ios === Notifications.IosAuthorizationStatus.AUTHORIZED || ios === Notifications.IosAuthorizationStatus.EPHEMERAL)
      return 'full';
    if (ios === Notifications.IosAuthorizationStatus.DENIED) return 'denied';
    return 'undecided';
  }
  if (status.granted) return 'full';
  return status.canAskAgain ? 'undecided' : 'denied';
}

/**
 * iOS "provisional" permission: granted without a prompt. Reminders arrive
 * quietly in Notification Center, where the person can keep or turn them
 * off. Asked once they've logged a first hike, so the first reminder has
 * something real to say.
 */
async function grantQuietly(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: true },
  }).catch(() => undefined);
}

/** The real prompt, from the in-context ask card. */
export async function askForFullAccess(): Promise<NotificationAccess> {
  if (!supported) return 'unsupported';
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  }).catch(() => undefined);
  void refreshNudges();
  return notificationAccess();
}

export async function askSnoozed(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ASK_KEY).catch(() => null);
  const at = raw ? Number(raw) : 0;
  return Number.isFinite(at) && Date.now() - at < ASK_SNOOZE_MS;
}

export async function snoozeAsk(): Promise<void> {
  await AsyncStorage.setItem(ASK_KEY, String(Date.now())).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

interface CachedForecast {
  key: string;
  fetchedAt: number;
  weekend: NudgeContext['forecast'];
}

async function weekendForecast(now: Date): Promise<NudgeContext['forecast']> {
  const { logs, trails } = useTrailCache.getState();
  const area = hikingArea(logs, trails);
  if (!area) return null;
  // Same area and same weekend: reuse.
  const saturday = new Date(now);
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7));
  const key = `${area.lat},${area.lon},${saturday.toDateString()}`;
  try {
    const raw = await AsyncStorage.getItem(FORECAST_KEY);
    const cached = raw ? (JSON.parse(raw) as CachedForecast) : null;
    if (cached?.key === key && now.getTime() - cached.fetchedAt < FORECAST_TTL_MS) return cached.weekend;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(forecastUrl(area), { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) return cached?.key === key ? cached.weekend : null;
    const weekend = weekendFromResponse(await response.json(), now);
    await AsyncStorage.setItem(FORECAST_KEY, JSON.stringify({ key, fetchedAt: now.getTime(), weekend }));
    return weekend;
  } catch {
    // Offline: plan without weather rather than not at all.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

function topLovedTrail(): string | null {
  const rankings = useRankingStore.getState().rankings;
  const trails = useTrailCache.getState().trails;
  const best = rankings
    .filter((row) => row.bucket === 'loved' && row.hike_type === DEFAULT_HIKE_TYPE)
    .sort((a, b) => b.score - a.score)
    .find((row) => trails.some((trail) => trail.id === row.trail_id));
  return best ? (trails.find((trail) => trail.id === best.trail_id)?.name ?? null) : null;
}

/** Where a tapped reminder goes. */
function urlFor(kind: string): string {
  if (kind === 'weekend') {
    const saved = useSavedTrails.getState().saved[0];
    if (saved && useTrailCache.getState().getTrail(saved.trailId)) return `/trail/${saved.trailId}`;
    return '/trails';
  }
  return '/log';
}

/**
 * Rebuild the scheduled reminders from scratch. Runs on every open and every
 * trip to the background, so "already hiked", "just opened" and "mid-hike"
 * are always current.
 */
export function refreshNudges(): Promise<void> {
  if (!supported) return Promise.resolve();
  return serial(async () => {
    const logs = useTrailCache.getState().logs;
    let access = await notificationAccess();
    if (access === 'undecided' && logs.length > 0) {
      await grantQuietly();
      access = await notificationAccess();
    }

    const existing = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    await Promise.all(
      existing
        .filter((request) => request.content.data?.apex === 'nudge')
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)),
    );
    if (access !== 'full' && access !== 'quiet') return;

    const now = new Date();
    const state = await loadState();
    const plan = planNudges(state, {
      now,
      hikeDates: logs.map((log) => log.created_at),
      recording: currentHike() !== null,
      lovedTrail: topLovedTrail(),
      savedTrail: useSavedTrails.getState().saved[0]?.name ?? null,
      forecast: await weekendForecast(now),
    });

    const scheduled = [];
    for (const nudge of plan) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: nudge.title,
            body: nudge.body,
            data: { apex: 'nudge', kind: nudge.kind, variant: nudge.variant, url: urlFor(nudge.kind) },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nudge.at },
        });
        scheduled.push(nudge);
      } catch {
        // One bad slot shouldn't drop the rest.
      }
    }
    await saveState(withPlan(state, scheduled, now.getTime()));
  });
}

export function noteAppOpen(): Promise<void> {
  if (!supported) return Promise.resolve();
  return serial(async () => saveState(recordOpen(await loadState(), Date.now())));
}

/** A reminder was tapped: count it toward that wording, return where to go. */
export function noteTap(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (data?.apex !== 'nudge') return null;
  const variant = typeof data.variant === 'string' ? data.variant : null;
  const tappedAt = response.notification.date || Date.now();
  if (variant) void serial(async () => saveState(recordTap(await loadState(), variant, tappedAt)));
  return typeof data.url === 'string' ? data.url : null;
}

/** Reminders are for when Apex is closed; never banner over the app itself. */
export function installNotificationHandler(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const nudge = notification.request.content.data?.apex === 'nudge';
      return { shouldShowBanner: !nudge, shouldShowList: true, shouldPlaySound: !nudge, shouldSetBadge: false };
    },
  });
}
