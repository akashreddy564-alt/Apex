import { HERO_PHOTOS } from '@/data/heroPhotos';
import { HERO_PLACES } from '@/data/heroPlaces';
import type { HeroKind } from '@/types/hero';

const KINDS: HeroKind[] = ['peak', 'climb', 'trek', 'trail'];

test('ships at least 20 places', () => {
  expect(HERO_PLACES.length).toBeGreaterThanOrEqual(20);
});

test('ids are unique kebab-case', () => {
  const ids = HERO_PLACES.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('every place has a photo and every photo has a place', () => {
  const ids = HERO_PLACES.map((p) => p.id).sort();
  expect(Object.keys(HERO_PHOTOS).sort()).toEqual(ids);
});

test('facts fit the screen and cite https sources', () => {
  for (const p of HERO_PLACES) {
    expect(p.fact.length).toBeGreaterThanOrEqual(20);
    expect(p.fact.length).toBeLessThanOrEqual(84);
    expect(p.factSource).toMatch(/^https:\/\//);
    expect(p.photoCredit.url).toMatch(/^https:\/\//);
    expect(p.photoCredit.author.trim()).not.toBe('');
  }
});

test('elevations are positive numbers', () => {
  for (const p of HERO_PLACES) {
    expect(Number.isFinite(p.elevationM)).toBe(true);
    expect(p.elevationM).toBeGreaterThan(0);
  }
});

test('covers the US launch market and every kind', () => {
  expect(HERO_PLACES.filter((p) => p.country === 'USA').length).toBeGreaterThanOrEqual(6);
  for (const kind of KINDS) expect(HERO_PLACES.some((p) => p.kind === kind)).toBe(true);
});

test('stat labels fit their column on a small iPhone', () => {
  for (const p of HERO_PLACES) {
    for (const label of [p.region, p.country, p.grade]) expect(label.length).toBeLessThanOrEqual(12);
  }
});
