import { useSettings } from '@/stores/settingsStore';
import { palettes, type Palette } from '@/theme/tokens';

/** The palette for the current appearance. Components repaint when it changes. */
export function useColors(): Palette {
  return palettes[useSettings((s) => s.appearance)];
}
