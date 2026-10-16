/**
 * Opening-screen rotation: a shuffled bag, so every place shows once before
 * any repeats, and never the same place twice in a row.
 */
export function nextFromBag(
  allIds: readonly string[],
  bag: readonly string[],
  lastId: string | null,
  random: () => number,
): { id: string; bag: string[] } {
  const known = new Set(allIds);
  let pool = bag.filter((id) => known.has(id));
  if (pool.length === 0) {
    pool = [...allIds];
    if (pool.length > 1 && lastId != null) {
      pool = pool.filter((id) => id !== lastId);
      // The last place goes back in, but never as this draw.
      const index = Math.floor(random() * pool.length);
      const id = pool[index]!;
      const rest = pool.filter((_, i) => i !== index);
      if (known.has(lastId)) rest.push(lastId);
      return { id, bag: rest };
    }
  }
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return { id: pool[index]!, bag: pool.filter((_, i) => i !== index) };
}

const DEV_CLIENT_HOST = 'expo-development-client';

/** Only a plain cold launch gets the opening screen. */
export function shouldShowOpening(input: {
  initialUrl: string | null;
  hasActiveHike: boolean;
}): boolean {
  if (input.hasActiveHike) return false;
  const url = input.initialUrl;
  if (url == null || url === '') return true;
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)(\/?[^?#]*)(\?[^#]*)?/i.exec(url);
  if (!match) return false;
  const [, host = '', path = '', query = ''] = match;
  if (host === DEV_CLIENT_HOST) return true;
  return host === '' && (path === '' || path === '/') && query === '';
}

export type OpeningDecision = { status: 'skip' } | { status: 'show'; id: string };

/**
 * One cold launch's decision. Any failure, or taking longer than
 * `timeoutMs`, skips the opening screen so the splash never hangs.
 */
export async function decideOpening(deps: {
  allIds: readonly string[];
  getInitialUrl: () => Promise<string | null>;
  hikeReady: Promise<unknown>;
  loadState: () => Promise<{ bag: string[]; lastId: string | null }>;
  saveState: (state: { bag: string[]; lastId: string | null }) => Promise<void>;
  random: () => number;
  timeoutMs: number;
}): Promise<OpeningDecision> {
  const skip: OpeningDecision = { status: 'skip' };
  const decide = async (): Promise<OpeningDecision> => {
    const [initialUrl, hike] = await Promise.all([deps.getInitialUrl(), deps.hikeReady]);
    if (deps.allIds.length === 0) return skip;
    if (!shouldShowOpening({ initialUrl, hasActiveHike: hike != null })) return skip;
    const saved = await deps.loadState();
    const { id, bag } = nextFromBag(deps.allIds, saved.bag, saved.lastId, deps.random);
    void deps.saveState({ bag, lastId: id }).catch(() => undefined);
    return { status: 'show', id };
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<OpeningDecision>((resolve) => {
    timer = setTimeout(() => resolve(skip), deps.timeoutMs);
  });
  try {
    return await Promise.race([decide(), timeout]);
  } catch {
    return skip;
  } finally {
    clearTimeout(timer);
  }
}
