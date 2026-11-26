import { useEffect, useRef, useState } from 'react';

import { type CatalogHit, knownPosition, searchCatalog } from '@/lib/catalogRemote';

/**
 * Server catalog search as the hiker types: waits for a short pause, ranks
 * trails near them first when location is already allowed (never asks), and
 * drops answers to text they've since changed.
 */
export function useCatalogSearch(text: string): { hits: CatalogHit[]; loading: boolean } {
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [loading, setLoading] = useState(false);
  const near = useRef<[number, number] | null | undefined>(undefined);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        if (near.current === undefined) near.current = await knownPosition();
        const found = await searchCatalog(q, near.current);
        if (!live) return;
        setHits(found);
        setLoading(false);
      })();
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text]);

  return { hits, loading };
}
