# Habit hooks

Small mechanics that bring people back, borrowed from apps that are good at it. Most of them are invisible on purpose.

## Reminders (`lib/nudges.ts`, `lib/nudgeScheduler.ts`)

They're scheduled on the phone, not pushed from a server, so they work without the Apple Developer account. They're re-planned every time the app opens and every time it goes to the background, so every rule below works from current state.

| Reminder | When | Only if |
|---|---|---|
| Weekend plan | Thursday, at the hour they usually open Apex (17:00–20:00, default 19:00) | The forecast near their last hike is dry and mild, or there's no forecast |
| Keep your streak | Saturday 9:00 | They have a streak and haven't hiked this week |
| Last call | Sunday 11:00 | Same, and the streak is 3+ weeks (more to lose, so escalate) |
| Goodbye | The next day | 3 reminders in a row went unanswered. Then nothing until they open the app on their own |

Rules every reminder follows (the Duolingo-style details):

- **Nothing before the first hike.** Reminders lean on what they've done.
- **Never right after a visit.** A reminder within 12 hours of an app open is dropped.
- **Never mid-hike.** Nothing in the next 12 hours while recording.
- **Quiet hours** from 21:00 to 8:00.
- **Learned send time.** The hour they open the app most (after 3+ opens in the last 60 days).
- **Rotating wording.** Each reminder has a few versions. The pick favours what they've tapped before and rests what went out last (a simplified version of Duolingo's "recovering bandit").
- **Back-off.** After 2 ignored, only the single most important reminder is sent. After 3, the goodbye.
- **No rainy-weekend nudges.** The weather check uses the area of their last hike, rounded to about 1 km, via Open-Meteo (free, no key). It never reads the phone's location, because the location prompt promises location is only used while recording.
- **No banners over the app.** A reminder that fires while Apex is open goes quietly to Notification Center.
- **Taps are tracked.** Tapping a reminder opens the relevant screen (a saved trail, Trails, or Log) and counts toward that wording.

## Permission (`components/habit/NotificationAsk.tsx`)

- **iOS provisional access.** After the first hike, Apex asks iOS for "provisional" permission. No prompt appears; reminders arrive quietly in Notification Center with Keep / Turn off buttons.
- **Asked in context.** A card on Home and Log ("Know when the weekend looks good") asks for full alerts only after a first hike, says exactly what they'll get, and hides for 3 weeks on "Not now". If they already said no to the system prompt, it opens Settings.

## Streak (`lib/streak.ts`, `components/habit/StreakChip.tsx`)

- Weeks in a row with a hike, Monday to Sunday, local time. Weekly, so weekend hikers aren't punished.
- Shown on Home and Log. From Friday it turns amber with "hike by Sun" ("hike today" on Sunday) when the week still needs a hike.
- The first time it shows a bigger number, it pops with a success haptic.
- Known gap: a backdated past hike counts toward the week it's dated in. The spec wants backdating not to repair a broken streak, but logs don't record when they were entered yet.

## Feed

- **Loads during the opening screen**, so Home is full when it appears.
- **Double-tap a post's map or photo to like it**, with a heart burst and a light haptic. It only ever likes, never unlikes. One tap opens the hike.
- **"You're all caught up"** sits between posts that are new since you last left Home and ones you've seen. It also shows at the very end of the feed.
