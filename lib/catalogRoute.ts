/**
 * Line geometry for the trail catalog pipeline and on-device matching:
 * foot routing over an OSM path network, simplification and resampling.
 * Pure, so it runs under node tests (no `@/` imports).
 */

export type LonLat = [number, number];

export interface NetworkWay {
  id: number;
  name: string | null;
  highway: string;
  nodes: number[];
}

/** Ways near one trail, cut from our own extract. Node ids map to [lon, lat]. */
export interface Network {
  nodes: Record<string, LonLat>;
  ways: NetworkWay[];
}

export interface Route {
  coordinates: LonLat[];
  wayIds: number[];
}

/** A stop further than this from any path node is a curation mistake. */
export const SNAP_MAX_M = 300;

const FOOT_HIGHWAYS = new Set(['path', 'footway', 'steps', 'bridleway', 'track']);
const PREFERRED_COST = 0.6;
const ROAD_COST = 4;

export function distanceM(a: LonLat, b: LonLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineLengthM(coords: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += distanceM(coords[i - 1]!, coords[i]!);
  return total;
}

function costFactor(way: NetworkWay, prefer: string[]): number {
  const name = way.name?.toLowerCase() ?? '';
  if (name && prefer.some((p) => name.includes(p.toLowerCase()))) return PREFERRED_COST;
  return FOOT_HIGHWAYS.has(way.highway) ? 1 : ROAD_COST;
}

interface Edge {
  to: number;
  cost: number;
  way: number;
}

/** Min-heap of [cost, node]. */
class Heap {
  private items: [number, number][] = [];
  get size() {
    return this.items.length;
  }
  push(item: [number, number]) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]![0] <= a[i]![0]) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]![0] < a[m]![0]) m = l;
        if (r < a.length && a[r]![0] < a[m]![0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

function buildGraph(network: Network, prefer: string[]): Map<number, Edge[]> {
  const graph = new Map<number, Edge[]>();
  const add = (from: number, edge: Edge) => {
    const list = graph.get(from);
    if (list) list.push(edge);
    else graph.set(from, [edge]);
  };
  for (const way of network.ways) {
    const factor = costFactor(way, prefer);
    for (let i = 1; i < way.nodes.length; i++) {
      const a = way.nodes[i - 1]!;
      const b = way.nodes[i]!;
      const pa = network.nodes[String(a)];
      const pb = network.nodes[String(b)];
      if (!pa || !pb) continue;
      const cost = distanceM(pa, pb) * factor;
      add(a, { to: b, cost, way: way.id });
      add(b, { to: a, cost, way: way.id });
    }
  }
  return graph;
}

function nearestNode(network: Network, graph: Map<number, Edge[]>, point: LonLat): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const id of graph.keys()) {
    const d = distanceM(network.nodes[String(id)]!, point);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return bestD <= SNAP_MAX_M ? best : null;
}

function shortest(
  graph: Map<number, Edge[]>,
  from: number,
  to: number,
): { nodes: number[]; ways: number[] } | null {
  if (from === to) return { nodes: [from], ways: [] };
  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, { node: number; way: number }>();
  const heap = new Heap();
  heap.push([0, from]);
  while (heap.size > 0) {
    const [d, node] = heap.pop();
    if (node === to) break;
    if (d > (dist.get(node) ?? Infinity)) continue;
    for (const edge of graph.get(node) ?? []) {
      const next = d + edge.cost;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, { node, way: edge.way });
        heap.push([next, edge.to]);
      }
    }
  }
  if (!prev.has(to)) return null;
  const nodes = [to];
  const ways: number[] = [];
  let cur = to;
  while (cur !== from) {
    const step = prev.get(cur)!;
    nodes.push(step.node);
    ways.push(step.way);
    cur = step.node;
  }
  return { nodes: nodes.reverse(), ways: ways.reverse() };
}

/**
 * Cheapest foot route through each stop in order. Ways whose name contains
 * a `prefer` entry cost less, so the route follows the named trails.
 */
export function routeThrough(network: Network, stops: LonLat[], prefer: string[]): Route | null {
  if (stops.length < 2) return null;
  const graph = buildGraph(network, prefer);
  const snapped: number[] = [];
  for (const stop of stops) {
    const node = nearestNode(network, graph, stop);
    if (node == null) return null;
    snapped.push(node);
  }
  const nodes: number[] = [snapped[0]!];
  const wayIds: number[] = [];
  for (let i = 1; i < snapped.length; i++) {
    const leg = shortest(graph, snapped[i - 1]!, snapped[i]!);
    if (!leg) return null;
    nodes.push(...leg.nodes.slice(1));
    for (const way of leg.ways) {
      if (wayIds[wayIds.length - 1] !== way) wayIds.push(way);
    }
  }
  return {
    coordinates: nodes.map((id) => network.nodes[String(id)]!),
    wayIds: [...new Set(wayIds)],
  };
}

/** Metres east/north of `origin`. Close enough for a trail-sized area. */
function local(origin: LonLat, p: LonLat): [number, number] {
  const k = (Math.PI / 180) * 6371000;
  return [(p[0] - origin[0]) * k * Math.cos((origin[1] * Math.PI) / 180), (p[1] - origin[1]) * k];
}

function segmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker with the tolerance in metres. Keeps both ends. */
export function simplify<T extends LonLat | [number, number, number]>(coords: T[], toleranceM: number): T[] {
  if (coords.length <= 2) return coords;
  const origin: LonLat = [coords[0]![0], coords[0]![1]];
  const pts = coords.map((c) => local(origin, [c[0], c[1]]));
  const keep = new Array<boolean>(coords.length).fill(false);
  keep[0] = true;
  keep[coords.length - 1] = true;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let worst = -1;
    let worstD = 0;
    for (let i = start + 1; i < end; i++) {
      const d = segmentDistance(pts[i]!, pts[start]!, pts[end]!);
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst !== -1 && worstD > toleranceM) {
      keep[worst] = true;
      stack.push([start, worst], [worst, end]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

/** Points every `stepM` along the line (wider if that would pass `maxSamples`), ends included. */
export function resample(
  coords: LonLat[],
  stepM: number,
  maxSamples: number,
): { coord: LonLat; distanceM: number }[] {
  if (coords.length === 0) return [];
  const total = lineLengthM(coords);
  if (total === 0) return [{ coord: coords[0]!, distanceM: 0 }];
  const step = Math.max(stepM, total / (maxSamples - 1));
  const out: { coord: LonLat; distanceM: number }[] = [];
  let seg = 0;
  let segStart = 0;
  for (let target = 0; target < total - 1e-9; target += step) {
    while (seg < coords.length - 2 && segStart + distanceM(coords[seg]!, coords[seg + 1]!) < target) {
      segStart += distanceM(coords[seg]!, coords[seg + 1]!);
      seg++;
    }
    const a = coords[seg]!;
    const b = coords[seg + 1]!;
    const len = distanceM(a, b);
    const t = len === 0 ? 0 : Math.min(1, (target - segStart) / len);
    out.push({ coord: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], distanceM: target });
  }
  out.push({ coord: coords[coords.length - 1]!, distanceM: total });
  return out;
}

/** Shortest distance from `point` to the line, in metres. */
export function distanceToLineM(point: LonLat, coords: LonLat[]): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return distanceM(point, coords[0]!);
  const p = local(point, point);
  let best = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const d = segmentDistance(p, local(point, coords[i - 1]!), local(point, coords[i]!));
    if (d < best) best = d;
  }
  return best;
}
