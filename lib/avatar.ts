import { apiError } from '@/lib/apiError';
import { AVATAR_BUCKET, AVATAR_PX, avatarUrl, isAvatarPath, newAvatarPath } from '@/lib/avatarPath';
import { photoBodyFromBase64 } from '@/lib/photoEncode';
import { supabase } from '@/lib/supabase';

export { avatarUrl } from '@/lib/avatarPath';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** The public URL for a profile's photo, or null for initials. */
export function photoFor(path: string | null | undefined): string | null {
  return avatarUrl(SUPABASE_URL, path);
}

/**
 * Square-crop and shrink a picked photo to 512 px JPEG, upload it to the
 * person's own folder, point the profile at it, then delete the old file.
 * Returns the new path.
 */
export async function setAvatar(
  userId: string,
  asset: { uri: string; width?: number | null; height?: number | null },
  previous: string | null,
): Promise<string> {
  if (!supabase) throw new Error('Photos need an account.');
  const ImageManipulator = await import('expo-image-manipulator');
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;
  const side = Math.min(w, h);
  const actions =
    side > 0
      ? [
          { crop: { originX: Math.round((w - side) / 2), originY: Math.round((h - side) / 2), width: side, height: side } },
          { resize: { width: AVATAR_PX, height: AVATAR_PX } },
        ]
      : [{ resize: { width: AVATAR_PX, height: AVATAR_PX } }];
  // Re-encoding also strips location and other metadata from the original.
  const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.82,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) throw new Error('Couldn’t read that photo.');

  const path = newAvatarPath(userId, Math.random().toString(36).slice(2), Date.now());
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const uploaded = await bucket.upload(path, photoBodyFromBase64(out.base64), { contentType: 'image/jpeg', upsert: false });
  if (uploaded.error) throw apiError(uploaded.error);

  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) {
    void bucket.remove([path]);
    throw apiError(error);
  }
  if (isAvatarPath(previous) && previous !== path) void bucket.remove([previous]);
  return path;
}

/** Back to initials: clear the profile's photo and delete the file. */
export async function removeAvatar(userId: string, previous: string | null): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId);
  if (error) throw apiError(error);
  if (isAvatarPath(previous)) void supabase.storage.from(AVATAR_BUCKET).remove([previous]);
}

/** Account deletion: every file in the person's avatar folder. Throws on failure. */
export async function deleteMyAvatars(userId: string): Promise<void> {
  if (!supabase) return;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  for (;;) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    // Before migration 033 the bucket doesn't exist; nothing to delete.
    if (error) return;
    const paths = (data ?? []).filter((item) => item.id).map((item) => `${userId}/${item.name}`);
    if (paths.length === 0) return;
    const removed = await bucket.remove(paths);
    if (removed.error) throw removed.error;
  }
}
