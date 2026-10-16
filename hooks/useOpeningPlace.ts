import type { ImageProps } from 'expo-image';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { HERO_PHOTOS } from '@/data/heroPhotos';
import { HERO_PLACES } from '@/data/heroPlaces';
import { decideOpening } from '@/lib/heroRotation';
import { loadHeroState, saveHeroState } from '@/lib/heroState';
import type { HeroPlace } from '@/types/hero';

export type OpeningPlace =
  | { status: 'deciding' }
  | { status: 'skip' }
  | { status: 'show'; place: HeroPlace; photo: ImageProps['source'] };

const ALL_IDS = HERO_PLACES.map((place) => place.id);

/** Longest the native splash waits on this decision before skipping. */
const DECIDE_TIMEOUT_MS = 2_000;

/**
 * Decides once per cold launch whether to show the opening screen, and which
 * place. `hikeReady` is the saved-hike read the root layout already started.
 */
export function useOpeningPlace(hikeReady: Promise<unknown>): OpeningPlace {
  const [state, setState] = useState<OpeningPlace>({ status: 'deciding' });

  useEffect(() => {
    let cancelled = false;
    void decideOpening({
      allIds: ALL_IDS,
      getInitialUrl: () => Linking.getInitialURL(),
      hikeReady,
      loadState: loadHeroState,
      saveState: saveHeroState,
      random: Math.random,
      timeoutMs: DECIDE_TIMEOUT_MS,
    }).then((decision) => {
      if (cancelled) return;
      const place =
        decision.status === 'show' ? HERO_PLACES.find((p) => p.id === decision.id) : undefined;
      setState(
        place ? { status: 'show', place, photo: HERO_PHOTOS[place.id] } : { status: 'skip' },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [hikeReady]);

  return state;
}
