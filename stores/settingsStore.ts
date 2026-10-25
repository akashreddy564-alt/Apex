import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseSettings, type Appearance, type ScoreStyle, type Settings } from '@/lib/appearance';

interface SettingsState extends Settings {
  setAppearance: (appearance: Appearance) => void;
  setScoreStyle: (scoreStyle: ScoreStyle) => void;
}

/** Personal display settings. They change only how this phone shows things. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...parseSettings(undefined),
      setAppearance: (appearance) => set({ appearance }),
      setScoreStyle: (scoreStyle) => set({ scoreStyle }),
    }),
    {
      name: 'apex-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ appearance: state.appearance, scoreStyle: state.scoreStyle }),
      merge: (persisted, current) => ({ ...current, ...parseSettings(persisted) }),
    },
  ),
);
