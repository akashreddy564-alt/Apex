import { photoBodyFromBase64, reencodePhoto, type EncodedPhoto } from '@/lib/photoEncode';
import { supabase } from '@/lib/supabase';

const BUCKET = 'hike-photos';

/** Stored value for an object in the private hike-photos bucket. */
export function storagePhotoRef(path: string): string {
  return `sb:${path}`;
}

export function isStoragePhotoRef(value: string): boolean {
  return value.startsWith('sb:');
}

/**
 * Re-encode, then keep the new file URI on the log.
 * Upload those JPEG bytes only when a session exists.
 * The persisted cache never stores a base64 data URI.
 */
export async function persistHikePhoto(asset: {
  uri: string;
  width?: number | null;
  height?: number | null;
}): Promise<string> {
  const prepared = await reencodePhoto(asset.uri, asset.width ?? 0, asset.height ?? 0);
  return uploadEncodedPhoto(prepared);
}

export async function uploadEncodedPhoto(prepared: EncodedPhoto): Promise<string> {
  const body = photoBodyFromBase64(prepared.base64);
  if (!supabase) return prepared.uri;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return prepared.uri;

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return storagePhotoRef(path);
}

/** Resolve a stored photo string to an Image uri. Storage refs need a signed URL. */
export async function resolvePhotoUri(stored: string): Promise<string> {
  if (!isStoragePhotoRef(stored) || !supabase) return stored;
  const path = stored.slice(3);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}
