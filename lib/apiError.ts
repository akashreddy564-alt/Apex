/**
 * Turn a Supabase / Postgres error into something a person can read. Rate
 * limits (migration 014) raise P0429 with "rate_limited:<action>"; offline
 * fetches fail with a TypeError. Pure, so it runs under node tests.
 */

export class AppError extends Error {
  readonly kind: 'rate_limited' | 'offline' | 'other';
  constructor(message: string, kind: AppError['kind']) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
  }
}

const RATE_MESSAGES: Record<string, string> = {
  friend_request: 'You’ve sent a lot of friend requests. Try again in a few minutes.',
  report: 'You’ve sent several reports. Try again in a few minutes.',
  group_create: 'You’ve made several groups. Try again in a few minutes.',
  group_join: 'Too many tries. Check the code and try again in a few minutes.',
  like: 'Slow down a little. Try again in a few minutes.',
  comment: 'You’re commenting fast. Try again in a few minutes.',
  block: 'Try again in a few minutes.',
  username: 'You’ve changed your username a few times. Try again in a few minutes.',
  post: 'Slow down a little. Try again in a few minutes.',
};

interface ErrorLike {
  message?: unknown;
  code?: unknown;
}

export function apiError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : '';
  const match = /rate_limited:([a-z_]+)/.exec(message);
  if (e.code === 'P0429' || match) {
    const action = match?.[1] ?? '';
    return new AppError(RATE_MESSAGES[action] ?? 'Slow down a little. Try again in a few minutes.', 'rate_limited');
  }
  if (/terms_required/.test(message)) {
    return new AppError('Agree to Apex’s terms first. You’ll find them on Social.', 'other');
  }
  if (isOffline(error)) return new AppError('You’re offline. It will go through when you reconnect.', 'offline');
  return new AppError(message || 'Something went wrong. Try again.', 'other');
}

/** fetch() failing to reach the network, in the forms RN, web and supabase-js use. */
export function isOffline(error: unknown): boolean {
  const message = String((error as ErrorLike | null)?.message ?? '');
  return /network request failed|failed to fetch|load failed|networkerror|fetch failed/i.test(message);
}

/**
 * An Edge Function's own { error: "…" } reason from a functions.invoke error,
 * with the HTTP status. Empty message when the body isn't that shape.
 */
export async function functionErrorReason(error: unknown): Promise<{ message: string; status: number | null }> {
  const response = (error as { context?: Response } | null)?.context;
  let message = '';
  try {
    const body = response ? await response.clone().json() : null;
    if (body && typeof body.error === 'string') message = body.error;
  } catch {
    // Not JSON.
  }
  return { message, status: typeof response?.status === 'number' ? response.status : null };
}

/** A failed account delete, in words. Nothing is queued offline, so say to retry. */
export function deleteErrorMessage(error: unknown, prefix = 'Couldn’t delete your account'): string {
  const mapped = apiError(error);
  if (mapped.kind === 'offline') return 'You’re offline. Connect to the internet and try again.';
  return `${prefix}: ${mapped.message}`;
}
