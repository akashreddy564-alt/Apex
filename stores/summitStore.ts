import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MAX_GUESSES } from '@/lib/summit';

interface SummitState {
  /** Day ("YYYY-MM-DD") -> place ids guessed, in order. On this phone. */
  games: Record<string, string[]>;
  /** Days whose result was shared with friends. */
  shared: Record<string, true>;
  guess: (day: string, placeId: string) => void;
  markShared: (day: string) => void;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function clean(raw: unknown): Pick<SummitState, 'games' | 'shared'> {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const games: Record<string, string[]> = {};
  const shared: Record<string, true> = {};
  if (r.games && typeof r.games === 'object') {
    for (const [k, v] of Object.entries(r.games as Record<string, unknown>)) {
      if (DAY.test(k) && Array.isArray(v)) games[k] = v.filter((x): x is string => typeof x === 'string').slice(0, MAX_GUESSES);
    }
  }
  if (r.shared && typeof r.shared === 'object') {
    for (const k of Object.keys(r.shared as Record<string, unknown>)) if (DAY.test(k)) shared[k] = true;
  }
  return { games, shared };
}

/** Summit history: each day's guesses. Wins, the streak and the score are worked out from it. */
export const useSummit = create<SummitState>()(
  persist(
    (set) => ({
      games: {},
      shared: {},
      guess: (day, placeId) =>
        set((s) => {
          const prev = s.games[day] ?? [];
          if (prev.includes(placeId) || prev.length >= MAX_GUESSES) return s;
          return { games: { ...s.games, [day]: [...prev, placeId] } };
        }),
      markShared: (day) => set((s) => ({ shared: { ...s.shared, [day]: true } })),
    }),
    {
      name: 'apex-summit',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ games: s.games, shared: s.shared }),
      merge: (persisted, current) => ({ ...current, ...clean(persisted) }),
    },
  ),
);
