import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { uploadEncodedPhoto } from '@/lib/hikePhotos';
import { reencodePhoto } from '@/lib/photoEncode';

interface UseHikePhotosArgs {
  addPhoto: (uri: string) => void;
  replacePhoto: (from: string, to: string) => void;
}

/**
 * Library / camera capture for the active hike.
 * The photo is re-encoded to a JPEG before it is kept or uploaded.
 * A configured Supabase session then replaces the file URI with a bucket ref.
 */
export function useHikePhotos({ addPhoto, replacePhoto }: UseHikePhotosArgs) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const attach = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      let prepared;
      try {
        prepared = await reencodePhoto(asset.uri, asset.width ?? 0, asset.height ?? 0);
      } catch {
        setMessage('Could not prepare that photo.');
        return;
      }
      addPhoto(prepared.uri);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const stored = await uploadEncodedPhoto(prepared);
        if (stored !== prepared.uri) replacePhoto(prepared.uri, stored);
      } catch {
        setMessage('Photo kept on this device. Upload did not finish.');
      }
    },
    [addPhoto, replacePhoto],
  );

  const pickFromLibrary = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage('Photo library access is off.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      void attach(result);
    } catch {
      setMessage('Could not open the photo library.');
    } finally {
      setBusy(false);
    }
  }, [attach]);

  const takePhoto = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage('Camera access is off.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      void attach(result);
    } catch {
      setMessage('Camera is unavailable here.');
    } finally {
      setBusy(false);
    }
  }, [attach]);

  return { pickFromLibrary, takePhoto, busy, message };
}
