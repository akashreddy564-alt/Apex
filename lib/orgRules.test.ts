import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkWorkEmail,
  cleanOrgName,
  daysLeft,
  emailDomain,
  guessKind,
  isValidOrgName,
  mapConfirm,
  mapOrganization,
  normalizeOrgCode,
  renewNote,
  suggestedName,
} from './orgRules.ts';

describe('emails', () => {
  it('takes the lowercased domain', () => {
    assert.equal(emailDomain('  Maya.T@UW.edu '), 'uw.edu');
    assert.equal(emailDomain("o'neil@cs.washington.edu"), 'cs.washington.edu');
  });

  it('refuses what isn’t an email', () => {
    assert.equal(emailDomain('maya'), null);
    assert.equal(emailDomain('maya@uw'), null);
    assert.equal(emailDomain('@uw.edu'), null);
    assert.equal(emailDomain('a b@uw.edu'), null);
  });

  it('refuses personal mail and explains why', () => {
    assert.deepEqual(checkWorkEmail('me@Gmail.com'), { ok: false, message: 'Use your school or work email, not a personal one.' });
    assert.deepEqual(checkWorkEmail('nope'), { ok: false, message: 'That doesn’t look like an email address.' });
    assert.deepEqual(checkWorkEmail('sam@stripe.com'), { ok: true, domain: 'stripe.com' });
  });
});

describe('kind and name', () => {
  it('reads schools from their domains', () => {
    assert.equal(guessKind('uw.edu'), 'school');
    assert.equal(guessKind('ox.ac.uk'), 'school');
    assert.equal(guessKind('unimelb.edu.au'), 'school');
    assert.equal(guessKind('lwsd.k12.wa.us'), 'school');
    assert.equal(guessKind('stripe.com'), 'company');
    assert.equal(guessKind('education.com'), 'company');
  });

  it('suggests a name from the domain', () => {
    assert.equal(suggestedName('uw.edu'), 'UW');
    assert.equal(suggestedName('cs.washington.edu'), 'Washington');
    assert.equal(suggestedName('ox.ac.uk'), 'OX');
    assert.equal(suggestedName('stripe.com'), 'Stripe');
    assert.equal(suggestedName('mail.google.com'), 'Google');
  });

  it('cleans and checks names like the server', () => {
    assert.equal(cleanOrgName('  University  of   Washington '), 'University of Washington');
    assert.equal(isValidOrgName(' A '), false);
    assert.equal(isValidOrgName('UW'), true);
    assert.equal(isValidOrgName('x'.repeat(61)), false);
  });
});

describe('codes', () => {
  it('keeps six digits from typing or pasting', () => {
    assert.equal(normalizeOrgCode(' 123 456 '), '123456');
    assert.equal(normalizeOrgCode('12-34-567'), '123456');
    assert.equal(normalizeOrgCode('abc'), '');
  });

  it('maps every answer from confirm_org_code', () => {
    assert.deepEqual(mapConfirm({ status: 'joined', organization_id: 'o1', name: 'UW', kind: 'school' }), {
      status: 'joined', organizationId: 'o1', name: 'UW', kind: 'school',
    });
    assert.deepEqual(mapConfirm({ status: 'name_it', domain: 'stripe.com', kind: 'company' }), {
      status: 'name_it', domain: 'stripe.com', kind: 'company',
    });
    assert.deepEqual(mapConfirm({ status: 'wrong_code', tries_left: 3 }), { status: 'wrong_code', triesLeft: 3 });
    assert.deepEqual(mapConfirm(null), { status: 'wrong_code', triesLeft: 0 });
  });
});

describe('renewal', () => {
  const now = new Date('2026-11-23T12:00:00Z');

  it('stays quiet for most of the year', () => {
    assert.equal(renewNote('2026-06-01T00:00:00Z', now), null);
    assert.equal(daysLeft('2026-11-23T12:00:00Z', now), 365);
  });

  it('nudges in the last month and after it runs out', () => {
    assert.equal(renewNote('2025-12-08T12:00:00Z', now), 'Verify your email again within 15 days to stay on the board.');
    assert.equal(renewNote('2025-11-01T00:00:00Z', now), 'Your verification ran out. Verify your email again to get back on the board.');
  });
});

describe('rows', () => {
  it('maps my_organizations rows and drops broken ones', () => {
    assert.deepEqual(
      mapOrganization({
        id: 'o1', name: 'University of Washington', kind: 'school', domain: 'uw.edu',
        verified_at: '2026-11-23T00:00:00Z', member_count: 2, place: null, week_gain_m: '600',
      }),
      {
        id: 'o1', name: 'University of Washington', kind: 'school', domain: 'uw.edu',
        verifiedAt: '2026-11-23T00:00:00Z', memberCount: 2, place: null, weekGainM: 600,
      },
    );
    assert.equal(mapOrganization({ id: 'o1', name: 'x' }), null);
  });
});
