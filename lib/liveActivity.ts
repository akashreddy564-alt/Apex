import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { subscribeHike, type PersistedHike } from '@/lib/activeHike';
import { activityProps, shouldPush, type ActivityProps } from '@/lib/liveActivityPlan';
import { useTrailCache } from '@/stores/trailCache';
import type { HikeActivityProps } from '@/widgets/HikeActivity';

type Factory = import('expo-widgets').LiveActivityFactory<HikeActivityProps>;
type Instance = import('expo-widgets').LiveActivity<HikeActivityProps>;

let factory: Factory | null | undefined;

/**
 * The Live Activity factory, or null where there isn't one: Android, web, and
 * app builds made before the widget extension was added. The widget module is
 * only loaded once we know its native side exists, since loading it on an
 * older build throws.
 */
function load(): Factory | null {
  if (factory !== undefined) return factory;
  factory = null;
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = (require('@/widgets/HikeActivity') as { default: Factory }).default;
  } catch {
    factory = null;
  }
  return factory;
}

let instance: Instance | null = null;
let shown: ActivityProps | null = null;
let lastPushAt = 0;
let chain: Promise<void> = Promise.resolve();

function trailName(trailId: string): string {
  return useTrailCache.getState().trails.find((t) => t.id === trailId)?.name ?? 'Hike';
}

async function sync(hike: PersistedHike | null): Promise<void> {
  const live = load();
  if (!live) return;
  try {
    if (!hike) {
      const open = instance ? [instance] : live.getInstances();
      instance = null;
      shown = null;
      await Promise.all(open.map((activity) => activity.end('immediate')));
      return;
    }
    const now = Date.now();
    const next = activityProps(hike, trailName(hike.trailId), now);
    if (!instance) {
      // After a restart mid-hike, pick the running one back up instead of starting a second.
      const [existing, ...extra] = live.getInstances();
      await Promise.all(extra.map((activity) => activity.end('immediate')));
      if (existing) {
        instance = existing;
        shown = null;
      } else {
        instance = live.start(next, 'apex://log');
        shown = next;
        lastPushAt = now;
        return;
      }
    }
    if (!shouldPush(shown, next, lastPushAt, now)) return;
    await instance.update(next);
    shown = next;
    lastPushAt = now;
  } catch {
    // Live Activities switched off in Settings, or the system said no. Recording goes on.
  }
}

function enqueue(hike: PersistedHike | null): void {
  chain = chain.then(() => sync(hike));
}

/**
 * Keeps the Lock Screen and Dynamic Island in step with the hike being
 * recorded: starts with the hike, updates as it moves, ends when it's saved or
 * discarded. `initial` is the saved hike read at launch.
 */
export function startLiveActivitySync(initial: Promise<PersistedHike | null>): () => void {
  if (Platform.OS !== 'ios') return () => undefined;
  void initial.then(enqueue);
  return subscribeHike(enqueue);
}
