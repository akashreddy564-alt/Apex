# Releasing Apex

Store builds go through [EAS Build](https://docs.expo.dev/build/introduction/) and [EAS Submit](https://docs.expo.dev/submit/introduction/). This repo has the profiles; the Expo, Apple, and Google accounts stay with the owner.

`com.apex.trails` is a placeholder bundle id and Android package. Confirm or change it before the first store upload. Changing it later creates a new store listing.

## One-time setup

Install the CLI and sign in with the Expo account that should own the project:

```sh
npm install --global eas-cli
eas login
```

Link the app. `eas init` writes `extra.eas.projectId` into `app.json`. Commit that id after it exists. Do not invent one.

```sh
eas init
```

### Apple (TestFlight)

A paid Apple Developer account is required. The first iOS build prompts for that Apple ID and creates the distribution certificate and provisioning profile on EAS. Leave `appleId`, `ascAppId`, and `appleTeamId` out of `eas.json` until App Store Connect has the app; then you can add `submit.production.ios.ascAppId` so later submits skip the prompt.

For ad hoc preview builds, register each device with `eas device:create` before building.

### Google Play (internal testing)

Create the app in Play Console with package `com.apex.trails` (or the final package, if you change it). Create a Google service account, grant it release access, and upload the JSON key to EAS:

```sh
eas credentials --platform android
```

Do not commit the key file. `submit.production.android.track` is already `internal`, so `eas submit` uploads to Play internal testing.

### Supabase env vars

Cloud builds do not see a local `.env`. Set the public client values on EAS for each environment you build (`development`, `preview`, `production`). The anon key ships inside the app, so `sensitive` is enough; `secret` is not readable at bundle time.

```sh
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR_PROJECT.supabase.co --environment production --visibility sensitive
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key --environment production --visibility sensitive
```

Run the same commands with `--environment preview` and `--environment development`. The dashboard can attach one variable to all three environments at once. Each build profile sets `environment` to the matching name, so EAS injects those values during the build. Omit them and the binary keeps using local mock trails.

## Versioning

User-facing `expo.version` in `app.json` is `1.0.0`. Bump that yourself when you ship a new store version.

Developer-facing `ios.buildNumber` and `android.versionCode` are not in `app.json`. `cli.appVersionSource` is `remote`, and `production` sets `autoIncrement`. EAS stores those numbers and bumps them on each production build, starting at `1`. That avoids rewriting `app.json` on every build. `eas build:version:set` can seed a higher number if a build was already uploaded.

## Cut a build

```sh
npm run build:dev       # dev client, internal install
npm run build:preview   # release binary, internal install (Android APK)
npm run build:prod      # store binary (iOS IPA, Android AAB)
```

Add `--platform ios` or `--platform android` to build one side. Production is what TestFlight and Play accept. Preview is a direct install link, not a store upload.

TestFlight: after `npm run build:prod` finishes for iOS, run `npm run submit:ios`. Apple processes the build, then it shows up in TestFlight.

Play internal: after the Android production build, run `npm run submit:android`. The app stays in draft in Play Console until the listing tasks are done.

To build and hand the artifact to submit in one step:

```sh
eas build --platform ios --profile production --auto-submit
eas build --platform android --profile production --auto-submit
```
