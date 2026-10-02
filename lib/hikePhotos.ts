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
 * Turn a picker asset into something the log can keep.
 * Without Supabase (or without a session) this is a data URI.
 * With both, the file is uploaded and the log stores a bucket ref.
 */
export async function persistHikePhoto(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const mime = asset.mimeType || 'image/jpeg';
  const local = asset.base64
    ? `data:${mime};base64,${asset.base64}`
    : asset.uri;

  if (!supabase) return local;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return local;

  const ext = mime.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const response = await fetch(local);
  const body = await response.blob();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: mime,
    upsert: false,
  });
  if (error) return local;
  return storagePhotoRef(path);
}

/** Resolve a stored photo string to an Image uri. Storage refs need a signed URL. */
export async function resolvePhotoUri(stored: string): Promise<string> {
  if (!isStoragePhotoRef(stored) || !supabase) return stored;
  const path = stored.slice(3);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}
