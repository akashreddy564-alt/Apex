import { onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/**
 * Knowing when we're offline without a native network module. A request
 * that fails to reach the network marks the app offline; TanStack Query then
 * pauses writes instead of failing them. While offline we ping Supabase's
 * health endpoint every 15 s and whenever the app comes to the foreground.
 * The first answer of any kind (even 401) means we're back, and paused
 * writes go out in order.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const PROBE_EVERY_MS = 15_000;
const PROBE_TIMEOUT_MS = 4_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let probing = false;

async function probe(): Promise<void> {
  if (probing || !url) return;
  probing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, signal: controller.signal });
    stop();
    onlineManager.setOnline(true);
  } catch {
    schedule();
  } finally {
    clearTimeout(timeout);
    probing = false;
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void probe(), PROBE_EVERY_MS);
}

function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
}

// Back online by any route (a ping, the browser, a test): stop pinging.
onlineManager.subscribe((online) => {
  if (online) stop();
});

/** Call when a request couldn't reach the network. */
export function markOffline(): void {
  if (!onlineManager.isOnline()) return;
  onlineManager.setOnline(false);
  schedule();
}

/** Native has no `online` event; the browser keeps TanStack's default listener. */
export function watchConnectivity(): void {
  if (Platform.OS === 'web') return;
  onlineManager.setEventListener(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !onlineManager.isOnline()) void probe();
    });
    return () => sub.remove();
  });
}
