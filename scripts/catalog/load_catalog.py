"""Load bulk catalog NDJSON files (bulk_extract.py) into Supabase.

Usage: APEX_DB_URL=postgresql://... python load_catalog.py <dir-or-file> ...

APEX_DB_URL is the project's direct or pooler connection string (Supabase
dashboard -> Connect). Set it in your own shell; this script never prints it.
Rows upsert by id, so a rerun updates instead of duplicating. Afterwards a bulk
row that repeats one of the 23 curated trails (same name, within 3 km) is
removed, and the counts per state are printed.
"""

import glob
import json
import os
import sys

import psycopg

BATCH = 400

UPSERT = """
insert into public.trails (
  id, name, region, distance_km, elevation_gain_m, peak_elevation_m, path,
  elevation_profile, trailhead, shape, osm_ref, source, state
)
select
  (r->>'id')::uuid,
  left(r->>'name', 120),
  left(r->>'region', 120),
  (r->>'distance_km')::numeric,
  (r->>'elevation_gain_m')::integer,
  (r->>'peak_elevation_m')::integer,
  st_setsrid(st_geomfromgeojson(jsonb_build_object('type', 'LineString', 'coordinates', r->'path')::text), 4326)::geography,
  coalesce(r->'elevation_profile', '[]'::jsonb),
  st_setsrid(st_makepoint((r->'trailhead'->>0)::float8, (r->'trailhead'->>1)::float8), 4326)::geography,
  nullif(r->>'shape', ''),
  r->>'osm_ref',
  'catalog',
  r->>'state'
from jsonb_array_elements(%s::jsonb) r
on conflict (id) do update set
  name = excluded.name, region = excluded.region, distance_km = excluded.distance_km,
  elevation_gain_m = excluded.elevation_gain_m, peak_elevation_m = excluded.peak_elevation_m,
  path = excluded.path, elevation_profile = excluded.elevation_profile, trailhead = excluded.trailhead,
  shape = excluded.shape, osm_ref = excluded.osm_ref, state = excluded.state, updated_at = now()
where public.trails.source = 'catalog'
"""

# A bulk row that repeats a curated trail goes, unless someone already hiked or ranked it.
DROP_CURATED_TWINS = """
delete from public.trails b
using public.trails c
where b.source = 'catalog' and b.state is not null
  and c.source = 'catalog' and c.state is null
  and st_dwithin(b.trailhead, c.trailhead, 3000)
  and similarity(lower(b.name), lower(c.name)) > 0.45
  and not exists (select 1 from public.hike_logs l where l.trail_id = b.id)
  and not exists (select 1 from public.trail_rankings r where r.trail_id = b.id)
"""


def files(args):
    for arg in args:
        if os.path.isdir(arg):
            yield from sorted(glob.glob(os.path.join(arg, "*.ndjson")))
        else:
            yield arg


def main():
    url = os.environ.get("APEX_DB_URL")
    if not url:
        sys.exit("Set APEX_DB_URL in your shell first (Supabase dashboard -> Connect).")
    total = 0
    with psycopg.connect(url, autocommit=False) as conn:
        for path in files(sys.argv[1:]):
            rows = [line for line in open(path) if line.strip()]
            for i in range(0, len(rows), BATCH):
                batch = "[" + ",".join(rows[i: i + BATCH]) + "]"
                with conn.cursor() as cur:
                    cur.execute(UPSERT, (batch,))
                conn.commit()
            total += len(rows)
            print(f"{os.path.basename(path)}: {len(rows)} trails", flush=True)
        with conn.cursor() as cur:
            cur.execute(DROP_CURATED_TWINS)
            print(f"removed {cur.rowcount} repeats of curated trails")
            cur.execute(
                "select coalesce(state, 'curated'), count(*) from public.trails "
                "where source = 'catalog' group by 1 order by 2 desc"
            )
            counts = cur.fetchall()
        conn.commit()
    print(f"loaded {total} rows")
    print(", ".join(f"{state} {n}" for state, n in counts))


if __name__ == "__main__":
    main()
