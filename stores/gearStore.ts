import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { GEAR_MAX_LENGTH } from '@/lib/hikeDetails';

/** Like cleanGear, but the saved list keeps up to 30 items. */
function cleanGearList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim().slice(0, GEAR_MAX_LENGTH);
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push(item);
  }
  return out.slice(0, 30);
}

/** Gear you've typed once, kept on this phone as one-tap chips for later hikes. */
interface GearState {
  items: string[];
  remember: (items: string[]) => void;
  forget: (item: string) => void;
}

export const useGearStore = create<GearState>()(
  persist(
    (set) => ({
      items: [],
      // Newest first, the same cleanup the server uses, at most 30 kept.
      remember: (items) => set((state) => ({ items: cleanGearList([...items, ...state.items]) })),
      forget: (item) => set((state) => ({ items: state.items.filter((i) => i.toLowerCase() !== item.toLowerCase()) })),
    }),
    { name: 'apex-gear', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
