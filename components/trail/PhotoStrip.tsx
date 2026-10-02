import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { resolvePhotoUri } from '@/lib/hikePhotos';

interface PhotoStripProps {
  photos: string[];
}

function Thumb({ stored }: { stored: string }) {
  const [uri, setUri] = useState(stored.startsWith('sb:') ? '' : stored);

  useEffect(() => {
    let cancelled = false;
    if (!stored.startsWith('sb:')) {
      setUri(stored);
      return;
    }
    void resolvePhotoUri(stored).then((next) => {
      if (!cancelled) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (!uri) {
    return <View className="h-14 w-14 border border-zinc-800 bg-zinc-900" />;
  }

  return (
    <View className="h-14 w-14 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <Image
        source={{ uri }}
        accessibilityLabel="Hike photo"
        style={{ width: 56, height: 56 }}
      />
    </View>
  );
}

export function PhotoStrip({ photos }: PhotoStripProps) {
  if (photos.length === 0) return null;
  return (
    <View className="mt-3 flex-row flex-wrap gap-2">
      {photos.map((photo, index) => (
        <Thumb key={`${index}-${photo.length}`} stored={photo} />
      ))}
    </View>
  );
}

