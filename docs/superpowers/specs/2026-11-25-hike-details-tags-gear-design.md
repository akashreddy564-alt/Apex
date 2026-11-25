# Hike details: who you hiked with, terrain and conditions, gear (2026-11-25)

Owner asked for all three for the launch build. Choices made by the owner: tag + notify; terrain on every hike plus a trail summary; a saved gear list.

## Data (migration 026)

- `hike_logs.companions uuid[]` (max 10) and `hike_logs.gear text[]` (max 12 items, 60 characters each). `terrain` and `conditions` already exist.
- A trigger cleans both before saving: companions must be people the hiker is friends with or follows, never themselves, never across a block (others are dropped silently); gear items are trimmed and empty ones dropped.
- Notification kind `tagged`: when a post exists for the hike (or companions are added later), each tagged person gets "<name> tagged you on a hike", which opens the post. Once per person per post.
- `feed_posts` / `person_posts` also return terrain, conditions, gear and companions (id, username, display name), minus anyone blocked by the viewer.
- `trail_conditions(trail)`: the terrain and condition chips hikers reported on a trail in the last 12 months, with how many hikers reported each. Counts only, never who.

## App

- **After Finish** (recorded hikes): once ranking closes, a "Hike details" sheet asks for terrain and conditions chips, who you hiked with, and gear. Everything is optional, and Skip is one tap. It opens a moment after ranking closes (never in the same instant, so iOS can't leave an invisible layer).
- **Past hikes:** the form gains "Hiked with" and "Gear" next to the existing terrain chips.
- **Gear list:** an item you type is saved on the phone and becomes a one-tap chip on later hikes. You can remove an item from the list.
- **Who you hiked with:** pick from your friends and the people you follow.
- **Posts** (feed card and hike page): "with Maya and Jordan" (each name opens their page), terrain and condition chips, and a Gear section.
- **Trail page:** "What hikers report" chips with counts, under Rankings.

## Not doing

Copying a tagged hike into the tagged person's log (the bigger Strava-style option); syncing the gear list across devices.
