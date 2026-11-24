/** Pure rules for schools and companies. Matches 017_organizations.sql. */

export type OrgKind = 'school' | 'company';

export const ORG_CAP_PER_PERSON = 3;
export const ORG_NAME_MIN = 2;
export const ORG_NAME_MAX = 60;
export const ORG_CODE_LENGTH = 6;
/** A verification counts for a year; we nudge a month before it runs out. */
export const VERIFY_DAYS = 365;
const RENEW_WARNING_DAYS = 30;
const DAY_MS = 86_400_000;

export interface Organization {
  id: string;
  name: string;
  kind: OrgKind;
  /** The verified domain, e.g. "uw.edu". */
  domain: string;
  verifiedAt: string;
  memberCount: number;
  /** Your place by elevation gain this week. */
  place: number | null;
  weekGainM: number;
}

/** What confirm_org_code() answers. */
export type ConfirmResult =
  | { status: 'joined'; organizationId: string; name: string; kind: OrgKind }
  | { status: 'name_it'; domain: string; kind: OrgKind }
  | { status: 'wrong_code'; triesLeft: number };

/**
 * Personal mail. Mirrors apex_private.personal_domains, so the app can say
 * so before sending anything; the server checks again.
 */
export const PERSONAL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com',
  'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com',
  'gmx.net', 'mail.com', 'zoho.com', 'yandex.com', 'yandex.ru', 'hey.com',
  'fastmail.com', 'tutanota.com', 'tuta.io', 'qq.com', '163.com', '126.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'cox.net',
  'charter.net', 'duck.com', 'mailinator.com', 'guerrillamail.com',
  '10minutemail.com', 'tempmail.com', 'yopmail.com', 'sharklasers.com',
]);

const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/** The lowercased domain of an email, or null when it isn't one. */
export function emailDomain(email: string): string | null {
  const trimmed = email.trim();
  if (!EMAIL.test(trimmed)) return null;
  return trimmed.split('@')[1].toLowerCase();
}

export function isPersonalDomain(domain: string): boolean {
  return PERSONAL_DOMAINS.has(domain.toLowerCase());
}

export type EmailCheck = { ok: true; domain: string } | { ok: false; message: string };

/** What the email step says before it sends a code. */
export function checkWorkEmail(email: string): EmailCheck {
  const domain = emailDomain(email);
  if (!domain) return { ok: false, message: 'That doesn’t look like an email address.' };
  if (isPersonalDomain(domain)) return { ok: false, message: 'Use your school or work email, not a personal one.' };
  return { ok: true, domain };
}

/** School for .edu, .ac.uk, .edu.au and k12 domains; company otherwise. Matches the SQL. */
export function guessKind(domain: string): OrgKind {
  return /(\.edu|\.ac\.[a-z]{2}|\.edu\.[a-z]{2}|\.k12\.[a-z.]+)$/.test(domain.toLowerCase()) ? 'school' : 'company';
}

/** A starting name from a domain: "uw.edu" → "UW", "stripe.com" → "Stripe". */
export function suggestedName(domain: string): string {
  const labels = domain.toLowerCase().split('.');
  const school = guessKind(domain) === 'school';
  // The label before the suffix: "cs.washington.edu" → "washington".
  const suffixLength = /\.(ac|edu)\.[a-z]{2}$/.test(domain) || /\.k12\./.test(domain) ? 2 : 1;
  const core = labels[Math.max(0, labels.length - suffixLength - 1)] ?? labels[0];
  if (!core) return '';
  if (school && core.length <= 5) return core.toUpperCase();
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function cleanOrgName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isValidOrgName(name: string): boolean {
  const clean = cleanOrgName(name);
  return clean.length >= ORG_NAME_MIN && clean.length <= ORG_NAME_MAX;
}

/** Digits only, at most six: what the code field keeps from typing or pasting. */
export function normalizeOrgCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, ORG_CODE_LENGTH);
}

/** Days until a verification runs out; negative once it has. */
export function daysLeft(verifiedAt: string, now: Date = new Date()): number {
  const at = Date.parse(verifiedAt);
  if (!Number.isFinite(at)) return 0;
  return Math.ceil((at + VERIFY_DAYS * DAY_MS - now.getTime()) / DAY_MS);
}

/** Null while fresh; otherwise the line asking to verify again. */
export function renewNote(verifiedAt: string, now: Date = new Date()): string | null {
  const left = daysLeft(verifiedAt, now);
  if (left > RENEW_WARNING_DAYS) return null;
  if (left <= 0) return 'Your verification ran out. Verify your email again to get back on the board.';
  return `Verify your email again within ${left} ${left === 1 ? 'day' : 'days'} to stay on the board.`;
}

export function kindLabel(kind: OrgKind): string {
  return kind === 'school' ? 'School' : 'Company';
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function kindOf(value: unknown): OrgKind {
  return value === 'school' ? 'school' : 'company';
}

export function mapOrganization(row: Record<string, unknown>): Organization | null {
  const id = str(row.id);
  const name = str(row.name);
  const domain = str(row.domain);
  const verifiedAt = str(row.verified_at);
  if (!id || !name || !domain || !verifiedAt) return null;
  return {
    id,
    name,
    kind: kindOf(row.kind),
    domain,
    verifiedAt,
    memberCount: num(row.member_count),
    place: row.place == null ? null : num(row.place),
    weekGainM: num(row.week_gain_m),
  };
}

export function mapConfirm(row: unknown): ConfirmResult {
  const value = (row ?? {}) as Record<string, unknown>;
  if (value.status === 'joined' && str(value.organization_id) && str(value.name)) {
    return { status: 'joined', organizationId: String(value.organization_id), name: String(value.name), kind: kindOf(value.kind) };
  }
  if (value.status === 'name_it' && str(value.domain)) {
    return { status: 'name_it', domain: String(value.domain), kind: kindOf(value.kind) };
  }
  return { status: 'wrong_code', triesLeft: Math.max(0, num(value.tries_left)) };
}
