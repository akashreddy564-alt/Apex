# Test day guide (2026-11-25)

How to run the [launch test plan](2026-11-25-launch-test-plan.md) for real: what to bring, where to be, how long each part takes, and what to do when something breaks. The checklist lives in the plan. This guide is the order of the day.

## Short answers

- **Do I need a real trail? No.** Every launch check works on a sidewalk. Apex records any walk, and the trail-specific screens (Angels Landing scrubber, catalog trails, flyover from a trail page) use trail data that's already in the app. Your recorded climb will be small and a bit noisy on flat ground, which is fine. A real hike this weekend is a nice extra (it's the only way to see a long route's memory use), not a blocker.
- **Can I do it from a cafe? Yes,** with two conditions:
  1. **Run the network through your phone's hotspot**, not cafe Wi-Fi (see "The cafe setup" below).
  2. **Record outside.** Apex drops GPS points that are worse than 25 m accurate, and indoors most points are. A hike recorded at your table will show almost nothing.
- **The walk to the cafe is the GPS test.** Start a recording at home, lock the phone, walk there, and finish at the cafe. That covers the oldest open item on the roadmap (recording with the screen locked).
- **How long? About 5–6 hours in all:** about 1 hour at home, a 15–30 min walk, then 3–4 hours at the cafe including fixes. It breaks down below.

## Before anything: can the app go on your phone?

EAS has only ever made **simulator** builds (three, from Oct 17). A build for your actual iPhone needs:

1. **An active, paid Apple Developer membership.** If Apple hasn't approved the enrollment yet, nothing in this guide can run on the phone; tell Claude and we'll do what the simulator can cover instead.
2. **Your iPhone registered with EAS:** `npx eas-cli device:create`, then open the link it shows on the phone and install the profile. One time only.
3. **Developer Mode on the iPhone:** Settings → Privacy & Security → Developer Mode → on, then restart. iOS asks for this the first time you open a dev build.

## Timeline

### At home (about 1 hour)

| Time | Who | What |
|---|---|---|
| 0:00 | You | Register the phone (above). Then start the build: `npx eas-cli build --profile development --platform ios`. The first time, it asks for your Apple ID and makes the certificates. Say yes to everything it offers to create. |
| 0:05–0:35 | Claude | The build runs in the cloud (~20–30 min). Meanwhile: the web check of the new screens at 390×844 (plan, Phase 0). The rest of Phase 0 is done. |
| 0:35 | You | Install the build from the link EAS shows (open it on the phone). |
| 0:40 | Claude, then you | Claude starts Metro (`apex-metro`). On home Wi-Fi, open the app and connect it to the Mac. |
| 0:45 | You | **Plan 2.1 and 2.2 at home,** on home Wi-Fi: first launch, opening, magic link to your email, username, terms. Sign-in emails reach your inbox fastest here. |
| 0:55 | You | Charge check: the phone needs **80%+** for the walk. |

### The walk (15–30 min): plan 2.3

1. Make sure location is set to **Always** for Apex (Settings → Apex → Location). If it only offers While Using, that is itself something to note for 2.10.
2. On Log, slide to start a hike. Try sliding again at once (it must not start a second hike).
3. **Lock the phone and put it in your pocket.** Don't open it for at least 5 minutes.
4. Walk to the cafe. Metro will lose the phone when you leave home. That's fine: the app keeps running the code it already loaded and keeps recording. Just don't swipe the app away.
5. Outside the cafe, still outdoors, unlock: check that the line on the map has no gap where the phone was locked.
6. Don't tap Finish yet. Do it at the table once the Mac is connected, so Claude sees the flyover, ranking and sync logs.

> **If the app was killed on the way** (it reopens to a white screen or asks for a server): note it as a P0 for 2.12, reconnect to Metro at the cafe, and record a second walk around the block.

### At the cafe (3–4 hours)

**Setup (10 min):**
1. Turn on your iPhone's Personal Hotspot. Join it from the Mac.
2. Claude restarts Metro. The app reconnects (shake it → Reload if it doesn't).
3. Plug in both. The flyover, GPS and video export drain the battery fast.

**The pass (2.5–3 hours), in plan order:**

| Plan | ~Time | Notes |
|---|---|---|
| 2.3 finish | 10 min | Tap Finish: flyover, Skip, trail sheet. Then the **airplane-mode Finish**: needs a second short recording, so do a lap outside first (5 min). |
| 2.4 ranking | 15 min | |
| 2.5 past hike | 10 min | |
| 2.6 Home | 15 min | |
| 2.7 trail page and flyover | 25 min | Instagram has to be installed for the stories check. Skip the 20 km memory test unless you have a long recording; note it as "owed". |
| 2.8 social | 45 min | Uses the second account (below). |
| 2.9 safety | 15 min | |
| 2.10 account | 20 min | Make the throwaway account first (below). |
| 2.11 schools | 5 min | Only if Resend is set up; otherwise check the "not switched on yet" message and move on. |
| 2.12 device | 20 min | Dynamic Type, dark/light, VoiceOver. |

**Fix loop (the rest):** you keep going down the list while Claude fixes what you report. Most fixes reload over Metro in seconds, so you can recheck a step without a rebuild.

## The cafe setup

**Why the hotspot:** the dev build gets its code from Metro on the Mac, so the phone and the Mac have to reach each other directly. Most cafe Wi-Fi blocks devices from talking to each other, and some have a sign-in page that gets in the way. On your hotspot, the Mac and phone are on the same tiny network, and the phone's own traffic to the Mac doesn't use cellular data. Only the app's real internet traffic does (map tiles, Supabase, photos): expect roughly 200–500 MB for the day.

**If the hotspot gives trouble:** Claude switches Metro to tunnel mode (`expo start --tunnel`). It works on any network, including cafe Wi-Fi, but reloads take a bit longer.

**Bring:** the Mac charger, a phone cable, and headphones if you want to hear VoiceOver.

## A second person, without a second person

Several checks need someone else: a friend request, likes and comments that notify you, a "passed you", and a QR scan. Use the **web build on the Mac as the second account:**

- The phone is you (`akashreddy564`).
- The Mac's browser at 390×844 is the other person. Use the reviewer account (`review@hikeapex.com`, password sign-in) or a throwaway account.
- To check the QR: the phone can't scan its own screen, so open the other account's invite QR on the **Mac's web build** and scan it with the phone's camera.

**Throwaway account for delete-account (2.10):** sign in on the web build with a password account Claude creates in Supabase just for this (for example `throwaway+1@hikeapex.com`, forwarded through your Cloudflare routing). Delete *that* one from the phone. Never delete your own account or the reviewer's.

## When something breaks

Say it in plain words and include a screenshot or screen recording (Control Center → Screen Recording). For example: "2.4: after the third comparison it showed the same pair twice." Claude:

1. Logs it in the plan's bug table with a level (P0/P1/P2).
2. For P0s, pauses you on that step if later steps depend on it, otherwise lets you keep going.
3. Fixes it on a branch with typecheck, tests and web at 390×844, then tells you which step to recheck.

Rule of thumb: if it could get the app rejected, lose a hike, or crash, call it a P0 and Claude will sort the level out.

## What's left for Thursday morning

The production build and TestFlight smoke test (plan, Phase 4). That build bakes the code in, so it's not affected by what network you're on.
