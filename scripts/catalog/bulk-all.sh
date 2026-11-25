#!/usr/bin/env bash
# Bulk catalog for many states: download one Geofabrik extract at a time,
# extract its trails, delete the extract. Disk use stays at one state.
#
# Usage: scripts/catalog/bulk-all.sh <out-dir> <geofabrik-name>:<CODE> ...
#   e.g. scripts/catalog/bulk-all.sh /tmp/apex-bulk georgia:GA new-york:NY
# Needs python with osmium, numpy and Pillow (PYTHON overrides python3).
# A state whose <CODE>.ndjson already exists is skipped, so a rerun resumes.
set -uo pipefail

out="$1"; shift
here="$(cd "$(dirname "$0")" && pwd)"
python="${PYTHON:-python3}"
mkdir -p "$out"
for pair in "$@"; do
  region="${pair%%:*}"
  code="${pair##*:}"
  if [ -s "$out/$code.ndjson" ]; then
    echo "$code: done already"
    continue
  fi
  pbf="$out/$region.osm.pbf"
  url="https://download.geofabrik.de/north-america/us/${region}-latest.osm.pbf"
  echo "$code: downloading $region"
  # Ride out Wi-Fi drops: retry every kind of failure for up to ~10 minutes.
  if ! curl -fsSL --retry 20 --retry-all-errors --retry-delay 30 -o "$pbf" "$url"; then
    echo "$code: download failed"
    rm -f "$pbf"
    continue
  fi
  if "$python" -I "$here/bulk_extract.py" "$pbf" "$code" "$out/$code.ndjson.part"; then
    mv "$out/$code.ndjson.part" "$out/$code.ndjson"
  else
    echo "$code: extract failed"
    rm -f "$out/$code.ndjson.part"
  fi
  rm -f "$pbf"
done
echo "all done"
