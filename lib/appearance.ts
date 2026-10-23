export type Appearance = 'dark' | 'light';
export type ScoreStyle = 'number' | 'peak' | 'blaze';

export interface Settings {
  appearance: Appearance;
  scoreStyle: ScoreStyle;
}

const APPEARANCES: readonly Appearance[] = ['dark', 'light'];
const SCORE_STYLES: readonly ScoreStyle[] = ['number', 'peak', 'blaze'];

/** Stored settings from any older or broken build, with each bad field reset to its default. */
export function parseSettings(raw: unknown): Settings {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const appearance = APPEARANCES.find((v) => v === record.appearance) ?? 'dark';
  const scoreStyle = SCORE_STYLES.find((v) => v === record.scoreStyle) ?? 'number';
  return { appearance, scoreStyle };
}

/**
 * Tell native pickers, keyboards and alerts which scheme to use.
 * React Native Web has no `setColorScheme`, so this skips it there.
 */
export function applyNativeScheme(
  appearance: Appearance,
  api: { setColorScheme?: (scheme: Appearance) => void },
): void {
  if (typeof api.setColorScheme === 'function') api.setColorScheme(appearance);
}
