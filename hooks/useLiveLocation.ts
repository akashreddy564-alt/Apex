import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { currentHike } from '@/lib/activeHike';
import { startForegroundWatch, startRecordingTask, stopTracking } from '@/lib/locationTask';
import { backgroundRecordingAvailable } from '@/lib/recordingEnvironment';

interface UseLiveLocationResult {
  message: string | null;
}

/**
 * Keeps the recording task alive for the persisted hike. Unmounting Log does
 * not stop it. Permission is While Using only; the explainer is what asks.
 */
export function useLiveLocation(active: boolean, paused: boolean): UseLiveLocationResult {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!active || paused) {
        await stopTracking();
        return;
      }

      try {
        const foreground = await Location.getForegroundPermissionsAsync();
        if (cancelled || !currentHike() || currentHike()?.pausedAt) return;
        if (!foreground.granted) {
          setMessage('Location is off. The timer still runs.');
          return;
        }
        await startRecordingTask();
        if (!cancelled) {
          const background = backgroundRecordingAvailable(
            Platform.OS,
            Constants.executionEnvironment,
          );
          setMessage(
            background
              ? null
              : 'Recording while Apex is open. A dev build can keep recording with the screen locked.',
          );
        }
      } catch {
        try {
          await startForegroundWatch();
          if (!cancelled) {
            setMessage('Recording while Apex is open. Lock-screen tracking did not start.');
          }
        } catch {
          if (!cancelled) setMessage('Location is unavailable. The timer still runs.');
        }
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [active, paused]);

  return { message };
}
