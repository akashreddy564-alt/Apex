# Trail catalog scripts

Two pipelines, both from our own copy of OpenStreetMap data (Geofabrik extracts). Nothing here calls an OpenStreetMap server. Trail lines are © OpenStreetMap contributors (ODbL), and the app shows that credit wherever catalog data appears.

## Curated (23 trails, bundled in the app)

`fetch-extract.sh` → `extract_network.py` → `build.ts`. Each trail in `trails.json` lists a trailhead and the points it passes through; the build routes between them on the path network and writes `data/catalogTrails.json` plus `supabase/seed/catalog_trails.sql`.

## Bulk (every named trail in a state, on the server)

Needs Python with `osmium`, `numpy`, `Pillow` and `psycopg[binary]`:

```sh
python3 -m venv .venv && .venv/bin/pip install osmium numpy pillow "psycopg[binary]"
```

1. **Extract.** One state at a time, deleting each extract after use:

   ```sh
   PYTHON=.venv/bin/python scripts/catalog/bulk-all.sh /tmp/apex-bulk georgia:GA california:CA
   ```

   Writes `/tmp/apex-bulk/GA.ndjson` and so on. A state that already has its file is skipped, so a rerun resumes.

   What counts as a trail:
   - a named `route=hiking|foot|walking` relation, 0.5–80 km;
   - connected footpaths that share a name (`highway=path|footway|bridleway|cycleway|steps`, not sidewalks or roads), 1–80 km;
   - a named park or nature reserve whose unnamed paths add up to 1.5 km or more, when no named trail starts inside it. The trail takes the park's name.

   Each one becomes a single line (the longest walk through its pieces) that starts at its lower end. Repeats of a name within 3 km are merged into the longest. Elevation comes from AWS Terrain Tiles (USGS 3DEP in the US): a profile of up to 80 samples, climb with a 3 m dead band, and the peak. The region is the nearest town plus the state code.

2. **Load.** Set the database connection string in your own shell (Supabase dashboard → Connect → direct or session pooler). Never paste it into a file or a chat:

   ```sh
   export APEX_DB_URL='postgresql://...'
   .venv/bin/python scripts/catalog/load_catalog.py /tmp/apex-bulk
   ```

   Rows upsert by a stable id (`uuid5` of state and OSM ref), so loading again updates in place. Afterwards it removes bulk rows that repeat a curated trail and prints counts per state.

Migration `023` must be applied first (search, nearby and by-id functions, the `state` column and indexes).
