/**
 * Clean up text people type before it's saved or sent. The database checks
 * the same limits (migrations 009–014), so this is about a good experience,
 * not the only line of defence. Pure, so it runs under node tests.
 *
 * - Unicode is normalised (NFC), so "é" typed two ways matches.
 * - Control characters go. Multi-line fields keep newlines and turn tabs into spaces.
 * - Zero-width and bidi-override characters go, so names can't hide or reverse text.
 * - Leading and trailing space goes; runs of spaces become one; 3+ blank lines become 2.
 * - Text is cut to the field's limit without splitting an emoji.
 */

export interface TextRules {
  max: number;
  multiline?: boolean;
}

/** Field limits, matching the database checks. */
export const LIMITS = {
  comment: { max: 500, multiline: true },
  notes: { max: 2000, multiline: true },
  reportDetails: { max: 1000, multiline: true },
  displayName: { max: 40 },
  groupName: { max: 40 },
  orgName: { max: 60 },
  trailName: { max: 80 },
  search: { max: 40 },
} as const satisfies Record<string, TextRules>;

// C0 and C1 controls and DEL; newline (\n) is handled separately.
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;
// Zero-width space, LRM/RLM, word joiner, BOM and bidi embedding/override/isolate
// marks. ZWJ and ZWNJ stay: emoji sequences and some scripts need them.
const INVISIBLE = /[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

export function sanitizeText(input: unknown, rules: TextRules): string {
  if (typeof input !== 'string') return '';
  let text = input.normalize('NFC').replace(/\r\n?/g, '\n');
  if (rules.multiline) {
    text = text.replace(/\t/g, ' ').replace(CONTROL, '');
  } else {
    text = text.replace(/[\n\t]/g, ' ').replace(CONTROL, '');
  }
  text = text
    .replace(INVISIBLE, '')
    .replace(/[ \u00A0]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cut(text, rules.max);
}

/** Like sanitizeText, but empty becomes null, for optional fields. */
export function sanitizeOptional(input: unknown, rules: TextRules): string | null {
  const text = sanitizeText(input, rules);
  return text.length > 0 ? text : null;
}

/** Cut to `max` UTF-16 units (Postgres counts code points, which is never more), at a whole character. */
function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = '';
  for (const char of text) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out.trimEnd();
}
