export interface AltitudeSample {
  altitude: number | null;
  latitude: number;
  longitude: number;
}

/**
 * Turns a raw height into the value gain and loss should use.
 * Open Topo Data can implement this later without changing the recorder.
 */
export interface AltitudeCorrector {
  correct(previous: number | null, sample: AltitudeSample): number | null;
}

/** Exponential blend. GPS altitude is noisy and overstates climb if used raw. */
export function gpsBlendCorrector(blend = 0.3): AltitudeCorrector {
  return {
    correct(previous, sample) {
      if (sample.altitude == null || !Number.isFinite(sample.altitude)) return previous;
      if (previous == null) return sample.altitude;
      return previous + blend * (sample.altitude - previous);
    },
  };
}

/**
 * Terrain elevation from Open Topo Data (USGS) is not wired.
 * This returns null so a caller can tell the lookup is still a stub.
 */
export const openTopoDataCorrector: AltitudeCorrector = {
  correct() {
    return null;
  },
};

export const activeAltitudeCorrector = gpsBlendCorrector();
