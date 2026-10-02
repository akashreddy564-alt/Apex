import { supabase } from '@/lib/supabase';

const BUCKET = 'hike-photos';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Stored value for an object in the private hike-photos bucket. */
export function storagePhotoRef(path: string): string {
  return `sb:${path}`;
}

export function isStoragePhotoRef(value: string): boolean {
  return value.startsWith('sb:');
}

/** Decode a picker base64 payload. Avoids fetch(data-uri).blob(), which fails on native. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const padding = clean.length % 4 === 0 ? 0 : 4 - (clean.length % 4);
  const padded = clean + '='.repeat(padding);
  const bytes = new Uint8Array((padded.length / 4) * 3 - (padded.endsWith('==') ? 2 : padded.endsWith('=') ? 1 : 0));
  let offset = 0;
  for (let i = 0; i < padded.length; i += 4) {
    const a = B64.indexOf(padded[i] ?? 'A');
    const b = B64.indexOf(padded[i + 1] ?? 'A');
    const c = padded[i + 2] === '=' ? 0 : B64.indexOf(padded[i + 2] ?? 'A');
    const d = padded[i + 3] === '=' ? 0 : B64.indexOf(padded[i + 3] ?? 'A');
    bytes[offset++] = (a << 2) | (b >> 4);
    if (padded[i + 2] !== '=') bytes[offset++] = ((b & 15) << 4) | (c >> 2);
    if (padded[i + 3] !== '=') bytes[offset++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

/**
 * Keep the picker file URI on the log. Upload bytes only when a session exists.
 * The persisted cache never stores a base64 data URI.
 */
export async function persistHikePhoto(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const mime = asset.mimeType || 'image/jpeg';
  if (!supabase) return asset.uri;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return asset.uri;
  if (!asset.base64) {
    throw new Error('Photo had no bytes to upload.');
  }

  const ext = mime.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = base64ToArrayBuffer(asset.base64);
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw error;
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
