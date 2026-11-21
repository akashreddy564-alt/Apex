# Route flyover and video share (plan 5)

Built 2026-11-21 on `feat/flyover`. The launch spec (`2026-10-16-apex-launch-design.md`, feature 2) decides what it does; the owner chose Mapbox GL JS in a WebView (option A) on 2026-10-17. This note records how it's built and the builder's calls.

## What it does

- **After Finish** on a recorded hike, when there's a connection and a Mapbox token: a full-screen flyover opens. A dark screen fades into satellite 3D terrain, the route draws itself with a glowing head, the camera follows it, circles the high point, then pulls back to the whole route. Miles, feet of gain and time count up underneath. It ends on the trail name with **Rank this hike** and **Share video**; ranking opens when Log is back in front.
- **Skip** at any time goes straight on. With no signal (or no WebGL, or a bad token) Finish goes straight to ranking, as the spec says.
- **Later:** the trail page shows **Play flyover** for your newest recorded hike there.
- **Share video:** renders a 720×1280 MP4 frame by frame (no missing tiles), with the APEX wordmark, the counting stats and the name card, then opens the share sheet (Save Video, Instagram, Messages). The video's route has its **first and last 300 m removed**, the same rule as `trim_route()` in 011; a route too short to trim has no Share button.
- **Reduce Motion:** no camera moves; the finished route holds in the overview with the final numbers.

## How it's built

- `lib/flyover/plan.ts` (pure, node-tested): evenly spaced, lightly smoothed points; one cue per video frame (how much is drawn, orbit, pull-back, counted stats); steepness stops for the glow; `trimEnds()`; `shouldFly()`.
- `lib/flyover/page.ts`: the HTML page. Mapbox GL JS 3.9.4 and mp4-muxer 5.1.3 from their CDNs, fonts from Google Fonts. `play` runs the cues in real time; `export` waits for every tile per frame and encodes H.264 with WebCodecs, then sends base64 pieces back.
- `components/flyover/FlyoverView` (WebView; an iframe on web), `lib/flyover/saveVideo` (cache file + `expo-sharing`; a download on web), `app/flyover/[logId].tsx` (the screen).
- New native modules: `react-native-webview`, `expo-sharing`. The phone pass's dev client rebuild covers them.

## Builder's calls

- Draw time 7–15 s by route length, 3 s orbit at the high point (mid-route peaks pause the line there), 2.4 s pull-back, 1.4 s hold. About 13–22 s of video.
- Style `satellite-v9` (no labels), terrain exaggeration 1.35, Bone line gradient (Bone is the only accent), brighter glow where the grade passes about 25%.
- The live view's stats are native text (app fonts, VoiceOver reads them); the video draws its own.
- Stats in the video are the whole hike's, not the trimmed line's; numbers don't reveal a location.
- The WebView page has an https base URL (`https://flyover.apex.app/`) so a URL-restricted Mapbox token can allow it.
- Photo markers on the route are left out: logs don't store where a photo was taken.

## Phone pass

- 60 fps playback on a recent iPhone; skip works mid-flight.
- Share video: export time on the phone, the share sheet saves to Photos, the clip plays in Instagram stories.
- Airplane mode: Finish goes straight to ranking.
- Memory on a long route (a 20 km hike).
