/** Profile photo paths and URLs. Pure, for node tests. Matches migration 033. */

export const AVATAR_BUCKET = 'avatars';
/** The photo's edge in pixels: sharp at 120 pt on a 3x screen, small to send. */
export const AVATAR_PX = 512;

const PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,64}\.jpg$/;

/** A fresh object path in the person's folder; a new name each time busts caches. */
export function newAvatarPath(userId: string, random: string, now: number): string {
  const name = `${now.toString(36)}-${random.replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'x'}`;
  return `${userId}/${name}.jpg`;
}

export function isAvatarPath(value: unknown): value is string {
  return typeof value === 'string' && PATH.test(value);
}

/** The public URL for a stored path, or null (initials) when there's no photo. */
export function avatarUrl(supabaseUrl: string | undefined, path: string | null | undefined): string | null {
  if (!supabaseUrl || !isAvatarPath(path)) return null;
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
