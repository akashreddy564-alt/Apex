/** Usernames: lowercase letters, digits and underscores, 3 to 20 long. Matches 009_profiles.sql. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MAX = 40;

/** What the hiker typed, as it would be saved: trimmed, lowercase, no leading @. */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

/** Why a username can't be used, or null when it can. */
export function usernameProblem(input: string): string | null {
  const name = normalizeUsername(input);
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(name)) return 'Letters, numbers and underscores only.';
  return null;
}

export function displayNameProblem(input: string): string | null {
  const name = input.trim();
  if (name.length === 0) return 'Add your name.';
  if (name.length > DISPLAY_NAME_MAX) return `At most ${DISPLAY_NAME_MAX} characters.`;
  return null;
}

/** A starting suggestion from the sign-in email: "Maya.Chen+x@work.com" → "maya_chen". */
export function suggestUsername(email: string | null): string {
  const local = (email ?? '').split('@')[0]?.split('+')[0] ?? '';
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, USERNAME_MAX);
  return cleaned.length >= USERNAME_MIN ? cleaned : '';
}

/** Up to two initials for an avatar: "Maya Chen" → "MC". */
export function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts.slice(0, 1);
  return letters
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toUpperCase();
}
