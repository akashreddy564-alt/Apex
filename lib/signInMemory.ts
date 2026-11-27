export type SignInMethod = 'apple' | 'google' | 'email';

export interface SignInMemory {
  lastMethod: SignInMethod | null;
  /** The address last used, shown masked ("ma•••@gmail.com"). */
  lastEmail: string | null;
  /** Birth year from the age check on this phone. */
  birthYear: number | null;
}

const METHODS: SignInMethod[] = ['apple', 'google', 'email'];

export function parseSignInMemory(raw: unknown): SignInMemory {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    lastMethod: METHODS.find((m) => m === r.lastMethod) ?? null,
    lastEmail: typeof r.lastEmail === 'string' && r.lastEmail.includes('@') ? r.lastEmail : null,
    birthYear: typeof r.birthYear === 'number' && Number.isInteger(r.birthYear) ? r.birthYear : null,
  };
}

/** "maya.chen@gmail.com" → "ma•••@gmail.com". Apple's private relay addresses read as "Hidden email". */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1);
  if (domain === 'privaterelay.appleid.com') return 'Hidden email';
  const name = email.slice(0, at);
  return `${name.slice(0, Math.min(2, name.length))}•••@${domain}`;
}

export const METHOD_LABEL: Record<SignInMethod, string> = {
  apple: 'Apple',
  google: 'Google',
  email: 'email',
};
