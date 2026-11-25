import { displayNameProblem, normalizeUsername, usernameProblem } from '@/lib/username';
import { supabase } from '@/lib/supabase';
import { apiError } from '@/lib/apiError';
import { TERMS_VERSION } from '@/lib/legal';
import { LIMITS, sanitizeText } from '@/lib/sanitize';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  /**
   * Agreed to the content terms (migration 018). Where 018 hasn't run, dev
   * builds treat it as agreed; release builds don't, so the gate stays shut.
   */
  terms_accepted: boolean;
}

// `*`, not a column list, so the app keeps working before 018 adds the terms columns.
const COLUMNS = '*';

/** Dev builds may run against a database without 018; release builds must not. */
const ALLOW_MISSING_TERMS = typeof __DEV__ !== 'undefined' && __DEV__;

export function mapProfile(
  row: Record<string, unknown> | null | undefined,
  allowMissingTerms: boolean = ALLOW_MISSING_TERMS,
): Profile | null {
  if (!row || typeof row.id !== 'string' || typeof row.username !== 'string') return null;
  return {
    id: row.id,
    username: row.username,
    display_name: typeof row.display_name === 'string' ? row.display_name : row.username,
    created_at: String(row.created_at ?? ''),
    // Before 018 there's no column. Only dev builds let that through.
    terms_accepted: 'terms_accepted_at' in row ? row.terms_accepted_at != null : allowMissingTerms,
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw apiError(error);
  return mapProfile(data as Record<string, unknown> | null);
}

export type SaveProfileResult = { ok: true; profile: Profile } | { ok: false; message: string };

/** Creates the profile on first save and updates it after. */
export async function saveProfile(
  id: string,
  usernameInput: string,
  displayNameInput: string,
  acceptTerms = false,
): Promise<SaveProfileResult> {
  const problem = usernameProblem(usernameInput) ?? displayNameProblem(displayNameInput);
  if (problem) return { ok: false, message: problem };
  if (!supabase) return { ok: false, message: 'Accounts need the online version of Apex.' };
  const row = {
    id,
    username: normalizeUsername(usernameInput),
    display_name: sanitizeText(displayNameInput, LIMITS.displayName),
    updated_at: new Date().toISOString(),
  };
  const upsert = (values: Record<string, unknown>) =>
    supabase!.from('profiles').upsert(values).select(COLUMNS).single();
  let { data, error } = await upsert(acceptTerms ? { ...row, ...termsFields() } : row);
  // PGRST204: the terms columns don't exist yet (018 not run). Dev builds save without them.
  if (error?.code === 'PGRST204' && acceptTerms && ALLOW_MISSING_TERMS) ({ data, error } = await upsert(row));
  if (error) {
    // 23505: unique violation on username.
    if (error.code === '23505') return { ok: false, message: 'That username is taken.' };
    return { ok: false, message: apiError(error).message };
  }
  const profile = mapProfile(data as Record<string, unknown>);
  return profile ? { ok: true, profile } : { ok: false, message: 'Could not save your profile.' };
}

function termsFields() {
  return { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION };
}

/** Records that someone with an older account agreed to the terms. */
export async function acceptTerms(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').update(termsFields()).eq('id', id).select(COLUMNS).single();
  if (error) throw apiError(error);
  return mapProfile(data as Record<string, unknown>);
}
