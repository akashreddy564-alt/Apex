#!/usr/bin/env bash
# Step 1: download one Geofabrik state extract, cut the networks around its
# curated trails, then delete the extract.
#
# Usage: scripts/catalog/fetch-extract.sh <geofabrik-region> <network-dir>
#   e.g. scripts/catalog/fetch-extract.sh utah /tmp/apex-networks
# Needs: python3 with `pip install osmium` (see README.md). PYTHON overrides it.
set -euo pipefail

region="$1"
out="$2"
here="$(cd "$(dirname "$0")" && pwd)"
python="${PYTHON:-python3}"
url="https://download.geofabrik.de/north-america/us/${region}-latest.osm.pbf"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

size=$(curl -sIL "$url" | awk 'tolower($1)=="content-length:"{n=$2} END{print n+0}')
echo "Downloading $region ($((size / 1000000)) MB) from Geofabrik"
curl -fSL --progress-bar -o "$tmp/extract.osm.pbf" "$url"
mkdir -p "$out"
"$python" -I "$here/extract_network.py" "$tmp/extract.osm.pbf" "$region" "$here/trails.json" "$out"
echo "Deleted the extract. Networks are in $out"
