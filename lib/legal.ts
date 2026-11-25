/**
 * Where Apex's terms, privacy policy and support pages live: the landing
 * site (site/), live at hikeapex.com.
 */
export const SITE_URL = 'https://hikeapex.com';
export const TERMS_URL = `${SITE_URL}/terms`;
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const SUPPORT_URL = `${SITE_URL}/support`;
/** Same inbox as the site's SUPPORT_EMAIL (site/lib/contact.ts). */
export const SUPPORT_EMAIL = 'support@hikeapex.com';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** Bump when the terms change in a way people should agree to again. */
export const TERMS_VERSION = '2026-11-24';

/** The promise people agree to, in one line, shown beside the checkbox. */
export const TERMS_SUMMARY =
  'No hateful, harassing, sexual or violent content, and no abusing other hikers. Reported posts and accounts are reviewed within 24 hours and removed if they break the rules.';
