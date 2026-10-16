import AsyncStorage from '@react-native-async-storage/async-storage';

export const HERO_STATE_KEY = 'apex.hero.v1';

export type HeroState = { bag: string[]; lastId: string | null };

const EMPTY: HeroState = { bag: [], lastId: null };

function isHeroState(value: unknown): value is HeroState {
  if (value == null || typeof value !== 'object') return false;
  const { bag, lastId } = value as Record<string, unknown>;
  return (
    Array.isArray(bag) &&
    bag.every((id) => typeof id === 'string') &&
    (lastId === null || typeof lastId === 'string')
  );
}

/** Missing, unreadable, or malformed state starts a fresh bag. */
export async function loadHeroState(): Promise<HeroState> {
  try {
    const raw = await AsyncStorage.getItem(HERO_STATE_KEY);
    if (raw == null) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    return isHeroState(parsed) ? { bag: [...parsed.bag], lastId: parsed.lastId } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveHeroState(state: HeroState): Promise<void> {
  try {
    await AsyncStorage.setItem(HERO_STATE_KEY, JSON.stringify(state));
  } catch {
    // A lost save only means a possible repeat next launch.
  }
}
