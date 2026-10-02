import AsyncStorage from '@react-native-async-storage/async-storage';

import { activeAltitudeCorrector } from '@/lib/altitude';
import { haversineMeters } from '@/lib/geo';
import { applyAltitudeStep } from '@/lib/hikeStats';

const KEY = 'apex-active-hike';

/** Fixes worse than this are noise, not trail. */
export const ACCURACY_MAX_M = 25;
/** Smoothed climb must clear this before it counts as gain. */
export const GAIN_THRESHOLD_M = 3;

export interface LocationFix {
  longitude: number;
  latitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface PersistedHike {
  trailId: string;
  startedAt: number;
  notes: string;
  photos: string[];
  points: LocationFix[];
  pausedAt: number | null;
  pausedMs: number;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  /** Wall clock of the last successful disk write. */
  savedAt: number;
  smoothedAltitude: number | null;
  /** Valley the next climb is measured from. */
  gainBaseline: number | null;
}

type Listener = (hike: PersistedHike | null) => void;

const listeners = new Set<Listener>();
let memory: PersistedHike | null | undefined;
let chain: Promise<unknown> = Promise.resolve();

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function subscribeHike(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(hike: PersistedHike | null) {
  listeners.forEach((listener) => listener(hike));
}

async function readDisk(): Promise<PersistedHike | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as PersistedHike;
  if (!parsed || typeof parsed.trailId !== 'string' || !Array.isArray(parsed.points)) return null;
  return parsed;
}

async function writeDisk(hike: PersistedHike | null): Promise<void> {
  if (!hike) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(hike));
}

export function hydrateHike(): Promise<PersistedHike | null> {
  return serialized(async () => {
    if (memory !== undefined) return memory;
    try {
      memory = await readDisk();
    } catch {
      memory = null;
    }
    return memory;
  });
}

async function commit(hike: PersistedHike | null): Promise<PersistedHike | null> {
  const next = hike ? { ...hike, savedAt: Date.now() } : null;
  memory = next;
  await writeDisk(next);
  emit(next);
  return next;
}

export function startHike(trailId: string): Promise<PersistedHike> {
  return serialized(async () => {
    const hike: PersistedHike = {
      trailId,
      startedAt: Date.now(),
      notes: '',
      photos: [],
      points: [],
      pausedAt: null,
      pausedMs: 0,
      distanceM: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      savedAt: Date.now(),
      smoothedAltitude: null,
      gainBaseline: null,
    };
    await commit(hike);
    return hike;
  });
}

export function updateHike(
  update: (hike: PersistedHike) => PersistedHike,
): Promise<PersistedHike | null> {
  return serialized(async () => {
    await ensureMemory();
    if (!memory) return null;
    return commit(update(memory));
  });
}

async function ensureMemory(): Promise<void> {
  if (memory !== undefined) return;
  try {
    memory = await readDisk();
  } catch {
    memory = null;
  }
}

export function pauseHike(): Promise<PersistedHike | null> {
  return serialized(async () => {
    await ensureMemory();
    if (!memory || memory.pausedAt != null) return memory ?? null;
    return commit({ ...memory, pausedAt: Date.now() });
  });
}

export function resumeHike(): Promise<PersistedHike | null> {
  return serialized(async () => {
    await ensureMemory();
    if (!memory || memory.pausedAt == null) return memory ?? null;
    const pausedMs = memory.pausedMs + Math.max(0, Date.now() - memory.pausedAt);
    return commit({ ...memory, pausedAt: null, pausedMs });
  });
}

export function clearHike(): Promise<null> {
  return serialized(async () => {
    await commit(null);
    return null;
  });
}

export function currentHike(): PersistedHike | null {
  return memory ?? null;
}

/** Apply one fix onto running totals. Low-accuracy points are dropped. */
export function applyFix(hike: PersistedHike, fix: LocationFix): PersistedHike {
  if (hike.pausedAt != null) return hike;
  if (fix.accuracy != null && fix.accuracy > ACCURACY_MAX_M) return hike;
  const last = hike.points[hike.points.length - 1];
  if (last && last.timestamp === fix.timestamp) return hike;

  let distanceM = hike.distanceM;
  if (last) distanceM += haversineMeters(last, fix);

  const smoothedAltitude = activeAltitudeCorrector.correct(hike.smoothedAltitude, {
    altitude: fix.altitude,
    latitude: fix.latitude,
    longitude: fix.longitude,
  });
  const climb = applyAltitudeStep(
    {
      elevationGainM: hike.elevationGainM,
      elevationLossM: hike.elevationLossM ?? 0,
      baseline: hike.gainBaseline,
    },
    smoothedAltitude,
    GAIN_THRESHOLD_M,
  );

  return {
    ...hike,
    points: [...hike.points, fix],
    distanceM,
    elevationGainM: climb.elevationGainM,
    elevationLossM: climb.elevationLossM,
    smoothedAltitude,
    gainBaseline: climb.baseline,
  };
}

export function appendFixes(fixes: LocationFix[]): Promise<PersistedHike | null> {
  return serialized(async () => {
    await ensureMemory();
    if (!memory) return null;
    let next = memory;
    for (const fix of fixes) next = applyFix(next, fix);
    if (next === memory) return memory;
    return commit(next);
  });
}

export function elapsedSeconds(hike: PersistedHike, now = Date.now()): number {
  const openPause = hike.pausedAt == null ? 0 : Math.max(0, now - hike.pausedAt);
  return Math.max(0, Math.floor((now - hike.startedAt - hike.pausedMs - openPause) / 1000));
}
