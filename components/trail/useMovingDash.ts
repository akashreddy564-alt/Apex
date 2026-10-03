import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PERIOD_MS = 3200;
const CYCLE = 170;

/** Dash phase on the UI thread. Stops for Reduce Motion and while blurred. */
export function useMovingDash(): SharedValue<number> {
  const offset = useSharedValue(0);
  const reduced = useReducedMotion();
  const focused = useIsFocused();

  useEffect(() => {
    if (reduced || !focused) {
      cancelAnimation(offset);
      return;
    }
    offset.value = withRepeat(
      withTiming(-CYCLE, { duration: PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(offset);
  }, [focused, offset, reduced]);

  return offset;
}
