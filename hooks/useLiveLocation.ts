import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { currentHike } from '@/lib/activeHike';
import {
  reconcileTracking,
  startBackgroundTask,
  startForegroundWatch,
  stopTracking,
} from '@/lib/locationTask';

interface UseLiveLocationResult {
  message: string | null;
  background: boolean;
  enableBackground: () => void;
}

/**
 * Keeps the native watch alive for the persisted hike. Unmounting the Log
 * screen does not stop it. Background permission is requested only after the
 * hiker accepts the explainer.
 */
export function useLiveLocation(active: boolean, paused: boolean): UseLiveLocationResult {
  const [message, setMessage] = useState<string | null>(null);
  const [background, setBackground] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!active || paused) {
        await stopTracking();
        if (!cancelled) setBackground(false);
        return;
      }

      try {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !currentHike() || currentHike()?.pausedAt) return;
        if (!foreground.granted) {
          setMessage('Location is off. The timer still runs.');
          return;
        }
        if (Platform.OS !== 'web') {
          const already = await Location.getBackgroundPermissionsAsync();
          if (already.granted) {
            await startBackgroundTask();
            if (!cancelled) {
              setBackground(true);
              setMessage(null);
            }
            return;
          }
        }
        await startForegroundWatch();
        if (cancelled) return;
        setBackground(false);
        if (Platform.OS === 'web') {
          setMessage('Browser location. Background tracking needs the native app.');
        }
      } catch {
        if (!cancelled) setMessage('Location is unavailable. The timer still runs.');
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [active, paused]);

  const enableBackground = useCallback(() => {
    if (Platform.OS === 'web' || !active || paused) return;
    void (async () => {
      const permission = await Location.requestBackgroundPermissionsAsync();
      if (!permission.granted) {
        setMessage('Background location stays off. The path records while Apex is open.');
        setBackground(false);
        return;
      }
      try {
        await startBackgroundTask();
        setBackground(true);
        setMessage(null);
      } catch {
        setMessage('Background location did not start. Recording continues in the foreground.');
        setBackground(false);
      }
    })();
  }, [active, paused]);

  return { message, background, enableBackground };
}
