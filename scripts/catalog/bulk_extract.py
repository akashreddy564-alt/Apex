"""Bulk trail catalog: every named hiking trail in one Geofabrik state extract.

Usage: python bulk_extract.py <state.osm.pbf> <state-code> <out.ndjson>
   e.g. python bulk_extract.py georgia.osm.pbf GA out/GA.ndjson

A trail is either a named hiking route (route=hiking|foot relation) or a group
of connected footpaths that share a name. Each one becomes one line: the
longest walk through its pieces. Elevation comes from the AWS Terrain Tiles
open dataset (USGS 3DEP in the US). The region is the nearest town.

Reads only the local extract and the public terrain tiles. Never calls an
OpenStreetMap server. Lines are © OpenStreetMap contributors (ODbL).
Memory stays small: ways are picked first, then only their nodes are located.
"""

import collections
import concurrent.futures
import heapq
import io
import json
import math
import os
import re
import sys
import time
import urllib.request
import uuid

import numpy as np
import osmium
from PIL import Image

# Stable ids: the same trail gets the same uuid on every run.
NAMESPACE = uuid.UUID("2b0d7a52-5c1e-4a43-9f3e-6d1f0c9a7e11")

FOOT_HIGHWAYS = {"path", "footway", "bridleway", "cycleway", "steps"}
ROUTE_TYPES = {"hiking", "foot", "walking"}
SKIP_FOOTWAY = {"sidewalk", "crossing", "access_aisle", "traffic_island"}
PLACE_TYPES = {"city": 3, "town": 2, "village": 1}

MIN_ROUTE_KM = 0.5
MIN_NAMED_KM = 1.0
MAX_KM = 80.0
JOIN_GAP_M = 60
NAME_JOIN_M = 250
SAME_NAME_APART_M = 3000
PARK_TYPES = {"park", "nature_reserve"}
PARK_MIN_M2 = 20_000
PARK_MAX_M2 = 40_000_000
MIN_PARK_KM = 1.5
UNNAMED_HIGHWAYS = {"path", "footway", "bridleway", "steps"}
SIMPLIFY_M = 6
MAX_POINTS = 400
PROFILE_POINTS = 80
ELEV_STEP_M = 30
TILE_Z = 12

GENERIC = {
    "path", "trail", "footpath", "footway", "sidewalk", "walkway", "connector",
    "connector trail", "spur", "spur trail", "bike path", "bike trail", "multi-use path",
    "multi-use trail", "greenway", "walking path", "walking trail", "nature trail",
    "unnamed", "unnamed trail", "access trail", "service road", "fire road", "crosswalk",
}
ROAD_SUFFIX = re.compile(
    r"\b(street|st|road|rd|avenue|ave|drive|dr|boulevard|blvd|lane|ln|highway|hwy|"
    r"parkway|pkwy|court|ct|place|pl|circle|cir|terrace|ter|alley|sidewalk|crossing)\.?$",
    re.I,
)


def keep_name(name):
    clean = name.strip()
    low = clean.lower()
    if len(clean) < 4 or low in GENERIC:
        return False
    if ROAD_SUFFIX.search(clean):
        return False
    return True


def norm(name):
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def haversine(a, b):
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6_371_000 * math.asin(min(1.0, math.sqrt(h)))


def line_length(coords):
    return sum(haversine(coords[i], coords[i + 1]) for i in range(len(coords) - 1))


# --------------------------------------------------------------------------
# Reading the extract in three passes.
# --------------------------------------------------------------------------


def read_routes(pbf):
    routes = []
    members = set()
    proc = osmium.FileProcessor(pbf, osmium.osm.RELATION).with_filter(osmium.filter.KeyFilter("route"))
    for rel in proc:
        tags = rel.tags
        if tags.get("type") not in ("route", None) or tags.get("route") not in ROUTE_TYPES:
            continue
        name = tags.get("name")
        if not name or not keep_name(name):
            continue
        ways = [m.ref for m in rel.members if m.type == "w"]
        if not ways:
            continue
        routes.append({"id": rel.id, "name": name.strip(), "ways": ways})
        members.update(ways)
    return routes, members


def read_ways(pbf, members):
    ways = {}
    named = []
    unnamed = []
    parks = []
    proc = osmium.FileProcessor(pbf, osmium.osm.WAY).with_filter(
        osmium.filter.KeyFilter("highway", "leisure", "boundary")
    )
    for way in proc:
        tags = way.tags
        name = tags.get("name")
        highway = tags.get("highway")
        if highway is None:
            # A park drawn as one closed outline. Its unnamed paths can become a trail.
            if (
                name
                and (tags.get("leisure") in PARK_TYPES or tags.get("boundary") == "protected_area")
                and len(way.nodes) >= 4
                and way.nodes[0].ref == way.nodes[-1].ref
            ):
                refs = [n.ref for n in way.nodes]
                ways[way.id] = refs
                parks.append((way.id, name.strip()))
            continue
        in_route = way.id in members
        usable = (
            tags.get("area") != "yes"
            and tags.get("footway") not in SKIP_FOOTWAY
            and tags.get("access") not in ("private", "no")
            and tags.get("foot") not in ("private", "no")
        )
        if not in_route and usable and highway in UNNAMED_HIGHWAYS and (name is None or not keep_name(name)):
            refs = [n.ref for n in way.nodes]
            if len(refs) >= 2:
                ways[way.id] = refs
                unnamed.append(way.id)
            continue
        candidate = name is not None and highway in FOOT_HIGHWAYS and usable and keep_name(name)
        if not in_route and not candidate:
            continue
        refs = [n.ref for n in way.nodes]
        if len(refs) < 2:
            continue
        ways[way.id] = refs
        if candidate:
            named.append((way.id, name.strip()))
    # Routes may also reach member ways without highway tags (rare). Skip those.
    return ways, named, unnamed, parks


def read_nodes(pbf, wanted):
    locs = {}
    places = []
    proc = osmium.FileProcessor(pbf, osmium.osm.NODE)
    for node in proc:
        if node.id in wanted:
            loc = node.location
            if loc.valid():
                locs[node.id] = (round(loc.lon, 6), round(loc.lat, 6))
        place = node.tags.get("place") if len(node.tags) else None
        if place in PLACE_TYPES and node.tags.get("name"):
            loc = node.location
            if loc.valid():
                places.append((loc.lon, loc.lat, node.tags.get("name"), PLACE_TYPES[place]))
    return locs, places


# --------------------------------------------------------------------------
# Turning a set of ways into one walkable line.
# --------------------------------------------------------------------------


def longest_walk(way_ids, ways, locs, gap_m=JOIN_GAP_M):
    """The longest shortest-path through the pieces (tree diameter), as coords."""
    edges = []
    for wid in way_ids:
        refs = ways.get(wid)
        if not refs:
            continue
        coords = [locs[r] for r in refs if r in locs]
        if len(coords) < 2 or len(coords) != len(refs):
            continue
        if refs[0] == refs[-1]:
            # A closed way is one loop: split it in two so it reads as a ring.
            if len(refs) < 4:
                continue
            mid = len(refs) // 2
            half = ("mid", wid)
            first, second = coords[: mid + 1], coords[mid:]
            edges.append((refs[0], half, first, line_length(first)))
            edges.append((half, refs[-1], second, line_length(second)))
            continue
        edges.append((refs[0], refs[-1], coords, line_length(coords)))
    if not edges:
        return None, 0.0, False

    graph = collections.defaultdict(list)
    ends = {}
    for i, (a, b, coords, length) in enumerate(edges):
        graph[a].append((b, i, length))
        graph[b].append((a, i, length))
        ends[a] = coords[0]
        ends[b] = coords[-1]

    # Close small gaps between pieces so a route with a missing link stays one line.
    scale = 111_000 / max(gap_m, 1) / 1.2
    cell = collections.defaultdict(list)
    for nid, (lon, lat) in ends.items():
        cell[(round(lon * scale), round(lat * scale))].append(nid)
    for (cx, cy), nids in list(cell.items()):
        near = [n for dx in (-1, 0, 1) for dy in (-1, 0, 1) for n in cell.get((cx + dx, cy + dy), [])]
        for a in nids:
            for b in near:
                if str(a) < str(b) and haversine(ends[a], ends[b]) <= gap_m:
                    graph[a].append((b, -1, 0.0))
                    graph[b].append((a, -1, 0.0))

    total = sum(e[3] for e in edges)

    def farthest(src):
        dist = {src: 0.0}
        prev = {}
        tick = 0
        heap = [(0.0, tick, src)]
        while heap:
            d, _, n = heapq.heappop(heap)
            if d > dist.get(n, math.inf):
                continue
            for m, edge, length in graph[n]:
                nd = d + length
                if nd < dist.get(m, math.inf):
                    dist[m] = nd
                    prev[m] = (n, edge)
                    tick += 1
                    heapq.heappush(heap, (nd, tick, m))
        far = max(dist, key=dist.get)
        return far, dist, prev

    # Start from the biggest connected piece.
    start = max(graph, key=lambda n: len(graph[n]))
    a, dist0, _ = farthest(start)
    component = set(dist0)
    b, dist, prev = farthest(a)

    chain = []
    node = b
    while node != a:
        n, edge = prev[node]
        if edge >= 0:
            s, e, coords, _ = edges[edge]
            # Walk the edge in the direction n -> node.
            piece = coords if s == n else list(reversed(coords))
            chain.append(piece)
        node = n
    chain.reverse()
    line = []
    for piece in chain:
        if line and line[-1] == piece[0]:
            line.extend(piece[1:])
        else:
            line.extend(piece)
    if len(line) < 2:
        return None, 0.0, False

    walk = line_length(line)
    # A closed ring of one name (every node meets two pieces) is a loop.
    comp_edges = {i for n in component for _, i, _ in graph[n] if i >= 0}
    degrees = [len([1 for _, i, _ in graph[n] if i >= 0]) for n in component]
    comp_len = sum(edges[i][3] for i in comp_edges)
    is_loop = bool(degrees) and all(d == 2 for d in degrees) and len(comp_edges) >= 1
    if is_loop:
        # The diameter of a ring is half of it; walk the whole ring instead.
        ring = ring_walk(comp_edges, edges)
        if ring:
            return ring, comp_len, True
    if walk < 0.35 * total and walk < 1000:
        return None, 0.0, False
    return line, walk, False


def ring_walk(edge_ids, edges):
    remaining = set(edge_ids)
    first = remaining.pop()
    s, e, coords, _ = edges[first]
    line = list(coords)
    tail = e
    while remaining:
        nxt = next((i for i in remaining if edges[i][0] == tail or edges[i][1] == tail), None)
        if nxt is None:
            break
        remaining.discard(nxt)
        a, b, c, _ = edges[nxt]
        piece = c if a == tail else list(reversed(c))
        tail = b if a == tail else a
        line.extend(piece[1:])
    return line if len(line) >= 3 else None


# --------------------------------------------------------------------------
# Geometry helpers.
# --------------------------------------------------------------------------


def simplify(coords, tol_m):
    if len(coords) <= 2:
        return coords
    lat0 = math.radians(coords[0][1])
    kx = 111_320 * math.cos(lat0)
    ky = 110_540
    pts = [(lon * kx, lat * ky) for lon, lat in coords]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = pts[i]
        bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        seg = dx * dx + dy * dy
        best, idx = -1.0, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if seg == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > best:
                best, idx = d, k
        if best > tol_m:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [c for c, k in zip(coords, keep) if k]


def resample(coords, step_m):
    """Points every step_m along the line, with their distance from the start."""
    out = [(0.0, coords[0])]
    along = 0.0
    next_at = step_m
    for i in range(len(coords) - 1):
        a, b = coords[i], coords[i + 1]
        seg = haversine(a, b)
        while seg > 0 and next_at <= along + seg:
            t = (next_at - along) / seg
            out.append((next_at, (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))))
            next_at += step_m
        along += seg
    if out[-1][0] < along:
        out.append((along, coords[-1]))
    return out


# --------------------------------------------------------------------------
# Elevation from AWS Terrain Tiles (terrarium PNGs, open data, no key).
# --------------------------------------------------------------------------

TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def tile_xy(lon, lat, z=TILE_Z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    lat_r = math.radians(lat)
    y = (1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n
    return x, y


def fetch_tile(key):
    x, y = key
    url = TILE_URL.format(z=TILE_Z, x=x, y=y)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as res:
                img = Image.open(io.BytesIO(res.read())).convert("RGB")
            arr = np.asarray(img, dtype=np.float32)
            elev = arr[:, :, 0] * 256 + arr[:, :, 1] + arr[:, :, 2] / 256 - 32768
            return key, elev.astype(np.float32)
        except Exception:  # noqa: BLE001 - retry any network or decode failure
            time.sleep(1.5 * (attempt + 1))
    return key, None


class Tiles:
    def __init__(self):
        self.cache = {}

    def ensure(self, keys):
        missing = [k for k in keys if k not in self.cache]
        if not missing:
            return
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            for key, arr in pool.map(fetch_tile, missing):
                self.cache[key] = arr

    def drop_except(self, keep):
        for k in list(self.cache):
            if k not in keep:
                del self.cache[k]

    def elevation(self, lon, lat):
        fx, fy = tile_xy(lon, lat)
        tx, ty = int(fx), int(fy)
        arr = self.cache.get((tx, ty))
        if arr is None:
            return None
        px = min(255.0, max(0.0, (fx - tx) * 256 - 0.5))
        py = min(255.0, max(0.0, (fy - ty) * 256 - 0.5))
        x0, y0 = int(px), int(py)
        x1, y1 = min(255, x0 + 1), min(255, y0 + 1)
        dx, dy = px - x0, py - y0
        top = arr[y0, x0] * (1 - dx) + arr[y0, x1] * dx
        bottom = arr[y1, x0] * (1 - dx) + arr[y1, x1] * dx
        return float(top * (1 - dy) + bottom * dy)


def tiles_for(samples):
    keys = set()
    for _, (lon, lat) in samples:
        fx, fy = tile_xy(lon, lat)
        keys.add((int(fx), int(fy)))
    return keys


def climb(elevs):
    """Total climb with a 3-sample smoothing and a 3 m dead band against DEM noise."""
    if len(elevs) < 2:
        return 0.0
    sm = [sum(elevs[max(0, i - 1): i + 2]) / len(elevs[max(0, i - 1): i + 2]) for i in range(len(elevs))]
    gain = 0.0
    ref = sm[0]
    for v in sm[1:]:
        if v - ref >= 3:
            gain += v - ref
            ref = v
        elif ref - v >= 3:
            ref = v
    return gain


# --------------------------------------------------------------------------
# Regions.
# --------------------------------------------------------------------------


class Places:
    def __init__(self, places):
        self.grid = collections.defaultdict(list)
        for p in places:
            self.grid[(int(p[0] * 4), int(p[1] * 4))].append(p)

    def nearest(self, lon, lat):
        best, best_score = None, math.inf
        cx, cy = int(lon * 4), int(lat * 4)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for p in self.grid.get((cx + dx, cy + dy), []):
                    d = haversine((lon, lat), (p[0], p[1]))
                    # Towns and cities win over a closer village a little.
                    score = d / (1 + 0.35 * (p[3] - 1))
                    if d <= 30_000 and score < best_score:
                        best, best_score = p, score
        return best[2] if best else None


# --------------------------------------------------------------------------
# Parks whose paths have no names (Cauley Creek Park and the like), and
# one trail per name per place.
# --------------------------------------------------------------------------


def ring_area_m2(coords):
    lat0 = math.radians(sum(c[1] for c in coords) / len(coords))
    kx, ky = 111_320 * math.cos(lat0), 110_540
    pts = [(lon * kx, lat * ky) for lon, lat in coords]
    return abs(sum(pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1] for i in range(len(pts) - 1))) / 2


def inside_ring(lon, lat, ring):
    hit = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi:
            hit = not hit
        j = i
    return hit


def park_trails(parks, unnamed, ways, locs, named_candidates):
    rings = []
    for pid, name in parks:
        refs = ways.get(pid, [])
        ring = [locs[r] for r in refs if r in locs]
        if len(ring) < 4 or len(ring) != len(refs):
            continue
        area = ring_area_m2(ring)
        if not (PARK_MIN_M2 <= area <= PARK_MAX_M2):
            continue
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        rings.append(
            {"id": pid, "name": name, "ring": ring, "area": area, "box": (min(lons), min(lats), max(lons), max(lats)), "ways": []}
        )
    if not rings:
        return []
    grid = collections.defaultdict(list)
    for i, park in enumerate(rings):
        x0, y0, x1, y1 = park["box"]
        for gx in range(int(x0 * 20), int(x1 * 20) + 1):
            for gy in range(int(y0 * 20), int(y1 * 20) + 1):
                grid[(gx, gy)].append(i)

    def park_at(lon, lat):
        best = None
        for i in grid.get((int(lon * 20), int(lat * 20)), []):
            x0, y0, x1, y1 = rings[i]["box"]
            if x0 <= lon <= x1 and y0 <= lat <= y1 and inside_ring(lon, lat, rings[i]["ring"]):
                # The smallest park wins (a park inside a bigger reserve).
                if best is None or rings[i]["area"] < rings[best]["area"]:
                    best = i
        return best

    for wid in unnamed:
        refs = ways[wid]
        mid = refs[len(refs) // 2]
        if mid not in locs:
            continue
        i = park_at(*locs[mid])
        if i is not None:
            rings[i]["ways"].append(wid)

    # A park that already has a named trail starting in it is covered by that trail.
    covered = set()
    for name, ref, line, length, loop in named_candidates:
        i = park_at(*line[0])
        if i is not None:
            covered.add(i)

    out = []
    debug = os.environ.get("APEX_DEBUG_PARK", "").lower()
    for i, park in enumerate(rings):
        if debug and debug in park["name"].lower():
            line, length, loop = longest_walk(park["ways"], ways, locs, JOIN_GAP_M) if park["ways"] else (None, 0, False)
            total = sum(line_length([locs[r] for r in ways[w] if r in locs]) for w in park["ways"])
            print(f"debug park {park['name']}: covered={i in covered} ways={len(park['ways'])} walk={length:.0f}m total={total:.0f}m", flush=True)
        if i in covered or not park["ways"]:
            continue
        line, length, loop = longest_walk(park["ways"], ways, locs, JOIN_GAP_M)
        # A park's paths branch, so judge it by the whole network, and show the
        # longest single walk through it as the line.
        total = sum(line_length([locs[r] for r in ways[w] if r in locs]) for w in park["ways"])
        if not line or total < MIN_PARK_KM * 1000 or length < 500 or length > MAX_KM * 1000:
            continue
        out.append((park["name"], f"park/{park['id']}", line, length, loop))
    return out


def one_per_place(candidates):
    """Same name within a few km is the same trail: keep the longest."""
    kept = []
    by_name = collections.defaultdict(list)
    for cand in sorted(candidates, key=lambda c: -c[3]):
        name, ref, line, length, loop = cand
        ends = (line[0], line[-1], line[len(line) // 2])
        twins = by_name[norm(name)]
        if any(haversine(a, b) <= SAME_NAME_APART_M for other in twins for a in ends for b in other):
            continue
        twins.append(ends)
        kept.append(cand)
    return kept


# --------------------------------------------------------------------------


def main():
    pbf, state, out_path = sys.argv[1:4]
    t0 = time.time()
    routes, members = read_routes(pbf)
    print(f"{state}: {len(routes)} named routes", flush=True)
    ways, named, unnamed, parks = read_ways(pbf, members)
    print(f"{state}: {len(ways)} ways ({len(named)} named footpaths, {len(unnamed)} unnamed, {len(parks)} parks)", flush=True)
    wanted = set()
    for refs in ways.values():
        wanted.update(refs)
    locs, places = read_nodes(pbf, wanted)
    print(f"{state}: located {len(locs)} nodes, {len(places)} towns in {time.time() - t0:.0f}s", flush=True)
    towns = Places(places)

    candidates = []
    route_ways = set()
    seen_routes = set()
    for route in routes:
        line, length, loop = longest_walk(route["ways"], ways, locs)
        if not line or not (MIN_ROUTE_KM * 1000 <= length <= MAX_KM * 1000):
            continue
        key = (norm(route["name"]), round(line[0][0], 2), round(line[0][1], 2))
        if key in seen_routes:
            continue
        seen_routes.add(key)
        route_ways.update(route["ways"])
        candidates.append((route["name"], f"relation/{route['id']}", line, length, loop))

    # Footpaths that share a name and touch (or nearly touch) are one trail.
    by_name = collections.defaultdict(list)
    for wid, name in named:
        by_name[norm(name)].append((wid, name))
    for _, items in by_name.items():
        parent = {wid: wid for wid, _ in items}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        endpoint = collections.defaultdict(list)
        cell = collections.defaultdict(list)
        for wid, _ in items:
            refs = ways[wid]
            for r in (refs[0], refs[-1]):
                endpoint[r].append(wid)
                if r in locs:
                    lon, lat = locs[r]
                    cell[(round(lon * 370), round(lat * 370))].append((wid, r))
        for wids in endpoint.values():
            for w in wids[1:]:
                parent[find(w)] = find(wids[0])
        # A piece that ends in the middle of another one joins it too.
        for wid, _ in items:
            for r in ways[wid][1:-1]:
                if r in endpoint:
                    for w in endpoint[r]:
                        parent[find(w)] = find(wid)
        for (cx, cy), pts in cell.items():
            near = [p for dx in (-1, 0, 1) for dy in (-1, 0, 1) for p in cell.get((cx + dx, cy + dy), [])]
            for wa, ra in pts:
                for wb, rb in near:
                    if wa != wb and find(wa) != find(wb) and haversine(locs[ra], locs[rb]) <= NAME_JOIN_M:
                        parent[find(wb)] = find(wa)
        groups = collections.defaultdict(list)
        for wid, name in items:
            groups[find(wid)].append(wid)
        name = collections.Counter(n for _, n in items).most_common(1)[0][0]
        for wids in groups.values():
            if sum(1 for w in wids if w in route_ways) >= 0.5 * len(wids):
                continue
            line, length, loop = longest_walk(wids, ways, locs, NAME_JOIN_M)
            if not line or not (MIN_NAMED_KM * 1000 <= length <= MAX_KM * 1000):
                continue
            candidates.append((name, f"way/{min(wids)}+{len(wids)}", line, length, loop))

    candidates.extend(park_trails(parks, unnamed, ways, locs, candidates))
    candidates = one_per_place(candidates)
    print(f"{state}: {len(candidates)} trails, adding elevation", flush=True)

    # Elevation, in batches sorted by area so tiles are fetched once.
    def area_key(c):
        fx, fy = tile_xy(*c[2][0])
        return (int(fx) // 4, int(fy) // 4)

    candidates.sort(key=area_key)
    tiles = Tiles()
    written = 0
    with open(out_path, "w") as out:
        batch = 400
        for start in range(0, len(candidates), batch):
            chunk = candidates[start: start + batch]
            sampled = []
            needed = set()
            for name, ref, line, length, loop in chunk:
                step = max(ELEV_STEP_M, length / 1500)
                samples = resample(line, step)
                sampled.append(samples)
                needed |= tiles_for(samples)
            tiles.drop_except(needed)
            tiles.ensure(needed)
            for (name, ref, line, length, loop), samples in zip(chunk, sampled):
                elevs = [tiles.elevation(lon, lat) for _, (lon, lat) in samples]
                if any(e is None for e in elevs):
                    continue
                if not loop and elevs[0] > elevs[-1]:
                    # Trailheads are usually at the bottom: start from the low end.
                    line = list(reversed(line))
                    total = samples[-1][0]
                    samples = [(total - d, pt) for d, pt in reversed(samples)]
                    elevs = list(reversed(elevs))
                gain = climb(elevs)
                every = max(1, math.ceil(len(samples) / PROFILE_POINTS))
                profile = [
                    {"distance_m": round(d), "elevation_m": round(e)}
                    for i, ((d, _), e) in enumerate(zip(samples, elevs))
                    if i % every == 0 or i == len(samples) - 1
                ]
                tol = SIMPLIFY_M
                path = simplify(line, tol)
                while len(path) > MAX_POINTS:
                    tol *= 1.6
                    path = simplify(line, tol)
                head = line[0]
                town = towns.nearest(*head)
                region = f"{town}, {state}" if town else state
                row = {
                    "id": str(uuid.uuid5(NAMESPACE, f"{state}:{ref}")),
                    "name": name,
                    "region": region,
                    "state": state,
                    "distance_km": round(length / 1000, 2),
                    "elevation_gain_m": round(gain),
                    "peak_elevation_m": round(max(elevs)),
                    "path": [[round(lon, 5), round(lat, 5)] for lon, lat in path],
                    "elevation_profile": profile,
                    "trailhead": [round(head[0], 6), round(head[1], 6)],
                    "shape": "loop" if loop else None,
                    "osm_ref": ref,
                }
                out.write(json.dumps(row, separators=(",", ":")) + "\n")
                written += 1
            print(f"{state}: {min(start + batch, len(candidates))}/{len(candidates)}", flush=True)
    print(f"{state}: wrote {written} trails in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
