"""Cut the foot network around each curated trail out of one Geofabrik extract.

Usage: python extract_network.py <state.osm.pbf> <extract-name> <trails.json> <out-dir>

Writes <out-dir>/<slug>.network.json for every trail whose "extract" is
<extract-name>: {"nodes": {id: [lon, lat]}, "ways": [...], "pois": [...]}.
POIs (peaks, parking, trailheads, viewpoints) help correct curated points.
Reads only the local file; never calls an OpenStreetMap server.
"""

import json
import math
import sys

import osmium

PAD_M = 3000
SKIP_HIGHWAYS = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}
POI_TAGS = {
    "natural": {"peak", "saddle", "waterfall", "cave_entrance"},
    "highway": {"trailhead"},
    "amenity": {"parking"},
    "tourism": {"viewpoint", "alpine_hut", "wilderness_hut"},
}


def bbox(trail):
    points = [trail["trailhead"], *trail["via"]]
    lat0 = sum(p[1] for p in points) / len(points)
    dlat = PAD_M / 111_320
    dlon = PAD_M / (111_320 * math.cos(math.radians(lat0)))
    return (
        min(p[0] for p in points) - dlon,
        min(p[1] for p in points) - dlat,
        max(p[0] for p in points) + dlon,
        max(p[1] for p in points) + dlat,
    )


def inside(box, lon, lat):
    return box[0] <= lon <= box[2] and box[1] <= lat <= box[3]


def main():
    pbf, extract, trails_path, out_dir = sys.argv[1:5]
    with open(trails_path) as f:
        trails = [t for t in json.load(f) if t["extract"] == extract]
    if not trails:
        sys.exit(f"no curated trails use extract {extract!r}")
    boxes = {t["slug"]: bbox(t) for t in trails}
    found = {slug: {"nodes": {}, "ways": [], "pois": []} for slug in boxes}

    processor = (
        osmium.FileProcessor(pbf)
        .with_locations()
        .with_filter(osmium.filter.EmptyTagFilter())
        .with_filter(osmium.filter.KeyFilter("highway", "natural", "amenity", "tourism"))
    )
    for obj in processor:
        if obj.is_node():
            tags = obj.tags
            kind = next((k for k, vals in POI_TAGS.items() if tags.get(k) in vals), None)
            if kind is None:
                continue
            lon, lat = obj.location.lon, obj.location.lat
            for slug, box in boxes.items():
                if inside(box, lon, lat):
                    found[slug]["pois"].append(
                        {"id": obj.id, "kind": f"{kind}={tags.get(kind)}", "name": tags.get("name"), "at": [lon, lat]}
                    )
        elif obj.is_way():
            highway = obj.tags.get("highway")
            if not highway or highway in SKIP_HIGHWAYS or obj.tags.get("area") == "yes":
                continue
            try:
                coords = [(n.ref, n.location.lon, n.location.lat) for n in obj.nodes]
            except osmium.InvalidLocationError:
                continue
            for slug, box in boxes.items():
                if any(inside(box, lon, lat) for _, lon, lat in coords):
                    entry = found[slug]
                    for ref, lon, lat in coords:
                        entry["nodes"][str(ref)] = [round(lon, 7), round(lat, 7)]
                    entry["ways"].append(
                        {
                            "id": obj.id,
                            "name": obj.tags.get("name"),
                            "highway": highway,
                            "nodes": [ref for ref, _, _ in coords],
                        }
                    )

    for slug, network in found.items():
        path = f"{out_dir}/{slug}.network.json"
        with open(path, "w") as f:
            json.dump(network, f)
        print(f"{slug}: {len(network['ways'])} ways, {len(network['pois'])} pois -> {path}")


if __name__ == "__main__":
    main()
