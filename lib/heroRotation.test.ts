import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideOpening, nextFromBag, shouldShowOpening } from './heroRotation.ts';

const ALL = ['a', 'b', 'c', 'd'] as const;

describe('nextFromBag', () => {
  it('refills an empty bag and draws one id from it', () => {
    const { id, bag } = nextFromBag(ALL, [], null, () => 0.5);
    assert.ok(ALL.includes(id as (typeof ALL)[number]));
    assert.equal(bag.length, ALL.length - 1);
    assert.ok(!bag.includes(id));
  });

  it('shows every place once before any repeats', () => {
    let bag: string[] = [];
    let last: string | null = null;
    const seen: string[] = [];
    for (let i = 0; i < ALL.length; i += 1) {
      const next = nextFromBag(ALL, bag, last, Math.random);
      seen.push(next.id);
      bag = next.bag;
      last = next.id;
    }
    assert.deepEqual([...seen].sort(), [...ALL]);
  });

  it('never repeats the last place right after a refill', () => {
    for (const last of ALL) {
      const { id } = nextFromBag(ALL, [], last, () => 0);
      assert.notEqual(id, last);
    }
  });

  it('returns the only place when there is just one', () => {
    assert.equal(nextFromBag(['solo'], [], 'solo', () => 0).id, 'solo');
  });

  it('drops bag ids that are no longer places', () => {
    const { id, bag } = nextFromBag(['a', 'b'], ['gone', 'a'], null, () => 0);
    assert.ok(['a', 'b'].includes(id));
    assert.ok(!bag.includes('gone'));
    assert.ok(![id, ...bag].includes('gone'));
  });
});

describe('shouldShowOpening', () => {
  it('shows on a plain cold launch', () => {
    assert.equal(shouldShowOpening({ initialUrl: null, hasActiveHike: false }), true);
    assert.equal(shouldShowOpening({ initialUrl: 'apex://', hasActiveHike: false }), true);
    assert.equal(shouldShowOpening({ initialUrl: 'apex:///', hasActiveHike: false }), true);
  });

  it('skips for a recording link or any link with a path or query', () => {
    assert.equal(
      shouldShowOpening({ initialUrl: 'apex:///log?recording=finish', hasActiveHike: false }),
      false,
    );
    assert.equal(shouldShowOpening({ initialUrl: 'apex://trail/abc', hasActiveHike: false }), false);
    assert.equal(shouldShowOpening({ initialUrl: 'apex:///?x=1', hasActiveHike: false }), false);
  });

  it('treats a development-client launch link as a plain launch', () => {
    assert.equal(
      shouldShowOpening({
        initialUrl: 'exp+apex://expo-development-client/?url=http%3A%2F%2F192.168.1.2%3A8081',
        hasActiveHike: false,
      }),
      true,
    );
  });

  it('skips while a hike is still recording', () => {
    assert.equal(shouldShowOpening({ initialUrl: null, hasActiveHike: true }), false);
  });
});

describe('decideOpening', () => {
  const base = {
    allIds: ['a', 'b'],
    getInitialUrl: async () => null,
    hikeReady: Promise.resolve(null),
    loadState: async () => ({ bag: [], lastId: null }),
    saveState: async () => undefined,
    random: () => 0,
    timeoutMs: 50,
  };

  it('picks a place on a plain launch', async () => {
    assert.deepEqual(await decideOpening(base), { status: 'show', id: 'a' });
  });

  it('skips for the real notification link form', async () => {
    const result = await decideOpening({
      ...base,
      getInitialUrl: async () => 'apex://log?recording=pause',
    });
    assert.deepEqual(result, { status: 'skip' });
  });

  it('skips when storage hangs instead of holding the splash', async () => {
    const result = await decideOpening({ ...base, loadState: () => new Promise(() => {}) });
    assert.deepEqual(result, { status: 'skip' });
  });

  it('skips when a step throws', async () => {
    const result = await decideOpening({
      ...base,
      getInitialUrl: async () => {
        throw new Error('boom');
      },
    });
    assert.deepEqual(result, { status: 'skip' });
  });
});
