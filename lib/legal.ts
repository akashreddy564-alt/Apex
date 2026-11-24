/**
 * Where Apex's terms, privacy policy and support pages live: the landing
 * site (site/). Point SITE_URL at the real domain once it exists.
 */
export const SITE_URL = 'https://apex-landing-kappa.vercel.app';
export const TERMS_URL = `${SITE_URL}/terms`;
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const SUPPORT_URL = `${SITE_URL}/support`;

/** Bump when the terms change in a way people should agree to again. */
export const TERMS_VERSION = '2026-11-24';

/** The promise people agree to, in one line, shown beside the checkbox. */
export const TERMS_SUMMARY =
  'No hateful, harassing, sexual or violent content, and no abusing other hikers. Reported posts and accounts are reviewed within 24 hours and removed if they break the rules.';
