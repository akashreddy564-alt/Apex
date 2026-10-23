import type { Trail } from '@/types/trail';

/**
 * The trail list after an app update: the bundled catalog, the hiker's own
 * trails (newest first, on top), and any older demo trail a hike points at.
 */
export function mergeCatalog(persisted: Trail[], catalog: Trail[], loggedIds: Set<string>): Trail[] {
  const catalogIds = new Set(catalog.map((t) => t.id));
  const own = persisted
    .filter((t) => t.source === 'user' && !catalogIds.has(t.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const kept = persisted.filter(
    (t) => t.source !== 'user' && !catalogIds.has(t.id) && loggedIds.has(t.id),
  );
  const rest = [...catalog, ...kept].sort((a, b) => a.name.localeCompare(b.name));
  return [...own, ...rest];
}
