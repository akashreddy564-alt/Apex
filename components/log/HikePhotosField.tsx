import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ContourLoader } from '@/components/motion';

import { useColors } from '@/hooks/useColors';
import { persistHikePhoto, resolvePhotoUri } from '@/lib/hikePhotos';
import { fonts } from '@/theme/tokens';

/** Photos on a hike: thumbnails plus an add button. Used by past and recorded hikes. */
export function HikePhotosField({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const c = useColors();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const add = () => {
    void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }).then(async (result) => {
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      setAdding(true);
      try {
        setError(null);
        const stored = await persistHikePhoto({ uri: asset.uri, width: asset.width, height: asset.height });
        onChange([...photos, stored]);
      } catch {
        setError('Could not add that photo.');
      } finally {
        setAdding(false);
      }
    });
  };

  return (
    <View>
      <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Photos</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {photos.map((uri) => (
          <HikePhoto key={uri} stored={uri} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          onPress={add}
          disabled={adding}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {adding ? <ContourLoader size="sm" color={c.fgMuted} /> : <Text style={{ fontSize: 22, color: c.fgMuted }}>+</Text>}
        </Pressable>
      </View>
      {error ? <Text style={{ marginTop: 8, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>{error}</Text> : null}
    </View>
  );
}

function HikePhoto({ stored }: { stored: string }) {
  const c = useColors();
  const [uri, setUri] = useState(stored.startsWith('sb:') ? '' : stored);

  useEffect(() => {
    if (!stored.startsWith('sb:')) {
      setUri(stored);
      return;
    }
    let cancelled = false;
    void resolvePhotoUri(stored).then((next) => {
      if (!cancelled) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Hike photo"
      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.raised }}
    />
  );
}
