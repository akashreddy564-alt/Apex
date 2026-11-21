import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS !== 'web';

/** Small, consistent haptic cues. They do nothing on web. */
export const haptics = {
  /** A light tap: presses, toggles. */
  tapLight(): void {
    if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** A selection tick: scrubbing, pickers, detents. */
  select(): void {
    if (on) void Haptics.selectionAsync().catch(() => {});
  },
  /** A finished thing: a hike saved, a goal met. */
  success(): void {
    if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
