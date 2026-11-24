# App Store listing (draft, 2026-11-24)

Everything App Store Connect asks for, ready to paste. Character limits are Apple's; each field below fits. Change anything you like, but keep the review notes accurate.

## App information

| Field | Value |
|-------|-------|
| Name (30) | Apex: Hike Tracker & Rankings |
| Subtitle (30) | Rank every trail you climb |
| Bundle ID | com.apex.trails |
| SKU | apex-ios-1 |
| Primary category | Health & Fitness |
| Secondary category | Navigation |
| Content rights | Does not contain third-party content you need rights for (trail data is OpenStreetMap, credited in the app) |
| Privacy Policy URL | https://apex-landing-kappa.vercel.app/privacy (change to the real domain) |
| Support URL | https://apex-landing-kappa.vercel.app/support |
| Marketing URL | https://apex-landing-kappa.vercel.app |
| Copyright | 2026 Akash Reddy |

## Version 1.0

**Promotional text (170)**

Record a hike with the screen off, rank it against every trail you've done, then fly back over it in 3D. Climb with friends on weekly boards.

**Description (4000)**

Apex is a hiking log that remembers how every trail felt.

RECORD
Press start and put the phone away. Apex tracks your route, distance and every foot of climb with the screen off and no signal, and knows which trail you're on.

RANK
No star ratings. After each hike Apex asks a few quick this-or-that questions and slots it into your own list, so your #1 actually means something. Every trail gets a 0–10 score from where it lands.

FLY BACK
Finish a hike and watch your route draw itself up the mountain in 3D, circle the summit and pull back to show the whole day. Share it as a video.

CLIMB WITH FRIENDS
See your friends' ranked hikes, routes and photos. Start a group with your crew and see who climbs the most each week, or verify your school or work email to join its board.

KEEP GOING
A weekly streak, a goal ring, a weekend pick from trails you love, and a card of your week you can share.

Your location is used only while you're recording. Friends never see where a route starts or ends: the first and last 300 m are cut off.

**Keywords (100)**

hiking,trail,hike tracker,gps,elevation,trails,mountain,backpacking,leaderboard,strava,alltrails

Note: Apple may reject competitor names in keywords. If so, swap `strava,alltrails` for `outdoors,summit`.

**What's New**: leave empty for 1.0.

## Screenshots

iPhone only (`supportsTablet` is off), so only the 6.9" set is required: **1320 × 2868** portrait, 3 to 10 images. Suggested order:
1. Recording a hike (Log, mid-recording)
2. Ranking sheet ("Better than Lake Serene?")
3. Flyover
4. Home feed with a friend's post
5. Group or friends leaderboard
6. Trail page with elevation profile
7. Week card on Social

## App Privacy (nutrition labels)

Tracking: **No**, Apex doesn't track people across other companies' apps or websites.

Data linked to the user, all for **App Functionality** only (not advertising, analytics or tracking):

| Category | Type | Why |
|----------|------|-----|
| Contact Info | Email Address | Sign-in; school or work domain check (only the domain is kept) |
| Contact Info | Name | Display name shown to friends |
| Location | Precise Location | Recording a hike's route (only while recording) |
| User Content | Photos or Videos | Photos added to hikes |
| User Content | Other User Content | Notes, comments, rankings |
| Identifiers | User ID | Account id |

Not collected: health, financial info, contacts, browsing or search history, diagnostics, purchases, sensitive info.

## Age rating

Answer the questionnaire as follows:
- No violence, sexual content, profanity, drugs, gambling or horror themes.
- Unrestricted web access: No.
- **User-generated content: Yes.** Users can share hikes, photos and comments with friends, with reporting and blocking.
- **Messaging and chat: Yes**, through comments between friends.

The resulting rating is set by Apple; expect 12+ or 13+.

## App Review information

| Field | Value |
|-------|-------|
| Sign-in required | Yes |
| User name | the reviewer email from `supabase/seed/app_review.sql` |
| Password | the reviewer password you set in Supabase Auth |
| Contact | your name, phone and email |

**Notes for review**

Open the Log tab and tap the profile button at the top (or tap "Sign in with email" on Home), then "Have a password? Sign in with it", using the demo account above. Email sign-in uses a magic link, which reviewers can't receive.

The demo account already has friends (Maya and Jordan), a pending friend request (Sam) and a group (Test crew), so Home shows friends' hikes and Social shows friends, a group and its leaderboard.

Background location: Apex uses location only while a hike is being recorded (Log → slide to start), including with the screen locked, so the route and climb are complete. It stops when the hike is finished. There is no location use at any other time.

User content: people agree to the Terms (no objectionable content) before posting. Every post, comment and profile can be reported or blocked from the ••• menu, and reports are reviewed within 24 hours.

Recording, ranking and the flyover work without an account.

## Export compliance

`ITSAppUsesNonExemptEncryption` is `false` in `app.json` (Apex uses only standard HTTPS), so uploads skip the question.
