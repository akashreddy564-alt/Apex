import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS !== 'web';

/** Fire and forget. A missing or failing haptic engine never throws. */
function fire(cue: () => unknown): void {
  if (!on) return;
  try {
    void Promise.resolve(cue()).catch(() => {});
  } catch {
    // No haptics here; nothing to do.
  }
}

/** Small, consistent haptic cues. They do nothing on web. */
export const haptics = {
  /** A light tap: presses, toggles. */
  tapLight(): void {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** A firmer tap: a deliberate, weightier press (leaving a group, dropping a pin). */
  tapMedium(): void {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** A selection tick: scrubbing, pickers, detents. */
  select(): void {
    fire(() => Haptics.selectionAsync());
  },
  /** A finished thing: a hike saved, a goal met. */
  success(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
};
