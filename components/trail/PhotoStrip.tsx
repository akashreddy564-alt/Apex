import { Image, View } from 'react-native';

import { usePhotoUri } from '@/hooks/usePhotoUri';

interface PhotoStripProps {
  photos: string[];
}

function Thumb({ stored }: { stored: string }) {
  const uri = usePhotoUri(stored);

  if (!uri) {
    return <View className="h-14 w-14 border border-raised bg-surface" />;
  }

  return (
    <View className="h-14 w-14 overflow-hidden rounded-lg border border-raised bg-surface">
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
        <Thumb key={`${index}:${photo}`} stored={photo} />
      ))}
    </View>
  );
}
