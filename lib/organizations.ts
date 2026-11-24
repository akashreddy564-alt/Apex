import { apiError, AppError } from '@/lib/apiError';
import { deviceTimeZone, mapBoardRow, type BoardRow, type Period } from '@/lib/groupRules';
import {
  cleanOrgName,
  mapConfirm,
  mapOrganization,
  normalizeOrgCode,
  type ConfirmResult,
  type Organization,
  type OrgKind,
} from '@/lib/orgRules';
import { supabase } from '@/lib/supabase';

export * from '@/lib/orgRules';

function client() {
  if (!supabase) throw new Error('Schools and companies need the online version of Apex.');
  return supabase;
}

function list<T>(data: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
  return ((data ?? []) as Record<string, unknown>[]).map(map).filter((row): row is T => row !== null);
}

/** Emails a 6-digit code to a school or work address (the org-verify Edge Function). */
export async function requestOrgCode(email: string): Promise<void> {
  const { error } = await client().functions.invoke('org-verify', { body: { email: email.trim() } });
  if (!error) return;
  // The function answers { error: "…" } with a readable reason.
  const response = (error as { context?: Response }).context;
  let message = '';
  try {
    const body = response ? await response.clone().json() : null;
    if (body && typeof body.error === 'string') message = body.error;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  if (message) throw new AppError(message, response?.status === 429 ? 'rate_limited' : 'other');
  throw apiError(error);
}

export async function confirmOrgCode(code: string): Promise<ConfirmResult> {
  const { data, error } = await client().rpc('confirm_org_code', { code: normalizeOrgCode(code) });
  if (error) throw apiError(error);
  return mapConfirm(data);
}

/** The first verified person from a domain names it. Returns its id. */
export async function createOrganization(name: string, kind: OrgKind): Promise<string> {
  const { data, error } = await client().rpc('create_organization', {
    org_name: cleanOrgName(name),
    org_kind: kind,
    tz: deviceTimeZone(),
  });
  if (error) throw apiError(error);
  return String(data);
}

export async function fetchMyOrganizations(): Promise<Organization[]> {
  const { data, error } = await client().rpc('my_organizations');
  if (error) throw apiError(error);
  return list(data, mapOrganization);
}

export async function fetchOrgBoard(orgId: string, period: Period): Promise<BoardRow[]> {
  const { data, error } = await client().rpc('organization_board', { o: orgId, period });
  if (error) throw apiError(error);
  return list(data, mapBoardRow);
}

export async function leaveOrganization(orgId: string): Promise<void> {
  const { error } = await client().rpc('leave_organization', { o: orgId });
  if (error) throw apiError(error);
}
