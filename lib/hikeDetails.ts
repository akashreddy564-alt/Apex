/**
 * Details a hiker adds to a hike: terrain and conditions chips, gear, and who
 * they hiked with. Pure, so it runs under node tests. The server cleans gear
 * and companions the same way (migration 026).
 */

export const TERRAIN_CHIPS = ['Rocky', 'Roots', 'Sandy', 'Snow', 'Scramble', 'Paved'] as const;
export const CONDITION_CHIPS = ['Dry', 'Muddy', 'Rain', 'Fog', 'Hot', 'Windy', 'Icy'] as const;

const TERRAIN = new Set<string>(TERRAIN_CHIPS);
const CONDITIONS = new Set<string>(CONDITION_CHIPS);

/** Picked chips, sorted into the two lists a hike stores. Unknown chips are dropped. */
export function splitChips(picked: readonly string[]): { terrain: string[]; conditions: string[] } {
  return {
    terrain: picked.filter((chip) => TERRAIN.has(chip)),
    conditions: picked.filter((chip) => CONDITIONS.has(chip)),
  };
}

export const GEAR_MAX_ITEMS = 12;
export const GEAR_MAX_LENGTH = 60;

/** Trimmed, 60 characters at most, no empties, no repeats (ignoring case), 12 at most. */
export function cleanGear(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim().slice(0, GEAR_MAX_LENGTH);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length === GEAR_MAX_ITEMS) break;
  }
  return out;
}

/** "with Maya", "with Maya and Jordan", "with A, B, C and 2 others". Null for nobody. */
export function companionsLine(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `with ${names[0]}`;
  if (names.length <= 3) return `with ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `with ${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
}
