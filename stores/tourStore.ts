import { create } from 'zustand';

import type { Rect } from '@/lib/tourLayout';

export type TourKey = 'week' | 'slider' | 'social';

interface TourState {
  /** The thing the tour is pointing at now, or null when no tour runs. */
  active: TourKey | null;
  rects: Partial<Record<TourKey, Rect>>;
  setActive: (key: TourKey | null) => void;
  setRect: (key: TourKey, rect: Rect) => void;
}

/** Where the tour's targets sit on screen, measured by the targets themselves. */
export const useTour = create<TourState>()((set) => ({
  active: null,
  rects: {},
  setActive: (active) => set({ active }),
  setRect: (key, rect) => set((s) => ({ rects: { ...s.rects, [key]: rect } })),
}));
