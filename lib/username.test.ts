import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  displayNameProblem,
  initials,
  normalizeUsername,
  suggestUsername,
  usernameProblem,
} from './username.ts';

describe('normalizeUsername', () => {
  it('trims, drops a leading @ and lowercases', () => {
    assert.equal(normalizeUsername('  @Maya_C '), 'maya_c');
  });
});

describe('usernameProblem', () => {
  it('accepts 3 to 20 letters, digits and underscores', () => {
    assert.equal(usernameProblem('abc'), null);
    assert.equal(usernameProblem('Maya_Chen_2026'), null);
    assert.equal(usernameProblem('a'.repeat(20)), null);
  });

  it('rejects names that are too short, too long or use other characters', () => {
    assert.match(usernameProblem('ab') ?? '', /At least 3/);
    assert.match(usernameProblem('a'.repeat(21)) ?? '', /At most 20/);
    assert.match(usernameProblem('maya.chen') ?? '', /Letters, numbers/);
    assert.match(usernameProblem('maya chen') ?? '', /Letters, numbers/);
  });
});

describe('displayNameProblem', () => {
  it('needs 1 to 40 characters after trimming', () => {
    assert.equal(displayNameProblem('Maya Chen'), null);
    assert.match(displayNameProblem('   ') ?? '', /Add your name/);
    assert.match(displayNameProblem('x'.repeat(41)) ?? '', /At most 40/);
  });
});

describe('suggestUsername', () => {
  it('builds a valid name from the email', () => {
    assert.equal(suggestUsername('Maya.Chen+apex@work.com'), 'maya_chen');
    assert.equal(suggestUsername('jo@x.com'), '');
    assert.equal(suggestUsername(null), '');
    assert.equal(usernameProblem(suggestUsername('a.very-long.email.address.name@x.com')), null);
  });
});

describe('initials', () => {
  it('takes the first and last word', () => {
    assert.equal(initials('Maya Chen'), 'MC');
    assert.equal(initials('maya'), 'M');
    assert.equal(initials('Ana de la Cruz'), 'AC');
    assert.equal(initials(''), '');
  });
});
