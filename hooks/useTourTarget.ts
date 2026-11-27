import { useCallback, useEffect, useRef } from 'react';
import type { View } from 'react-native';

import { useTour, type TourKey } from '@/stores/tourStore';

/**
 * Marks a view as a Home tour target. Spread the result onto the view; it
 * reports its spot on screen when it lays out and again when the tour turns
 * to it (after a tab switch or scroll has settled).
 */
export function useTourTarget(key: TourKey) {
  const ref = useRef<View>(null);
  const active = useTour((s) => s.active === key);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) useTour.getState().setRect(key, { x, y, width, height });
    });
  }, [key]);

  useEffect(() => {
    if (!active) return;
    // Twice: once soon, once after a tab transition has finished moving things.
    const first = setTimeout(measure, 120);
    const second = setTimeout(measure, 420);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [active, measure]);

  return { ref, onLayout: measure, collapsable: false as const };
}
