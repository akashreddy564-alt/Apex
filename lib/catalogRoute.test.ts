import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lineLengthM, resample, routeThrough, simplify, type Network } from './catalogRoute.ts';

// About 111 m per 0.001° of latitude; longitude near the equator is close to that.
const network: Network = {
  nodes: {
    '1': [0, 0],
    '2': [0, 0.005],
    '3': [0, 0.01],
    '4': [0.003, 0.005],
    '5': [0.001, 0],
  },
  ways: [
    // Short unnamed path straight north.
    { id: 10, name: null, highway: 'path', nodes: [1, 2, 3] },
    // Longer named detour east and back.
    { id: 20, name: 'Ridge Trail', highway: 'path', nodes: [1, 4, 3] },
    { id: 30, name: null, highway: 'path', nodes: [1, 5] },
  ],
};

describe('routeThrough', () => {
  it('takes the preferred trail even when it is a little longer', () => {
    const route = routeThrough(network, [[0, 0], [0, 0.01]], ['ridge trail']);
    assert.ok(route);
    assert.deepEqual(route.wayIds, [20]);
    assert.deepEqual(route.coordinates, [[0, 0], [0.003, 0.005], [0, 0.01]]);
  });

  it('takes the shortest line with no preference', () => {
    const route = routeThrough(network, [[0, 0], [0, 0.01]], []);
    assert.deepEqual(route?.wayIds, [10]);
  });

  it('routes a loop back to the start through a via point', () => {
    const route = routeThrough(network, [[0, 0], [0, 0.01], [0, 0]], ['ridge']);
    assert.ok(route);
    const coords = route.coordinates;
    assert.deepEqual(coords[0], [0, 0]);
    assert.deepEqual(coords[coords.length - 1], [0, 0]);
    // Both legs take the preferred ridge.
    assert.ok(coords.length >= 4);
  });

  it('returns null when a stop is far from the network', () => {
    assert.equal(routeThrough(network, [[0, 0], [0.05, 0.05]], []), null);
  });

  it('returns null when the stops are not connected', () => {
    const split: Network = {
      nodes: { '1': [0, 0], '2': [0, 0.001], '3': [0.002, 0], '4': [0.002, 0.001] },
      ways: [
        { id: 1, name: null, highway: 'path', nodes: [1, 2] },
        { id: 2, name: null, highway: 'path', nodes: [3, 4] },
      ],
    };
    assert.equal(routeThrough(split, [[0, 0], [0.002, 0.001]], []), null);
  });
});

describe('simplify', () => {
  it('keeps the ends and drops points on a straight line', () => {
    const line: [number, number][] = [[0, 0], [0, 0.001], [0, 0.002], [0, 0.003]];
    assert.deepEqual(simplify(line, 5), [[0, 0], [0, 0.003]]);
  });

  it('keeps a real corner', () => {
    const line: [number, number][] = [[0, 0], [0, 0.002], [0.002, 0.002]];
    assert.deepEqual(simplify(line, 5), line);
  });
});

describe('resample', () => {
  it('samples at a fixed step and always includes the end', () => {
    const line: [number, number][] = [[0, 0], [0, 0.01]];
    const total = lineLengthM(line);
    const samples = resample(line, 100, 500);
    assert.equal(samples[0]!.distanceM, 0);
    assert.ok(Math.abs(samples[1]!.distanceM - 100) < 1e-6);
    assert.ok(Math.abs(samples[samples.length - 1]!.distanceM - total) < 1e-6);
  });

  it('widens the step to stay under the cap', () => {
    const line: [number, number][] = [[0, 0], [0, 0.1]];
    assert.ok(resample(line, 10, 50).length <= 50);
  });
});
