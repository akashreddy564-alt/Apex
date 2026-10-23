# Apex social and app structure design (plan 3, expanded)

Date: 2026-10-23. Status: draft for owner approval.
Parent spec: `docs/superpowers/specs/2026-10-16-apex-launch-design.md`. Where this document and the parent disagree, this one wins.
Mockups from the session: `.superpowers/brainstorm/6909-1792773792/content/` (`feed-cards.html`, `score-badge.html`, `social.html`, `log-tab-bone.html`, `accent-color.html`). They're layout references, not pixel specs.

## Intent

Apex is Strava's tracking plus Beli's ranking for young people with office jobs who hike on weekends. Plan 3 adds the social layer: accounts, friends, a feed of friends' hikes, groups and leaderboards. Along the way the owner reshaped the whole app around three sections, and moved the look away from the cinematic photo style everywhere except the opening screen.

The moment to design for: a coworker opens Apex at their desk on a Tuesday after the weekend. They see the opening screen, then a feed of what their friends hiked, how those friends rated it, and how it compares to their own rankings. They want to go and get out next weekend.

## Goals

1. A three-tab app: **Home**, **Social**, **Log**.
2. Home is a friends' activity feed in the style of Beli and Strava posts, built on the hiker's own photos and route.
3. Social lets people add friends and create or join groups whose weekly stats they can compare, inspired by Spotify's Listening Stats, Strava club boards and Duolingo's weekly leagues.
4. Log holds your own hikes and rankings in one place, and is where you start or log a hike.
5. Accounts that satisfy Apple's rules for apps with accounts and user content.

## Non-goals for this plan

- **Company and school groups.** The owner wants these, but later, and with work or school email verification (see "Later" below). v1 has no company or school field.
- Public posts, a "Nearby" feed, or anyone but friends seeing your hikes.
- Contacts syncing for finding friends.
- Push notifications if the Apple Developer account isn't ready. The in-app bell works without them.
- Streak, goal ring and weekend pick. Those are plan 4. Home leaves room for them above the feed.
- The flyover. That's plan 5. This plan only defines where it sits in the post-hike flow.

## Anti-goals

- Looking like a Beli clone. The owner called the circular score badge "too similar to Beli", so no circle badges. The same caution applies to the overall feel.
- The cinematic poster style (full-bleed stock photos, Anton names) anywhere but the opening screen.
- Leaking where someone lives. Every route shown to anyone but its owner hides its first and last 300 m (parent spec).
- Group members who aren't friends seeing hike details, routes or photos.
- Emoji as icons, purple-blue gradients, templated card stacks (parent spec).

## Constraints

- All parent-spec constraints still apply: Expo SDK 57 docs first (`AGENTS.md`), no public OSM tiles or Overpass, ranking rules (Loved, Fine, Didn't like with binary insert; score shown once a bucket has 3+ hikes), Apple's account deletion and UGC rules.
- Supabase stopped auto-granting on new tables (Oct 30, 2026). Every new table needs explicit grants and RLS in its own migration, like `007` and `008`.
- Hike photos live in the private `hike-photos` bucket, readable only by their owner (`002`). Friends need read access to them.
- Recording and ranking must keep working signed out and offline, as today.
- Repo conventions: PRs based on main, merge commits, nits batched into cleanup PRs.

## Decided by the owner

### App structure

- Every cold launch shows the opening screen (unchanged), then **Home**.
- Three tabs: **Home**, **Social**, **Log**. Today's Trails, Log and Rankings tabs go away. Trail pages are still reachable from feed posts, your Log, search and post-Finish suggestions.

### Look

- **Dark by default**, with an **Appearance** setting for light.
- **Signature color: Bone, `#EDE6D6`.** It replaces sage and the orange in UI accents: the Start button, route lines, your own row and bar on leaderboards, comparison tags, active controls. Photos and score colors bring the color. The opening screen's orange (`heroAccent`) also becomes Bone so the app has one signature color.
- Score colors by bucket: green for Loved, amber for Fine, red for Didn't like ("Nope" as the short label). Builder picks exact values that read on both dark and light.
- The cinematic poster look is for the opening screen only.

### Score display

- **Default: just the number.** A big bold score in the bucket color, with the bucket name under it. No container.
- In personal settings, each person can switch to **Peak** (the score inside a small mountain shape) or **Trail blaze** (the score on a painted rectangle, set slightly off-angle like a trail marker). This only changes how scores look on their own phone.

### Home: the feed

One post per friend's hike, newest first:

1. "**Maya Chen** ranked **Half Dome**", place and day under it, the score on the right.
2. Distance, elevation gain and time in a row.
3. A swipeable strip: the route map first, then the hiker's photos. No photos means just the map.
4. Their notes.
5. A comparison tag when it applies: "Ranked above your Mount Si".
6. Like, comment, save trail.

The feed is friends only, with no filter chips (Groups and Nearby were dropped). Tapping a post opens the full hike: a bigger map, every photo, all notes.

### Social

- **Friends row** at the top, with Add friends. Pending friend requests show as a small bar above it.
- **Adding friends:** search by username, your own invite link, and a QR code for in person. Friendships are mutual (request, then accept).
- **Your groups:** each shows your place this week and whether you moved up or down. Then Create group and Join with code.
- **Creating a group:** a name and an optional color or icon. You get an invite link and a 6-character code. Anyone with either can join. The creator can remove members. Groups cap at about 50.
- **Group page:**
  - A big "together this week" number for total elevation, with a playful comparison ("Higher than Everest") and the total hikes and miles.
  - Four stat cards: top climber, group favorite (the trail with the highest average score among members), taste match (the member whose rankings are closest to yours), longest day.
  - The elevation leaderboard.
  - Switches for week, month and year.
- **Profile** (opened from your avatar on Log and Social): name, username, friend count, and a shareable "Your week in hiking" card with elevation, hikes, miles, top new hike and streak (once plan 4 exists).
- Group members who aren't your friends see your name, totals and leaderboard position only. Never your hikes, routes, photos, scores or rankings.
- Group favorite and taste match are computed from everyone's rankings, but show only a trail name or a percentage. No one's individual list or scores are revealed.
- "Top new hike" on the shareable week card shows only when you share it. It isn't shown to group members.
- Report and block in the menu on any profile or post.

### Log

- **Start a hike** (Bone, primary) and **Log past hike** at the top.
- A switch between **Hikes** and **Rankings**.
- **Hikes:** your hikes newest first, in the Home post style plus the tags from logging (terrain, conditions, difficulty). Tapping one opens it to edit notes and photos or re-rank.
- **Rankings:** your trails in order, grouped under Loved, Fine and Nope. Each row has a thumbnail (your newest photo, else the route line), the place, the distance and the score.

### After Finish

Flyover (plan 5, skippable, skipped with no signal) → which trail was this (catalog match or name your own, from plan 2) → ranking → the post appears in your Hikes and your friends' feeds.

### Accounts and notifications

- **No Apple Developer account until as late as possible (owner).** v1 signs in with email magic link only. Apple requires Sign in with Apple only when an app offers other third-party logins, so email-only is allowed. Sign in with Apple is added later, alongside the Apple Developer account. Home and Social ask you to sign in. Log, recording and ranking work signed out, and local data uploads on first sign-in.
- Usernames: chosen at sign-up, unique, changeable later.
- You can leave any group, unfriend anyone, and delete your account in the app.
- Notifications: friend requests, someone joining your group, likes and comments on your hike, and "Maya passed you this week". v1 shows them in an in-app bell on Home. Push notifications come with the Apple Developer account.
- Invite links and QR codes use the app's own `apex://` link scheme in v1, since universal links need the Apple Developer account. Without the app, the link can't open, so the code shown beside it is the fallback. The hosted invite page and universal links come once there's a domain and Apple Developer.
- Email sending: Supabase's built-in email only suits testing, so magic links need a real sender (for example Resend or Postmark) and a domain with DNS records the owner sets up. This is a launch need regardless of company verification.

## Later (in the plan, not in v1)

**Company and school groups with verification.** A company or school section on the profile. You verify a work or school email with a 6-digit code, and only the domain is stored. Verified members join their company's or school's group automatically and appear on its leaderboard with a ✓. This needs:
- blocking personal email domains;
- mapping domains to organizations (`.edu` is easy; companies with several domains need manual entries);
- an occasional re-verify, or a self-serve leave.

Owner's reason for verification: one fake member at the top ruins a company leaderboard.

## Builder's calls (owner can push back)

- **Build order:**
  1. The new tab structure and tokens: Bone, the score styles, dark/light.
  2. Accounts and profiles: email magic link, usernames, first-sign-in upload.
  3. Friends: requests, search, invite link, QR.
  4. The feed, likes and comments, and the full hike view, with friend access to routes and photos.
  5. Groups and leaderboards.
  6. Notifications, report and block.
  Each step lands as its own PR.
- Leaderboards count recorded hikes only (parent spec). A group's week runs Monday to Sunday in the group's time zone, set from the creator's at creation. Every member sees the same standings, and "passed you" notifications match them. Your personal stats use your own local week.
- **What makes a post:** a hike posts to friends' feeds when it's ranked, whether after Finish or after logging a past hike. A repeat hike of a trail you've ranked before posts too. The post keeps the score from when it was posted, while your Rankings show your current scores. Hikes uploaded on first sign-in, and past hikes dated more than 7 days back, don't post, so new users don't flood their friends' feeds. Unranked hikes don't post.
- **Self-named trails and friends:** friends can open a self-named trail's page and save it. They see its line trimmed by 300 m at each end and never its trailhead point. Comparison tags work on them like catalog trails.
- **Elevation gain for leaderboards:** recorded hikes store the gain the phone measured, in a new column. When a hike matches a catalog trail, gain above 1.5× the trail's gain is capped at that amount. Server-side recomputation waits until terrain elevation is set up.
- **Invite links:** v1 uses `apex://` links plus the visible code (see Accounts). Later, the link opens a small web page with the inviter, the code and an App Store button, and universal links open the app directly.
- **Testing with several people before Apple Developer:** without it, the app installs only on the owner's own devices (Personal Team builds expire after 7 days). Multi-user testing uses the iOS simulator, Expo web and seeded test accounts. Real friends testing on their own phones needs TestFlight, which needs Apple Developer.
- **Email before friends can sign in:** Supabase's built-in email sends only to the project's team members, a few per hour. Before anyone else can sign in, the owner needs a domain and a sender (Resend or Postmark, set as Supabase's custom SMTP). It isn't needed for building and testing.
- The feed is chronological, with no ranking algorithm.
- "Save trail" adds to a want-to-hike list that plan 4's weekend pick can use.
- Taste match compares how two people ordered the trails they've both ranked, and shows only with at least 3 shared trails.
- Comparison tags compare against your rankings only. They show only when you've ranked a trail in the same or a neighboring bucket, so they stay meaningful.
- Friends read each other's routes through a view or function that returns the trimmed route (300 m removed at each end). The raw `recorded_path` stays owner-only.
- Friends read each other's photos through signed URLs issued by a function that checks the friendship. The bucket stays private.

## Left to the builder

- Data model and RLS for profiles, friendships, groups, memberships, likes, comments, reports, blocks and notifications.
- How leaderboard and group stats are computed (views, functions or cached tables).
- Exact spacing, type sizes and the light-theme palette, held to the mockups and the parent spec's quality bar.
- Which third-party pieces to use (QR, image carousel, Sign in with Apple), within the quality bar.
- What the Trails list and trail page become after the cinematic covers (#25) are replaced. Keep them consistent with the post style.
- Moderation tooling for acting on reports. A Supabase dashboard query or a small admin view is acceptable for v1.
