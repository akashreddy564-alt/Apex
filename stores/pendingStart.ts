import { create } from 'zustand';

/** A request older than this is dropped rather than acted on. */
export const PENDING_START_MAX_AGE_MS = 10_000;

interface PendingStartState {
  pending: { trailId: string; at: number } | null;
  /** Trail detail's slider: ask Log to start recording this trail. */
  request: (trailId: string) => void;
  /** Log: the requested trail id if under 10 s old, else null. Always clears. */
  take: () => string | null;
}

/**
 * One-shot, in-memory hand-off from Trail detail to Log. Not persisted and not
 * reachable from a URL, so only a slide inside the app can start a recording.
 */
export const usePendingStart = create<PendingStartState>()((set, get) => ({
  pending: null,
  request: (trailId) => set({ pending: { trailId, at: Date.now() } }),
  take: () => {
    const pending = get().pending;
    set({ pending: null });
    if (!pending || Date.now() - pending.at > PENDING_START_MAX_AGE_MS) return null;
    return pending.trailId;
  },
}));
