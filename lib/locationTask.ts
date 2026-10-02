import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { appendFixes, type LocationFix } from '@/lib/activeHike';
import { backgroundRecordingAvailable } from '@/lib/recordingEnvironment';

export const HIKE_LOCATION_TASK = 'apex-hike-location';

export function toFix(location: Location.LocationObject): LocationFix {
  return {
    longitude: location.coords.longitude,
    latitude: location.coords.latitude,
    altitude: location.coords.altitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}

export function publishLocationObjects(locations: Location.LocationObject[]): void {
  const fixes = locations.map(toFix);
  if (fixes.length === 0) return;
  void appendFixes(fixes);
}

const taskOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  timeInterval: 4000,
  distanceInterval: 5,
  deferredUpdatesInterval: 10000,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Apex',
    notificationBody: 'Apex is recording your hike',
    notificationColor: '#8B9A6D',
  },
};

// Background tasks are native-only. Web uses watchPositionAsync instead.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
    HIKE_LOCATION_TASK,
    ({ data, error }) => {
      if (!error && data?.locations) publishLocationObjects(data.locations);
      return Promise.resolve();
    },
  );
}

let watch: Location.LocationSubscription | null = null;

export async function trackingIsRunning(): Promise<boolean> {
  if (watch) return true;
  if (Platform.OS === 'web') return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(HIKE_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startForegroundWatch(): Promise<void> {
  if (watch) return;
  watch = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 4000,
      distanceInterval: 5,
    },
    (location) => {
      publishLocationObjects([location]);
    },
  );
}

/**
 * Dev builds record with While Using plus the iOS location background mode.
 * Expo Go and web only get the foreground watch. Background APIs throw there.
 */
export async function startRecordingTask(): Promise<void> {
  const background = backgroundRecordingAvailable(
    Platform.OS,
    Constants.executionEnvironment,
  );
  if (!background) {
    await startForegroundWatch();
    return;
  }
  const running = await Location.hasStartedLocationUpdatesAsync(HIKE_LOCATION_TASK).catch(
    () => false,
  );
  if (!running) {
    await Location.startLocationUpdatesAsync(HIKE_LOCATION_TASK, taskOptions);
  }
  watch?.remove();
  watch = null;
}

export async function stopTracking(): Promise<void> {
  watch?.remove();
  watch = null;
  if (Platform.OS === 'web') return;
  const running = await Location.hasStartedLocationUpdatesAsync(HIKE_LOCATION_TASK).catch(
    () => false,
  );
  if (running) {
    await Location.stopLocationUpdatesAsync(HIKE_LOCATION_TASK).catch(() => undefined);
  }
}

/**
 * Launch check. A leftover task with no hike is stopped. An in-progress hike
 * resumes only when permission was already granted — this does not prompt.
 */
export async function reconcileTracking(active: boolean): Promise<void> {
  if (!active) {
    const running = await trackingIsRunning();
    if (running) await stopTracking();
    return;
  }
  if (await trackingIsRunning()) return;
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return;
  try {
    await startRecordingTask();
  } catch {
    await startForegroundWatch();
  }
}
