import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { difficultyReasons, hikeReasons, postReasons, rankReason } from './reasons.ts';

// Shaped like Angels Landing: up to the summit at 2.8 mi, then back down.
const ANGELS = {
  distance_km: 8.95,
  elevation_gain_m: 592,
  peak_elevation_m: 1765,
  elevation_profile: [
    { distance_m: 0, elevation_m: 1305 },
    { distance_m: 1500, elevation_m: 1400 },
    { distance_m: 4506, elevation_m: 1765 },
    { distance_m: 8950, elevation_m: 1305 },
  ],
};

describe('difficultyReasons', () => {
  it('gives climb, rate and summit lines for a climb-then-descend trail', () => {
    assert.deepEqual(difficultyReasons(ANGELS), [
      { value: '1,942 ft', text: 'of climbing, nearly all of it in the first 2.8 mi' },
      { value: '349', text: 'feet of climb per mile on average' },
      { value: '5,791 ft', text: 'at the summit, about 1,510 ft above the trailhead' },
    ]);
  });

  it('drops the "nearly all" claim when the climb is spread out', () => {
    const flat = {
      ...ANGELS,
      elevation_profile: [
        { distance_m: 0, elevation_m: 1300 },
        { distance_m: 3000, elevation_m: 1500 },
        { distance_m: 4506, elevation_m: 1400 },
        { distance_m: 6000, elevation_m: 1765 },
        { distance_m: 8950, elevation_m: 1305 },
      ],
    };
    assert.equal(difficultyReasons(flat)[0].text, 'of climbing');
  });

  it('drops the claim when the summit is late in the trail', () => {
    const late = {
      ...ANGELS,
      elevation_profile: [
        { distance_m: 0, elevation_m: 1305 },
        { distance_m: 7000, elevation_m: 1765 },
        { distance_m: 8950, elevation_m: 1700 },
      ],
    };
    assert.equal(difficultyReasons(late)[0].text, 'of climbing');
  });

  it('omits lines whose inputs are missing', () => {
    assert.deepEqual(
      difficultyReasons({ distance_km: null, elevation_gain_m: null, peak_elevation_m: null, elevation_profile: [] }),
      [],
    );
    const noProfile = difficultyReasons({ ...ANGELS, elevation_profile: [] });
    assert.deepEqual(noProfile.map((r) => r.value), ['1,942 ft', '349', '5,791 ft']);
    assert.equal(noProfile[0].text, 'of climbing');
    assert.equal(noProfile[2].text, 'at the summit');
    const noPeak = difficultyReasons({ ...ANGELS, peak_elevation_m: null });
    assert.deepEqual(noPeak.map((r) => r.value), ['1,942 ft', '349']);
  });
});

const h = (id: string, km: number | null, gain: number | null, sec: number) => ({
  id,
  distance_km: km,
  elevation_gain_m: gain,
  duration_seconds: sec,
});

describe('hikeReasons', () => {
  it('flags the longest and biggest-climb hike with at least two others', () => {
    const others = [h('a', 5, 100, 3600), h('b', 8, 200, 7200)];
    assert.deepEqual(hikeReasons(h('x', 10, 300, 7200), others), {
      distance: 'Your longest hike yet',
      climb: 'Your biggest climb yet',
      time: '15 min faster than your usual pace',
    });
  });

  it('says nothing without enough or beaten comparisons', () => {
    assert.equal(hikeReasons(h('x', 10, 300, 7200), [h('a', 5, 100, 3600)]).distance, null);
    assert.equal(hikeReasons(h('x', 10, 300, 7200), [h('a', 5, 100, 3600), h('b', 12, 400, 3600)]).distance, null);
    assert.equal(hikeReasons(h('x', 10, 300, 7200), [h('a', 5, null, 3600), h('b', null, 100, 3600)]).distance, null);
    assert.equal(hikeReasons(h('x', 10, 300, 7200), [h('a', 5, 100, 3600), h('b', 6, 100, 3600)]).distance, 'Your longest hike yet');
    assert.equal(hikeReasons(h('x', null, null, 100), [h('a', 5, 100, 3600), h('b', 6, 100, 3600)]).distance, null);
  });

  it('compares pace to the usual pace', () => {
    // Others: 60 min/mi-ish pace. 3 mi hike at 40 min/mi pace -> about 60 min faster.
    const mile = 1.609344;
    const others = [h('a', mile * 2, 0, 7200), h('b', mile * 4, 0, 14400)]; // 60 min/mi
    const faster = hikeReasons(h('x', mile * 3, 0, 3 * 40 * 60), others);
    assert.equal(faster.time, '60 min faster than your usual pace');
    const slower = hikeReasons(h('x', mile * 3, 0, 3 * 70 * 60), others);
    assert.equal(slower.time, '30 min slower than your usual pace');
  });

  it('skips pace for small differences or too few comparable hikes', () => {
    const mile = 1.609344;
    const others = [h('a', mile * 2, 0, 7200), h('b', mile * 4, 0, 14400)];
    assert.equal(hikeReasons(h('x', mile * 3, 0, 3 * 59.5 * 60), others).time, null);
    assert.equal(hikeReasons(h('x', mile * 3, 0, 3 * 40 * 60), [others[0], h('c', null, 0, 100)]).time, null);
    assert.equal(hikeReasons(h('x', mile * 3, 0, 3 * 40 * 60), [others[0]]).time, null);
  });

  it('ignores itself when it appears in others', () => {
    const me = h('x', 10, 300, 7200);
    assert.equal(hikeReasons(me, [me, h('a', 5, 100, 3600), h('b', 8, 200, 7200)]).distance, 'Your longest hike yet');
  });
});

describe('rankReason', () => {
  it('words the neighbours', () => {
    assert.equal(rankReason('Mission Peak', 'Half Dome'), 'Above Mission Peak, below Half Dome');
    assert.equal(rankReason('Mission Peak', null), 'Above Mission Peak');
    assert.equal(rankReason(null, 'Half Dome'), 'Below Half Dome');
    assert.equal(rankReason(null, null), null);
  });
});

describe('postReasons', () => {
  const post = (id: string, author: string, km: number | null, m: number | null, s: number | null) => ({
    id,
    authorId: author,
    distanceKm: km,
    elevationGainM: m,
    durationSeconds: s,
  });

  it('compares only against the same author, and says whose hike it is', () => {
    const feed = [
      post('a', 'sam', 20, 1200, 6 * 3600),
      post('b', 'sam', 8, 400, 3 * 3600),
      post('c', 'sam', 10, 500, 4 * 3600),
      // Someone else's bigger hike must not count.
      post('d', 'lee', 40, 3000, 12 * 3600),
    ];
    const out = postReasons(feed[0], feed, { mine: false, name: 'Sam' });
    assert.deepEqual(out.map((r) => r.kind), ['distance', 'climb']);
    assert.equal(out[0].text, 'Longest of Sam’s recent hikes');
    assert.equal(out[1].text, 'Biggest climb of Sam’s recent hikes');
  });

  it('says "your" on your own posts, scoped to recent hikes', () => {
    const feed = [post('a', 'me', 20, 100, null), post('b', 'me', 8, 400, null), post('c', 'me', 10, 500, null)];
    const out = postReasons(feed[0], feed, { mine: true, name: 'Akash' });
    assert.deepEqual(out, [{ kind: 'distance', text: 'Longest of your recent hikes' }]);
  });

  it('gives at most two, and none without enough of their own posts', () => {
    const feed = [post('a', 'sam', 20, 1200, 3600), post('b', 'sam', 8, 400, 4 * 3600), post('c', 'sam', 10, 500, 5 * 3600)];
    assert.equal(postReasons(feed[0], feed, { mine: false, name: 'Sam' }).length, 2);
    assert.deepEqual(postReasons(feed[0], feed.slice(0, 2), { mine: false, name: 'Sam' }), []);
  });

  it('never claims an all-time best from one feed page', () => {
    const feed = [post('a', 'sam', 20, 1200, null), post('b', 'sam', 8, 400, null), post('c', 'sam', 10, 500, null)];
    for (const mine of [true, false]) {
      for (const r of postReasons(feed[0], feed, { mine, name: 'Sam' })) assert.doesNotMatch(r.text, /yet|ever/);
    }
  });

  it('turns the pace line to their usual pace', () => {
    const feed = [
      post('a', 'sam', 10, null, 2 * 3600),
      post('b', 'sam', 10, null, 3 * 3600),
      post('c', 'sam', 10, null, 3 * 3600),
    ];
    const out = postReasons(feed[0], feed, { mine: false, name: 'Sam' });
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'time');
    assert.match(out[0].text, /^\d+ min faster than their usual pace$/);
  });
});
