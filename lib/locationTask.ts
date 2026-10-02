import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const HIKE_LOCATION_TASK = 'apex-hike-location';

export interface LocationFix {
  longitude: number;
  latitude: number;
  altitude: number | null;
  timestamp: number;
}

type Listener = (fixes: LocationFix[]) => void;

const listeners = new Set<Listener>();

export function subscribeLocationFixes(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(fixes: LocationFix[]) {
  if (fixes.length === 0) return;
  listeners.forEach((listener) => listener(fixes));
}

export function publishLocationObjects(locations: Location.LocationObject[]) {
  publish(
    locations.map((location) => ({
      longitude: location.coords.longitude,
      latitude: location.coords.latitude,
      altitude: location.coords.altitude,
      timestamp: location.timestamp,
    })),
  );
}

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
