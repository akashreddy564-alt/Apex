export type HeroKind = 'peak' | 'climb' | 'trek' | 'trail';

/** One opening-screen place. Every fact and photo carries its source. */
export type HeroPlace = {
  id: string;
  name: string;
  elevationM: number;
  region: string;
  country: string;
  kind: HeroKind;
  grade: string;
  /** At most 140 characters, checked against `factSource`. */
  fact: string;
  factSource: string;
  photoCredit: { author: string; license: 'Unsplash' | 'CC BY' | 'CC BY-SA'; url: string };
};
