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
  /** `license` is the short name shown on the source page, e.g. `CC BY-SA 4.0`. */
  photoCredit: { author: string; license: string; url: string };
};
