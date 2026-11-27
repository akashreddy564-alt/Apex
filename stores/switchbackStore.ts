import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SwitchbackState {
  /** Day ("YYYY-MM-DD") -> seconds it took. On this phone. */
  solved: Record<string, number>;
  /** Days whose result was shared with friends. */
  shared: Record<string, true>;
  record: (day: string, seconds: number) => void;
  markShared: (day: string) => void;
}

function clean(raw: unknown): Pick<SwitchbackState, 'solved' | 'shared'> {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const solved: Record<string, number> = {};
  const shared: Record<string, true> = {};
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (r.solved && typeof r.solved === 'object') {
    for (const [k, v] of Object.entries(r.solved as Record<string, unknown>)) {
      if (day.test(k) && typeof v === 'number' && v > 0 && v < 36000) solved[k] = v;
    }
  }
  if (r.shared && typeof r.shared === 'object') {
    for (const k of Object.keys(r.shared as Record<string, unknown>)) if (day.test(k)) shared[k] = true;
  }
  return { solved, shared };
}

/** Switchback history: which days you solved and how fast. The streak is worked out from it. */
export const useSwitchback = create<SwitchbackState>()(
  persist(
    (set) => ({
      solved: {},
      shared: {},
      // The first solve of a day counts; replays don't overwrite it.
      record: (day, seconds) => set((s) => (s.solved[day] ? s : { solved: { ...s.solved, [day]: seconds } })),
      markShared: (day) => set((s) => ({ shared: { ...s.shared, [day]: true } })),
    }),
    {
      name: 'apex-switchback',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ solved: s.solved, shared: s.shared }),
      merge: (persisted, current) => ({ ...current, ...clean(persisted) }),
    },
  ),
);
