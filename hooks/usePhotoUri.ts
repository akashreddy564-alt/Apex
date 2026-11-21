import { useEffect, useState } from 'react';

import { isStoragePhotoRef, resolvePhotoUri } from '@/lib/hikePhotos';

/** Signed links last an hour; refresh a little before. */
const REFRESH_MS = 50 * 60 * 1000;

/**
 * An Image uri for a stored photo. Bucket refs (`sb:`) become signed links,
 * which work for your own photos and your friends'. Empty while loading or
 * when the link can't be made.
 */
export function usePhotoUri(stored: string): string {
  const [uri, setUri] = useState(isStoragePhotoRef(stored) ? '' : stored);

  useEffect(() => {
    if (!isStoragePhotoRef(stored)) {
      setUri(stored);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      void resolvePhotoUri(stored).then((next) => {
        if (cancelled) return;
        setUri(next);
        timer = setTimeout(load, REFRESH_MS);
      });
    };
    setUri('');
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [stored]);

  return uri;
}
