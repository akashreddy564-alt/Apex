import { displayNameProblem, normalizeUsername, usernameProblem } from '@/lib/username';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
}

const COLUMNS = 'id, username, display_name, created_at';

export function mapProfile(row: Record<string, unknown> | null | undefined): Profile | null {
  if (!row || typeof row.id !== 'string' || typeof row.username !== 'string') return null;
  return {
    id: row.id,
    username: row.username,
    display_name: typeof row.display_name === 'string' ? row.display_name : row.username,
    created_at: String(row.created_at ?? ''),
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return mapProfile(data as Record<string, unknown> | null);
}

export type SaveProfileResult = { ok: true; profile: Profile } | { ok: false; message: string };

/** Creates the profile on first save and updates it after. */
export async function saveProfile(
  id: string,
  usernameInput: string,
  displayNameInput: string,
): Promise<SaveProfileResult> {
  const problem = usernameProblem(usernameInput) ?? displayNameProblem(displayNameInput);
  if (problem) return { ok: false, message: problem };
  if (!supabase) return { ok: false, message: 'Accounts need the online version of Apex.' };
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id,
      username: normalizeUsername(usernameInput),
      display_name: displayNameInput.trim(),
      updated_at: new Date().toISOString(),
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // 23505: unique violation on username.
    if (error.code === '23505') return { ok: false, message: 'That username is taken.' };
    return { ok: false, message: error.message };
  }
  const profile = mapProfile(data as Record<string, unknown>);
  return profile ? { ok: true, profile } : { ok: false, message: 'Could not save your profile.' };
}
