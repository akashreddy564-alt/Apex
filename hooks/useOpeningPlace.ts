import type { ImageProps } from 'expo-image';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { HERO_PHOTOS } from '@/data/heroPhotos';
import { HERO_PLACES } from '@/data/heroPlaces';
import { nextFromBag, shouldShowOpening } from '@/lib/heroRotation';
import { loadHeroState, saveHeroState } from '@/lib/heroState';
import type { HeroPlace } from '@/types/hero';

export type OpeningPlace =
  | { status: 'deciding' }
  | { status: 'skip' }
  | { status: 'show'; place: HeroPlace; photo: ImageProps['source'] };

const ALL_IDS = HERO_PLACES.map((place) => place.id);

/**
 * Decides once per cold launch whether to show the opening screen, and which
 * place. `hikeReady` is the saved-hike read the root layout already started.
 */
export function useOpeningPlace(hikeReady: Promise<unknown>): OpeningPlace {
  const [state, setState] = useState<OpeningPlace>({ status: 'deciding' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [initialUrl, hike] = await Promise.all([
        Linking.getInitialURL().catch(() => null),
        hikeReady.catch(() => null),
      ]);
      if (!shouldShowOpening({ initialUrl, hasActiveHike: hike != null }) || ALL_IDS.length === 0) {
        if (!cancelled) setState({ status: 'skip' });
        return;
      }
      const saved = await loadHeroState();
      const { id, bag } = nextFromBag(ALL_IDS, saved.bag, saved.lastId, Math.random);
      void saveHeroState({ bag, lastId: id });
      const place = HERO_PLACES.find((p) => p.id === id);
      if (cancelled) return;
      setState(place ? { status: 'show', place, photo: HERO_PHOTOS[id] } : { status: 'skip' });
    })();
    return () => {
      cancelled = true;
    };
  }, [hikeReady]);

  return state;
}
