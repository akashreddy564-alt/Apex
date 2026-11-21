# Weekend pick: design

**Parent:** `2026-10-16-apex-launch-design.md`, feature 7: "One trail suggestion each week, based on how the user ranks hikes. It shows on the home screen from midweek." This is the last open piece of plan 4. Approved 2026-11-21 (option A).

## Why

Picture someone at their desk on a Wednesday. Apex should hand them one trail they'll probably like this weekend, along with the reason it was chosen. That way "go hiking" turns into a plan before Saturday.

## Approaches

- **A · Pick on the phone from your own rankings (chosen).** Uses the rankings, saved trails, catalog and hike logs that are already on the phone. It needs no migration, works offline and doesn't depend on the owner.
- B · Pick on the server and mix in friends' rankings. Needs a new migration while `011` to `013` are still unrun. Left for later.
- C · Pick only from friends' Loved trails. Empty for people with no friends yet, and it ignores the user's own taste.

## Design

- **When it shows:** Home, between "this week" (streak and goal) and the feed, from Wednesday through Sunday in local time. It is hidden Monday and Tuesday, and hidden when the user has no Loved trail that has both distance and gain.
- **Which trails can be picked:** catalog trails, plus any trail the user saved that is in the trail cache. A trail is left out if the user has hiked or ranked it, including a ranked demo trail with the same name. It is also left out if it has no distance or gain, or if it is more than 150 mi from home base.
- **Home base:** the start of the user's newest hike (the same rounded point the forecast uses). If there are no hikes, the trailhead of their top Loved trail.
- **Score:** each candidate is compared with every Loved trail as `|ln(distance ratio)| + |ln(gain ratio)|`, and the closest match counts. Saved trails get 0.5 subtracted. Each 100 mi from home adds 0.2. The lowest score wins, with ties going to the lower id. The pick stays the same all week because the inputs only change when the user hikes or saves.
- **"Not this one":** skips to the next best trail. Skips are stored per week, Monday to Sunday, and reset the next week. Once every candidate has been skipped, the card goes away for the week.
- **Card:**
  - the eyebrow "WEEKEND PICK", the trail name, the region, and distance and climb
  - up to two reason lines, each shown only when the data supports it:
    - "Saved", when the user saved the trail from a post
    - "Like X", when the closest match is less than 0.6 away
    - "N mi", the distance from where the user last hiked, only when home base comes from a real hike
  - a weather line, only if the cached weekend forecast exists and a day is good for hiking. It never triggers a fetch of its own.
- **Actions:** tapping the card opens the trail page. "Not this one" skips the pick.
- **Code layout:**
  - `lib/weekendPick.ts`: pure, with node tests
  - `stores/weekendPickStore.ts`: skips, persisted
  - `hooks/useWeekendPick.ts`
  - `components/habit/WeekendPick.tsx`: follows the craft-pass card rules (`cardStyle`, Eyebrow, ReasonLine, tokens, Reduce Motion)

## Not in this change

- Friends' rankings (option B).
- Changes to the weekend reminder copy.
- A pick for people who haven't ranked anything.

## Builder's calls

- The 150 mi radius, the 0.5 saved bonus, the 0.2-per-100-mi weight and the 0.6 "Like" threshold.
- Matching demo trails by name.
- Folding the plan into this document, because the change is small (four files and a Home edit).
