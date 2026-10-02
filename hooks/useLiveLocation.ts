import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  HIKE_LOCATION_TASK,
  subscribeLocationFixes,
  publishLocationObjects,
} from '@/lib/locationTask';
import type { TrackPoint } from '@/hooks/useTrailTracker';

interface UseLiveLocationResult {
  message: string | null;
  background: boolean;
}

/**
 * Records a hike path. Native builds with background permission use a
 * location task so updates continue with the screen off. Web and any
 * failed background start fall back to a foreground watch.
 */
export function useLiveLocation(
  active: boolean,
  addPoint: (point: TrackPoint) => void,
): UseLiveLocationResult {
  const [message, setMessage] = useState<string | null>(null);
  const [background, setBackground] = useState(false);

  useEffect(() => {
    if (!active) {
      setMessage(null);
      setBackground(false);
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    let usedTask = false;

    const unsubscribe = subscribeLocationFixes((fixes) => {
      fixes.forEach(addPoint);
    });

    const start = async () => {
      try {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!foreground.granted) {
          setMessage('Location is off. The timer still runs.');
          return;
        }

        if (Platform.OS !== 'web') {
          const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
          if (!cancelled && backgroundPermission.granted) {
            try {
              await Location.startLocationUpdatesAsync(HIKE_LOCATION_TASK, {
                accuracy: Location.Accuracy.High,
                timeInterval: 4000,
                distanceInterval: 5,
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                  notificationTitle: 'Apex',
                  notificationBody: 'Recording hike',
                  notificationColor: '#8B9A6D',
                },
              });
              if (cancelled) {
                await Location.stopLocationUpdatesAsync(HIKE_LOCATION_TASK).catch(
                  () => undefined,
                );
                return;
              }
              usedTask = true;
              setBackground(true);
            } catch {
              setBackground(false);
            }
          }
        }

        if (cancelled || usedTask) return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (location) => {
            publishLocationObjects([location]);
          },
        );
        if (cancelled) {
          subscription.remove();
          subscription = null;
          return;
        }
        if (Platform.OS === 'web') {
          setMessage('Browser location. Background tracking needs the native app.');
        }
      } catch {
        if (!cancelled) setMessage('Location is unavailable. The timer still runs.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe();
      subscription?.remove();
      if (usedTask) {
        void Location.stopLocationUpdatesAsync(HIKE_LOCATION_TASK).catch(() => undefined);
      }
    };
  }, [active, addPoint]);

  return { message, background };
}
