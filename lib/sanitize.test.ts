import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { apiError, isOffline } from './apiError.ts';
import { LIMITS, sanitizeOptional, sanitizeText } from './sanitize.ts';

describe('sanitizeText', () => {
  it('trims and collapses spaces in one-line fields', () => {
    assert.equal(sanitizeText('  Mission   Peak \n', LIMITS.trailName), 'Mission Peak');
  });

  it('turns newlines into spaces in one-line fields', () => {
    assert.equal(sanitizeText('Weekend\nWarriors', LIMITS.groupName), 'Weekend Warriors');
  });

  it('keeps newlines in notes but no more than one blank line', () => {
    assert.equal(sanitizeText('a\r\n\n\n\nb  \nc', LIMITS.notes), 'a\n\nb\nc');
  });

  it('drops control, zero-width and bidi characters', () => {
    assert.equal(sanitizeText('ma\u0007ya\u200B\u202Eevil', LIMITS.displayName), 'mayaevil');
  });

  it('keeps emoji joined', () => {
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
    assert.equal(sanitizeText(`hi ${family}`, LIMITS.comment), `hi ${family}`);
  });

  it('normalises to NFC', () => {
    assert.equal(sanitizeText('Cafe\u0301', LIMITS.trailName), 'Caf\u00E9');
  });

  it('cuts to the limit without splitting an emoji', () => {
    const out = sanitizeText('a'.repeat(39) + '\u{1F3D4}', LIMITS.displayName);
    assert.equal(out, 'a'.repeat(39));
    assert.equal(sanitizeText('x'.repeat(600), LIMITS.comment).length, 500);
  });

  it('treats non-strings as empty, and empty optional as null', () => {
    assert.equal(sanitizeText(undefined, LIMITS.comment), '');
    assert.equal(sanitizeOptional('   ', LIMITS.notes), null);
    assert.equal(sanitizeOptional(' ok ', LIMITS.notes), 'ok');
  });

  it('leaves markup as text (rendered as text, never HTML)', () => {
    assert.equal(sanitizeText('<b>hi</b>', LIMITS.comment), '<b>hi</b>');
  });
});

describe('apiError', () => {
  it('reads a rate limit by code or message', () => {
    const a = apiError({ code: 'P0429', message: 'rate_limited:report' });
    assert.equal(a.kind, 'rate_limited');
    assert.match(a.message, /reports/);
    assert.equal(apiError({ message: 'rate_limited:mystery' }).kind, 'rate_limited');
  });

  it('spots offline failures', () => {
    assert.ok(isOffline(new TypeError('Network request failed')));
    assert.ok(isOffline({ message: 'TypeError: Failed to fetch' }));
    assert.equal(apiError(new TypeError('Load failed')).kind, 'offline');
  });

  it('passes other messages through', () => {
    assert.equal(apiError({ message: 'That group is full (50 people)' }).message, 'That group is full (50 people)');
    assert.equal(apiError(null).message, 'Something went wrong. Try again.');
  });
});
