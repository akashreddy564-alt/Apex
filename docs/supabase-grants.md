# Supabase grants (due before Oct 30, 2026)

After Oct 30, 2026 Supabase stops automatically giving signed-in users access to new tables. Apex's tables need explicit grants, or sync quietly stops working. Migration `007` re-applies every grant (safe to run more than once) and adds the past-hike detail columns from #17.

You run two files in the Supabase SQL Editor:

| File | What it does |
|------|--------------|
| `supabase/checks/migration_status.sql` | Read-only check. Changes nothing. |
| `supabase/migrations/007_grants_and_hike_details.sql` | The grants and the new columns. |

## Steps

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click your Apex project.
3. In the left sidebar, click **SQL Editor**, then **+ New query**.
4. Copy the check query to your clipboard (in Terminal, from the `Apex` folder):
   ```bash
   pbcopy < supabase/checks/migration_status.sql
   ```
5. Click in the editor, paste (⌘V), and click **Run** (or press ⌘↵).
6. Read the `ok` column:
   - Rows 1–6 must all say `true`. If any of them says `false`, **stop here** and send me a screenshot; an earlier migration needs to run first.
   - Rows 7–13 can say `false` for now. Step 9 fixes them.
7. Click **+ New query** again.
8. Copy the migration:
   ```bash
   pbcopy < supabase/migrations/007_grants_and_hike_details.sql
   ```
9. Paste it and click **Run**. You should see "Success. No rows returned." If Supabase warns that the query has destructive operations, that's the `revoke` lines, which only tighten access to the delete-account function. Click **Run this query**.
10. Go back to the first query tab and click **Run** again. All 13 rows should now say `true`.

If anything shows an error, send me the exact message.

## What it changes

- Grants the signed-in role (`authenticated`) read access to trails, and read/write access to hike logs, rankings and comparisons. Row-level security still limits every user to their own rows.
- Grants read access to the two map-friendly views, and lets signed-in users (only) call the delete-account function.
- Adds `distance_km`, `terrain`, `conditions`, `difficulty` and `hike_type` to `hike_logs`, and to the `hike_logs_api` view. The app doesn't send these yet; that's a separate code change.
- Does not grant anything to signed-out visitors (`anon`), and does not set blanket permissions for future tables. New tables get their own grants in their own migrations.
