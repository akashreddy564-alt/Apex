import catalog from '@/data/catalogTrails.json';
import type { Trail } from '@/types/trail';

/**
 * Popular US trails bundled with the app, built by scripts/catalog from our
 * own OpenStreetMap extract. Lines © OpenStreetMap contributors (ODbL);
 * elevation from USGS 3DEP via Open Topo Data.
 */
export const CATALOG_TRAILS = catalog as unknown as Trail[];

/** Attribution shown wherever a catalog line or its stats appear. */
export const OSM_CREDIT = '© OpenStreetMap';
export const CATALOG_CREDIT = 'Trail data © OpenStreetMap contributors · Elevation USGS';

export function isCatalogTrail(trail: Pick<Trail, 'source'> | null | undefined): boolean {
  return trail?.source === 'catalog';
}
